"""LAMP TIK yt-dlp bridge — optional Python extraction + stream service.

Why it exists: Vercel's serverless runtime has no Python and no yt-dlp binary.
This tiny service runs anywhere a container can (Hugging Face Docker Space,
Render, Fly, a VPS, or a laptop behind a tunnel) and answers the calls the
Next.js resolver makes:

    POST /            {"url": "https://…", "client": "android"}
    POST /resolve     {"url": "https://…", "platform": "youtube"}
        → {"url": "<signed bridge stream URL>", "title": …, "duration": …,
           "uploader": …, "thumbnail": …, "id": …}

    GET /stream?url=<youtube>&kind=video|audio&exp=<unix>&sig=<hmac>
        → the media bytes, proxied from the bridge's own network. `kind=audio`
          resolves the audio ladder lazily (web client) on first request.

The stream URL matters: a raw `googlevideo.com` URL is signed for the IP that
resolved it. If the Next.js download proxy (on Vercel) fetched that URL, music
videos would answer 403 because the IPs differ. The bridge therefore keeps the
direct URL private and proxies the bytes itself, so `/api/download` only ever
talks to this service.

Security:
  * Only public https links on the supported platforms are accepted.
  * Stream URLs carry an HMAC signature + expiry; the raw `BRIDGE_SECRET` is
    never put in a URL.
  * No shell is involved anywhere; every yt-dlp argument is a list element.
"""

from __future__ import annotations

import atexit
import base64
import hashlib
import hmac
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from collections.abc import Iterator
from urllib.parse import quote, urlparse

import requests
from flask import Flask, Response, jsonify, request, send_file, stream_with_context

app = Flask(__name__)

BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "").strip()
# Audio resolves lazily on the first byte request and uses the web client,
# which is slower than the Android video path (~6-8s cold). A 9s ceiling lost
# that race often enough to answer the first MP3 click with a 502.
RESOLVE_TIMEOUT_S = int(os.environ.get("RESOLVE_TIMEOUT_S", "15"))
STREAM_TTL_S = int(os.environ.get("STREAM_TTL_S", "7200"))
MEDIA_CACHE_TTL_S = int(os.environ.get("MEDIA_CACHE_TTL_S", "120"))
MAX_URL_LENGTH = 2048

# YouTube throttles a single long connection to a small fraction of the line
# speed, but answers a short ranged request at full speed. The bridge therefore
# pulls media in 1 MiB byte ranges instead of one streaming GET — measured on a
# blocked music video: 10 KB/s sequential vs ~110 KB/s ranged for the audio
# track, with yt-dlp's own downloader (which also fragments) at ~600 KB/s.
STREAM_CHUNK_BYTES = 1 << 20

# --- Optional cloud hardening ---------------------------------------------
# A datacenter IP (Hugging Face, Render, Fly) hits YouTube's bot wall on label
# music exactly as Vercel does. Two optional inputs lift that; both are read
# once at boot and never logged or echoed back in a response.
#   YTDLP_COOKIES_BASE64 — a Netscape cookies.txt, base64-encoded
#   YTDLP_PROXY          — proxy URL yt-dlp routes through (http(s)/socks5)
YTDLP_COOKIES_BASE64 = os.environ.get("YTDLP_COOKIES_BASE64", "").strip()
YTDLP_PROXY = os.environ.get("YTDLP_PROXY", "").strip()

# A secret-less bridge still needs signed stream URLs. This random key only
# lives for the process lifetime; production deployments should set
# BRIDGE_SECRET so stream links survive a restart.
STREAM_KEY = BRIDGE_SECRET.encode("utf-8") if BRIDGE_SECRET else os.urandom(32)
STREAM_KEY_IS_EPHEMERAL = not bool(BRIDGE_SECRET)

ALLOWED_HOSTS = (
    "youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "music.youtube.com",
    "tiktok.com",
    "instagram.com",
    "facebook.com",
    "fb.watch",
    "fb.com",
)

YOUTUBE_HOSTS = ("youtube.com", "youtu.be", "youtube-nocookie.com", "music.youtube.com")

# One progressive rendition: the Next proxy can stream a single file without
# a server-side muxer. Android/itag 18 is 360p with audio; where a 720p muxed
# rendition exists, `best[ext=mp4]` picks it.
#
# Audio is a separate story. The Android player client (the only one that
# still hands back a muxed file) exposes NO audio-only format, while the web
# client exposes the audio ladder and no muxed file at all. So the two cannot
# share one yt-dlp run. Video resolves on demand; audio is resolved lazily the
# first time a visitor asks for the MP3, then cached — otherwise every resolve
# would pay ~5 s for a track most visitors never request.
FORMATS = {
    "video": "best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/best",
    "audio": "bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio",
}

# Cache and in-flight keys are (page URL, kind) — a video hit must never be
# mistaken for the audio track of the same page.
_media_cache: dict[tuple[str, str], tuple[str, dict, float]] = {}
_media_lock = threading.Lock()

# One extraction per URL at a time. The app retries a slow resolve (server
# timeout, then the visitor's browser rescue), and YouTube counts every extra
# yt-dlp call against the bridge's IP — so a second caller waits for the first
# run and reads its cache entry instead of spawning a duplicate.
_inflight: dict[str, threading.Event] = {}
_inflight_lock = threading.Lock()


def _ytdlp_binary() -> str:
    """PATH first, then the venv's Scripts/bin next to this interpreter."""
    found = shutil.which("yt-dlp")
    if found:
        return found
    candidate = os.path.join(
        os.path.dirname(sys.executable), "yt-dlp.exe" if os.name == "nt" else "yt-dlp"
    )
    return candidate if os.path.exists(candidate) else "yt-dlp"


YTDLP = _ytdlp_binary()


def _cors(response: Response) -> Response:
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, x-bridge-secret"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, HEAD, OPTIONS"
    return response


def _json(payload: dict, status: int = 200) -> Response:
    response = jsonify(payload)
    response.status_code = status
    response.headers["Cache-Control"] = "no-store"
    return _cors(response)


def _host_matches(host: str, base: str) -> bool:
    return host == base or host.endswith("." + base)


def _allowed_url(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    url = value.strip()
    if not url or len(url) > MAX_URL_LENGTH:
        return None
    try:
        parsed = urlparse(url)
    except ValueError:
        return None
    if parsed.scheme != "https" or not parsed.hostname:
        return None
    host = parsed.hostname.lower()
    return url if any(_host_matches(host, base) for base in ALLOWED_HOSTS) else None


def _secret_ok() -> bool:
    if not BRIDGE_SECRET:
        return True
    supplied = request.headers.get("x-bridge-secret", "")
    return hmac.compare_digest(supplied, BRIDGE_SECRET)


def _is_youtube(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return any(_host_matches(host, base) for base in YOUTUBE_HOSTS)


def _prepare_cookies() -> str | None:
    """Decode YTDLP_COOKIES_BASE64 into a private Netscape cookies file.

    Written 0600 in the system temp dir and removed at exit. Anything that is
    not tab-separated Netscape format is ignored (yt-dlp would reject it, and a
    silent bad file is worse than no file).
    """
    if not YTDLP_COOKIES_BASE64:
        return None
    try:
        decoded = base64.b64decode(YTDLP_COOKIES_BASE64, validate=False).decode("utf-8", "ignore")
    except Exception:  # noqa: BLE001 — a bad blob must not stop the service
        return None
    if "\t" not in decoded or "youtube" not in decoded.lower():
        return None
    handle = tempfile.NamedTemporaryFile(
        mode="w", prefix="lamptik-cookies-", suffix=".txt", delete=False, encoding="utf-8"
    )
    try:
        handle.write(decoded)
        handle.close()
        os.chmod(handle.name, 0o600)
    except OSError:
        return None
    path = handle.name
    atexit.register(lambda: os.path.exists(path) and os.remove(path))
    return path


# --- Optional real MP3 encode ---------------------------------------------
# yt-dlp transcribes its audio pick to MP3 through ffmpeg, which the container
# image installs but a laptop or a slim host often does not. The binary is
# resolved once at boot (FFMPEG_LOCATION → PATH → the imageio-ffmpeg wheel,
# which ships a static build), and the MP3 option is only advertised when one
# exists: a button that 502s is worse than no button.
def _ffmpeg_binary() -> str | None:
    configured = os.environ.get("FFMPEG_LOCATION", "").strip()
    if configured:
        candidate = configured
        if os.path.isdir(candidate):
            candidate = os.path.join(candidate, "ffmpeg.exe" if os.name == "nt" else "ffmpeg")
        if os.path.exists(candidate):
            return candidate
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg  # optional dependency: static ffmpeg, no PATH needed

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001 — no wheel, no ffmpeg, no MP3
        return None


FFMPEG = _ffmpeg_binary()
MP3_READY = bool(FFMPEG)
MP3_TIMEOUT_S = int(os.environ.get("MP3_TIMEOUT_S", "120"))
MP3_CACHE_TTL_S = int(os.environ.get("MP3_CACHE_TTL_S", "3600"))
MP3_CACHE_MAX_FILES = int(os.environ.get("MP3_CACHE_MAX_FILES", "24"))
MP3_CACHE_DIR = tempfile.mkdtemp(prefix="lamptik-mp3-")

COOKIES_PATH = _prepare_cookies()
# A JS runtime lets yt-dlp solve YouTube's `n` signature. Without one it warns
# that formats may be missing and the surviving URLs are throttled hard.
JS_RUNTIME = "deno" if shutil.which("deno") else ("node" if shutil.which("node") else "")

# The challenge-solver script is what actually solves `nsig`; deno alone is not
# enough. Enabled by default when a runtime exists, disabled with
# YTDLP_REMOTE_COMPONENTS=off, overridable with any yt-dlp component spec.
_remote_env = os.environ.get("YTDLP_REMOTE_COMPONENTS")
if _remote_env is None:
    REMOTE_COMPONENTS = "ejs:github" if JS_RUNTIME else ""
elif _remote_env.strip().lower() in ("", "off", "none", "0"):
    REMOTE_COMPONENTS = ""
else:
    REMOTE_COMPONENTS = _remote_env.strip()


def _base_args(url: str, kind: str = "video") -> list[str]:
    args = [YTDLP, "--no-playlist", "--no-warnings", "--no-cache-dir"]
    # Only the video path forces the Android client. It is the one that
    # survives YouTube's bot wall and returns a muxed MP4, but it advertises
    # no audio-only stream, so the audio path uses yt-dlp's default client.
    if kind == "video" and _is_youtube(url):
        args += ["--extractor-args", "youtube:player_client=android"]
    if COOKIES_PATH:
        args += ["--cookies", COOKIES_PATH]
    if YTDLP_PROXY:
        args += ["--proxy", YTDLP_PROXY]
    if JS_RUNTIME:
        args += ["--js-runtimes", JS_RUNTIME]
    if REMOTE_COMPONENTS:
        args += ["--remote-components", REMOTE_COMPONENTS]
    return args


def _request_url() -> str | None:
    raw = request.args.get("url")
    if not raw:
        body = request.get_json(silent=True)
        if isinstance(body, dict):
            raw = body.get("url")
    return _allowed_url(raw)


def _first_json(text: str) -> dict | None:
    start = text.find("{")
    if start < 0:
        return None
    try:
        return json.loads(text[start:])
    except ValueError:
        return None


def _ytdlp_version() -> str:
    try:
        completed = subprocess.run(
            [YTDLP, "--version"], capture_output=True, text=True, timeout=5
        )
        return (completed.stdout or "").strip() or "unknown"
    except Exception:  # noqa: BLE001 — health must answer even when yt-dlp is broken
        return "unavailable"


def _resolve_media(url: str, kind: str = "video") -> tuple[str | None, dict | None, str | None]:
    """Run yt-dlp once and return (direct media URL, info, error)."""
    try:
        completed = subprocess.run(
            _base_args(url, kind) + ["-f", FORMATS[kind], "-j", url],
            capture_output=True,
            text=True,
            timeout=RESOLVE_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        return None, None, "conversion timed out"
    except OSError:
        return None, None, "yt-dlp is not installed in this container"

    if completed.returncode != 0:
        detail = (completed.stderr or "").strip().splitlines()
        return None, None, detail[-1][:300] if detail else "yt-dlp failed"

    data = _first_json(completed.stdout or "")
    if not data:
        return None, None, "yt-dlp returned no JSON payload"
    media = data.get("url")
    if not isinstance(media, str) or not media.startswith("https://"):
        return None, None, "yt-dlp exposed no direct https stream"
    return media, data, None


def _cached(key: tuple[str, str]) -> tuple[str, dict] | None:
    with _media_lock:
        cached = _media_cache.get(key)
        if cached and cached[2] > time.time():
            return cached[0], cached[1]
    return None


def _media_for(url: str, kind: str = "video") -> tuple[str | None, dict | None, str | None]:
    key = (url, kind)
    hit = _cached(key)
    if hit:
        return hit[0], hit[1], None

    with _inflight_lock:
        event = _inflight.get(key)
        owner = event is None
        if owner:
            event = threading.Event()
            _inflight[key] = event

    if not owner:
        # Someone is already extracting this exact stream. Wait for their run
        # (the subprocess itself is bounded by RESOLVE_TIMEOUT_S) and reuse it.
        event.wait(timeout=RESOLVE_TIMEOUT_S + 3)
        hit = _cached(key)
        if hit:
            return hit[0], hit[1], None
        return None, None, "extraction is still running for this video"

    try:
        media, data, error = _resolve_media(url, kind)
        if error or not media or not data:
            return None, None, error or "no stream"
        with _media_lock:
            _media_cache[key] = (media, data, time.time() + MEDIA_CACHE_TTL_S)
            while len(_media_cache) > 200:
                oldest = next(iter(_media_cache))
                _media_cache.pop(oldest, None)
        return media, data, None
    finally:
        with _inflight_lock:
            _inflight.pop(key, None)
        event.set()


def _stream_key() -> bytes:
    return STREAM_KEY


def _sign(url: str, kind: str, expires: int) -> str:
    # The kind is signed too: an audio signature cannot be replayed to pull the
    # video file, or the other way round.
    message = f"{url}\n{kind}\n{expires}".encode("utf-8")
    return hmac.new(_stream_key(), message, hashlib.sha256).hexdigest()


def _valid_signature(url: str, kind: str, expires: int, signature: str) -> bool:
    if expires < int(time.time()):
        return False
    return hmac.compare_digest(_sign(url, kind, expires), signature)


def _public_base() -> str:
    configured = os.environ.get("PUBLIC_BASE_URL", "").strip().rstrip("/")
    if configured:
        return configured
    proto = request.headers.get("x-forwarded-proto", request.scheme).split(",")[0].strip()
    host = request.headers.get("x-forwarded-host", request.host).split(",")[0].strip()
    return f"{proto}://{host}"


def _stream_url(url: str, kind: str = "video") -> str:
    expires = int(time.time()) + STREAM_TTL_S
    signature = _sign(url, kind, expires)
    return (
        f"{_public_base()}/stream?url={quote(url, safe='')}&kind={kind}"
        f"&exp={expires}&sig={signature}"
    )


@app.route("/", methods=["GET", "POST", "OPTIONS"])
def index() -> Response:
    if request.method == "OPTIONS":
        return _cors(Response(status=204))
    if request.method == "POST":
        return resolve()
    return _json(
        {
            "service": "lamptik-ytdlp-bridge",
            "endpoints": ["/health", "POST /", "POST /resolve", "GET /stream"],
            "secured": bool(BRIDGE_SECRET),
            "ytdlp": _ytdlp_version(),
        }
    )


@app.get("/health")
def health() -> Response:
    # Booleans only: the cookie blob and the proxy URL never leave the process.
    return _json(
        {
            "status": "ok",
            "ytdlp": _ytdlp_version(),
            "secured": bool(BRIDGE_SECRET),
            "stream_signature": "persistent" if not STREAM_KEY_IS_EPHEMERAL else "ephemeral",
            "cookies": bool(COOKIES_PATH),
            "proxy": bool(YTDLP_PROXY),
            "js_runtime": JS_RUNTIME or None,
            # `mp3` is the capability the resolver checks before it renders a
            # real MP3 button; `ffmpeg` says which binary answered.
            "ffmpeg": bool(FFMPEG),
            "mp3": MP3_READY,
        }
    )


@app.route("/resolve", methods=["GET", "POST", "OPTIONS"])
def resolve() -> Response:
    if request.method == "OPTIONS":
        return _cors(Response(status=204))
    if not _secret_ok():
        return _json({"error": "unauthorized"}, 401)

    url = _request_url()
    if not url:
        return _json({"error": "a supported public https video URL is required"}, 400)

    media, data, error = _media_for(url)
    if error or not media or not data:
        return _json({"error": error or "yt-dlp failed"}, 502)

    return _json(
        {
            "url": _stream_url(url),
            # A lazy audio handle: the MP3 button appears immediately, and the
            # first byte request runs the web-client extraction once. Only
            # YouTube is advertised — that is the ladder we verified — so other
            # platforms never get a button that could 502.
            "audio": _stream_url(url, "audio") if _is_youtube(url) else None,
            # A separate signed handle for a true MP3: resolved only when a
            # visitor asks for it, and only advertised when ffmpeg exists.
            "mp3": _stream_url(url, "mp3") if _is_youtube(url) and MP3_READY else None,
            "id": data.get("id"),
            "title": data.get("title"),
            "duration": data.get("duration") or 0,
            "uploader": data.get("uploader") or data.get("channel") or data.get("uploader_id"),
            "thumbnail": data.get("thumbnail"),
            "ext": data.get("ext"),
            "engine": "bridge",
        }
    )


def _download_name(kind: str) -> str:
    """The `name` query argument, sanitised, so a direct link still saves as a
    real media file. Display-only: it is not part of the signature, and every
    character outside `[A-Za-z0-9._-]` is dropped."""
    raw = (request.args.get("name") or "").strip()
    safe = re.sub(r"[^A-Za-z0-9._-]", "", raw)[:120].lstrip(".")
    if not safe or "." not in safe:
        extension = {"video": "mp4", "audio": "m4a", "mp3": "mp3"}.get(kind, "mp4")
        return f"lamptik-{kind}.{extension}"
    return safe


def _media_headers(upstream: requests.Response, kind: str) -> dict[str, str]:
    headers = {
        "Content-Type": upstream.headers.get(
            "Content-Type", "audio/mp4" if kind == "audio" else "video/mp4"
        ),
        "Accept-Ranges": upstream.headers.get("Accept-Ranges", "bytes"),
        "Content-Disposition": f'attachment; filename="{_download_name(kind)}"',
        "Cache-Control": "no-store",
    }
    for name in ("Content-Length", "Content-Range"):
        value = upstream.headers.get(name)
        if value:
            headers[name] = value
    return headers


def _content_range_total(value: str | None) -> int | None:
    """`bytes 0-1048575/3449447` → 3449447, so Content-Length stays honest."""
    if not value or "/" not in value:
        return None
    tail = value.rsplit("/", 1)[1].strip()
    return int(tail) if tail.isdigit() and int(tail) > 0 else None


def _relay(upstream: requests.Response) -> Iterator[bytes]:
    try:
        for chunk in upstream.iter_content(chunk_size=256 * 1024):
            if chunk:
                yield chunk
    finally:
        upstream.close()


def _range_reader(first: requests.Response, total: int, next_range) -> Iterator[bytes]:
    """Replay the probe response, then keep pulling 1 MiB ranges to the end.

    `next_range(start, end)` owns the retry story: YouTube can start refusing
    the tail of one URL's quota mid-file, so a worker that just gave up would
    hand the browser a truncated download (Chrome reports it as "failed — file
    incomplete"). The caller re-resolves the media and resumes from the same
    offset instead.
    """
    offset = 0
    response: requests.Response | None = first
    try:
        while offset < total:
            if response is None:
                end = min(offset + STREAM_CHUNK_BYTES - 1, total - 1)
                response = next_range(offset, end)
                if response is None:
                    return
            received = 0
            for chunk in response.iter_content(chunk_size=256 * 1024):
                if chunk:
                    received += len(chunk)
                    yield chunk
            response.close()
            response = None
            if received == 0:
                return
            offset += received
    finally:
        if response is not None:
            response.close()


# --- MP3 encode cache ------------------------------------------------------
# A transcode is a full yt-dlp download plus an ffmpeg pass (~5-15 s), far too
# slow to repeat per byte range. The finished file is kept on disk and served
# with Range support, so a browser download manager can still resume it.
_mp3_files: dict[str, tuple[str, float]] = {}
_mp3_lock = threading.Lock()
_mp3_inflight: dict[str, threading.Event] = {}


def _prune_mp3_cache() -> None:
    """Drop expired files, then the oldest entries past the cap.

    Called with `_mp3_lock` held. The newest entry is last in insertion order,
    so the cap never deletes the file that was just produced.
    """
    now = time.time()
    for key, (path, expires) in list(_mp3_files.items()):
        if expires > now:
            continue
        _mp3_files.pop(key, None)
        try:
            os.remove(path)
        except OSError:
            pass
    while len(_mp3_files) > MP3_CACHE_MAX_FILES:
        key, (path, _expires) = next(iter(_mp3_files.items()))
        _mp3_files.pop(key, None)
        try:
            os.remove(path)
        except OSError:
            pass


def _encode_mp3(url: str) -> tuple[str | None, str | None]:
    """Download the audio pick and transcode it to MP3 in a private directory.

    Each job gets its own folder, so two visitors asking for different videos
    at the same time can never pick up each other's file.
    """
    if not FFMPEG:
        return None, "ffmpeg is not installed on this bridge"
    workdir = tempfile.mkdtemp(dir=MP3_CACHE_DIR, prefix="job-")
    args = _base_args(url, "audio") + [
        "-f",
        FORMATS["audio"],
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "--ffmpeg-location",
        FFMPEG,
        "-o",
        os.path.join(workdir, "%(id)s.%(ext)s"),
        url,
    ]
    try:
        completed = subprocess.run(args, capture_output=True, text=True, timeout=MP3_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        return None, "the MP3 conversion timed out"
    except OSError:
        return None, "yt-dlp is not installed in this container"
    if completed.returncode != 0:
        detail = (completed.stderr or "").strip().splitlines()
        return None, detail[-1][:200] if detail else "the MP3 conversion failed"
    produced = [
        os.path.join(workdir, name)
        for name in (os.listdir(workdir) if os.path.isdir(workdir) else [])
        if name.endswith(".mp3")
    ]
    if not produced:
        return None, "no MP3 file was produced"
    return produced[0], None


def _mp3_response(url: str) -> Response:
    """Serve the transcoded MP3, converting it on first request only."""
    if not MP3_READY:
        return _json({"error": "MP3 encoding is not available on this bridge"}, 503)
    with _mp3_lock:
        cached = _mp3_files.get(url)
        path = cached[0] if cached and cached[1] > time.time() and os.path.exists(cached[0]) else None
    if not path:
        with _mp3_lock:
            event = _mp3_inflight.get(url)
            owner = event is None
            if owner:
                event = threading.Event()
                _mp3_inflight[url] = event
        if not owner:
            # Same video, second request: wait for the first encode instead of
            # doubling the work YouTube already rate-limits.
            event.wait(timeout=MP3_TIMEOUT_S + 5)
            with _mp3_lock:
                cached = _mp3_files.get(url)
            path = cached[0] if cached and os.path.exists(cached[0]) else None
            if not path:
                return _json({"error": "the MP3 conversion is still running"}, 503)
        else:
            try:
                path, error = _encode_mp3(url)
            finally:
                with _mp3_lock:
                    _mp3_inflight.pop(url, None)
                event.set()
            if not path:
                return _json({"error": error or "the MP3 conversion failed"}, 502)
            with _mp3_lock:
                _mp3_files[url] = (path, time.time() + MP3_CACHE_TTL_S)
                _prune_mp3_cache()
    response = send_file(
        path,
        mimetype="audio/mpeg",
        as_attachment=True,
        download_name=_download_name("mp3"),
        conditional=True,
        max_age=0,
    )
    response.headers["Cache-Control"] = "no-store"
    return _cors(response)


@app.route("/stream", methods=["GET", "HEAD", "OPTIONS"])
def stream() -> Response:
    if request.method == "OPTIONS":
        return _cors(Response(status=204))

    url = _allowed_url(request.args.get("url"))
    if not url:
        return _json({"error": "a supported public https video URL is required"}, 400)
    kind = (request.args.get("kind") or "video").strip().lower()
    if kind not in (*FORMATS, "mp3"):
        return _json({"error": "kind must be 'video', 'audio' or 'mp3'"}, 400)
    try:
        expires = int(request.args.get("exp", "0"))
    except ValueError:
        return _json({"error": "invalid expiry"}, 400)
    signature = request.args.get("sig", "")
    if not signature or not _valid_signature(url, kind, expires, signature):
        return _json({"error": "expired or invalid stream signature"}, 403)

    if kind == "mp3":
        return _mp3_response(url)

    media, _, error = _media_for(url, kind)
    if error or not media:
        # One retry: a cold lazy extraction can lose its race with YouTube's
        # first response, and the visitor sees that as a dead MP3 button.
        with _media_lock:
            _media_cache.pop((url, kind), None)
        media, _, error = _media_for(url, kind)
    if error or not media:
        return _json({"error": error or "stream unavailable"}, 502)

    # Mutable so a mid-transfer quota refusal can swap in a freshly resolved
    # URL without restarting the download the visitor already has open.
    current_media = [media]

    upstream_headers = {
        "User-Agent": request.headers.get(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        ),
        "Accept": "*/*",
        "Accept-Encoding": "identity",
        "Referer": "https://www.youtube.com/" if _is_youtube(url) else "https://www.tiktok.com/",
    }
    def open_upstream(byte_range: str | None = None) -> requests.Response:
        headers = dict(upstream_headers)
        if byte_range:
            headers["Range"] = byte_range
        return requests.get(
            current_media[0],
            headers=headers,
            stream=True,
            allow_redirects=True,
            timeout=(10, 60),
        )

    def next_range(start: int, end: int) -> requests.Response | None:
        """A range response for [start, end], re-resolving the URL if refused."""
        for attempt in range(3):
            try:
                response = open_upstream(f"bytes={start}-{end}")
            except requests.RequestException:
                response = None
            if response is not None:
                if response.status_code in (200, 206):
                    return response
                response.close()
            if attempt == 2:
                return None
            with _media_lock:
                _media_cache.pop((url, kind), None)
            fresh, _, fresh_error = _media_for(url, kind)
            if fresh_error or not fresh:
                return None
            current_media[0] = fresh
        return None

    # A client Range (a resumed download) is proxied verbatim: the browser asks
    # for the exact slice it wants and re-asks by itself.
    client_range = request.headers.get("Range")
    if client_range:
        try:
            upstream = open_upstream(client_range)
        except requests.RequestException:
            return _json({"error": "upstream media did not answer"}, 502)
        if upstream.status_code not in (200, 206):
            upstream.close()
            return _json({"error": f"upstream media answered {upstream.status_code}"}, 502)
        response_headers = _media_headers(upstream, kind)
        if request.method == "HEAD":
            upstream.close()
            return Response(status=upstream.status_code, headers=response_headers)
        return Response(
            stream_with_context(_relay(upstream)),
            status=upstream.status_code,
            headers=response_headers,
            direct_passthrough=True,
        )

    # No Range: fetch the file in byte ranges (see STREAM_CHUNK_BYTES). The
    # probe range doubles as the size report, so the browser still gets a real
    # Content-Length and a working progress bar.
    try:
        first = open_upstream(f"bytes=0-{STREAM_CHUNK_BYTES - 1}")
    except requests.RequestException:
        return _json({"error": "upstream media did not answer"}, 502)

    if first.status_code not in (200, 206):
        first.close()
        return _json({"error": f"upstream media answered {first.status_code}"}, 502)

    response_headers = _media_headers(first, kind)
    total = _content_range_total(first.headers.get("Content-Range"))

    if request.method == "HEAD":
        first.close()
        return Response(status=200, headers=response_headers)

    if first.status_code == 200 or not total:
        # This host ignored Range (or reported no size): stream it as it comes.
        return Response(
            stream_with_context(_relay(first)),
            status=first.status_code,
            headers=response_headers,
            direct_passthrough=True,
        )

    response_headers.pop("Content-Range", None)
    response_headers["Content-Length"] = str(total)
    response_headers["Accept-Ranges"] = "bytes"
    return Response(
        stream_with_context(_range_reader(first, total, next_range)),
        status=200,
        headers=response_headers,
        direct_passthrough=True,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "7860")), threaded=True)

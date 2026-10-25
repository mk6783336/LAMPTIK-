"""LAMP TIK yt-dlp bridge — optional Python extraction + stream service.

Why it exists: Vercel's serverless runtime has no Python and no yt-dlp binary.
This tiny service runs anywhere a container can (Hugging Face Docker Space,
Render, Fly, a VPS, or a laptop behind a tunnel) and answers the calls the
Next.js resolver makes:

    POST /            {"url": "https://…", "client": "android"}
    POST /resolve     {"url": "https://…", "platform": "youtube"}
        → {"url": "<signed bridge stream URL>", "title": …, "duration": …,
           "uploader": …, "thumbnail": …, "id": …}

    GET /stream?url=<youtube>&exp=<unix>&sig=<hmac>
        → the media bytes, proxied from the bridge's own network

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

import hashlib
import hmac
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from urllib.parse import quote, urlparse

import requests
from flask import Flask, Response, jsonify, request, stream_with_context

app = Flask(__name__)

BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "").strip()
RESOLVE_TIMEOUT_S = int(os.environ.get("RESOLVE_TIMEOUT_S", "9"))
STREAM_TTL_S = int(os.environ.get("STREAM_TTL_S", "7200"))
MEDIA_CACHE_TTL_S = int(os.environ.get("MEDIA_CACHE_TTL_S", "120"))
MAX_URL_LENGTH = 2048

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
PROGRESSIVE_FORMAT = "best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/best"

_media_cache: dict[str, tuple[str, dict, float]] = {}
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


def _base_args(url: str) -> list[str]:
    args = [YTDLP, "--no-playlist", "--no-warnings", "--no-cache-dir"]
    if _is_youtube(url):
        args += ["--extractor-args", "youtube:player_client=android"]
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


def _resolve_media(url: str) -> tuple[str | None, dict | None, str | None]:
    """Run yt-dlp once and return (direct media URL, info, error)."""
    try:
        completed = subprocess.run(
            _base_args(url) + ["-f", PROGRESSIVE_FORMAT, "-j", url],
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


def _cached(url: str) -> tuple[str, dict] | None:
    with _media_lock:
        cached = _media_cache.get(url)
        if cached and cached[2] > time.time():
            return cached[0], cached[1]
    return None


def _media_for(url: str) -> tuple[str | None, dict | None, str | None]:
    hit = _cached(url)
    if hit:
        return hit[0], hit[1], None

    with _inflight_lock:
        event = _inflight.get(url)
        owner = event is None
        if owner:
            event = threading.Event()
            _inflight[url] = event

    if not owner:
        # Someone is already extracting this exact video. Wait for their run
        # (the subprocess itself is bounded by RESOLVE_TIMEOUT_S) and reuse it.
        event.wait(timeout=RESOLVE_TIMEOUT_S + 3)
        hit = _cached(url)
        if hit:
            return hit[0], hit[1], None
        return None, None, "extraction is still running for this video"

    try:
        media, data, error = _resolve_media(url)
        if error or not media or not data:
            return None, None, error or "no stream"
        with _media_lock:
            _media_cache[url] = (media, data, time.time() + MEDIA_CACHE_TTL_S)
            while len(_media_cache) > 200:
                oldest = next(iter(_media_cache))
                _media_cache.pop(oldest, None)
        return media, data, None
    finally:
        with _inflight_lock:
            _inflight.pop(url, None)
        event.set()


def _stream_key() -> bytes:
    return STREAM_KEY


def _sign(url: str, expires: int) -> str:
    message = f"{url}\n{expires}".encode("utf-8")
    return hmac.new(_stream_key(), message, hashlib.sha256).hexdigest()


def _valid_signature(url: str, expires: int, signature: str) -> bool:
    if expires < int(time.time()):
        return False
    return hmac.compare_digest(_sign(url, expires), signature)


def _public_base() -> str:
    configured = os.environ.get("PUBLIC_BASE_URL", "").strip().rstrip("/")
    if configured:
        return configured
    proto = request.headers.get("x-forwarded-proto", request.scheme).split(",")[0].strip()
    host = request.headers.get("x-forwarded-host", request.host).split(",")[0].strip()
    return f"{proto}://{host}"


def _stream_url(url: str) -> str:
    expires = int(time.time()) + STREAM_TTL_S
    signature = _sign(url, expires)
    return (
        f"{_public_base()}/stream?url={quote(url, safe='')}"
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
    return _json(
        {
            "status": "ok",
            "ytdlp": _ytdlp_version(),
            "secured": bool(BRIDGE_SECRET),
            "stream_signature": "persistent" if not STREAM_KEY_IS_EPHEMERAL else "ephemeral",
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
            "id": data.get("id"),
            "title": data.get("title"),
            "duration": data.get("duration") or 0,
            "uploader": data.get("uploader") or data.get("channel") or data.get("uploader_id"),
            "thumbnail": data.get("thumbnail"),
            "ext": data.get("ext"),
            "engine": "bridge",
        }
    )


@app.route("/stream", methods=["GET", "HEAD", "OPTIONS"])
def stream() -> Response:
    if request.method == "OPTIONS":
        return _cors(Response(status=204))

    url = _allowed_url(request.args.get("url"))
    if not url:
        return _json({"error": "a supported public https video URL is required"}, 400)
    try:
        expires = int(request.args.get("exp", "0"))
    except ValueError:
        return _json({"error": "invalid expiry"}, 400)
    signature = request.args.get("sig", "")
    if not signature or not _valid_signature(url, expires, signature):
        return _json({"error": "expired or invalid stream signature"}, 403)

    media, _, error = _media_for(url)
    if error or not media:
        return _json({"error": error or "stream unavailable"}, 502)

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
    range_header = request.headers.get("Range")
    if range_header:
        upstream_headers["Range"] = range_header

    try:
        upstream = requests.get(
            media,
            headers=upstream_headers,
            stream=True,
            allow_redirects=True,
            timeout=(10, 60),
        )
    except requests.RequestException:
        return _json({"error": "upstream media did not answer"}, 502)

    if upstream.status_code not in (200, 206):
        upstream.close()
        return _json({"error": f"upstream media answered {upstream.status_code}"}, 502)

    response_headers = {
        "Content-Type": upstream.headers.get("Content-Type", "video/mp4"),
        "Accept-Ranges": upstream.headers.get("Accept-Ranges", "bytes"),
        "Cache-Control": "no-store",
    }
    for name in ("Content-Length", "Content-Range"):
        value = upstream.headers.get(name)
        if value:
            response_headers[name] = value

    if request.method == "HEAD":
        upstream.close()
        return Response(status=upstream.status_code, headers=response_headers)

    def generate():
        try:
            for chunk in upstream.iter_content(chunk_size=512 * 1024):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    return Response(
        stream_with_context(generate()),
        status=upstream.status_code,
        headers=response_headers,
        direct_passthrough=True,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "7860")), threaded=True)

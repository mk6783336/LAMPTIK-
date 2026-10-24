"""
lamptik yt-dlp worker — the optional Python extraction service.

Why it exists: Vercel's serverless runtime has no Python and no yt-dlp binary.
This tiny service runs anywhere a container can (Hugging Face Docker Space,
Render, Fly, a VPS) and answers the two calls lamptik's resolver makes:

    POST /resolve   {"url": "https://…", "platform": "youtube"}
    GET  /resolve?url=https%3A%2F%2F…
        → {"url": "<direct media URL>", "title": …, "duration": …,
           "uploader": …, "thumbnail": …, "id": …}

    GET  /stream?url=https%3A%2F%2F…
        → the media bytes themselves, Content-Type: video/mp4

The response shape matches lib/youtube-ytdlp.ts and lib/universal-ytdlp.ts:
`url` may also be read from `video` / `download_url`, and `author` from
`uploader`. If BRIDGE_SECRET is set, every request must carry it in the
`x-bridge-secret` header (the Next.js side already sends it when configured).

Security notes:
  * Only public https links on the four supported platforms are accepted, so
    this is not an open proxy.
  * No shell is involved anywhere; every argument is passed as a list element.
"""

import json
import os
import re
import shutil
import subprocess
from urllib.parse import urlparse

from flask import Flask, Response, jsonify, request, stream_with_context

app = Flask(__name__)

YTDLP = shutil.which("yt-dlp") or "yt-dlp"
BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "").strip()

RESOLVE_TIMEOUT_S = int(os.environ.get("RESOLVE_TIMEOUT_S", "45"))
MAX_URL_LENGTH = 2048

# Public platform hosts this worker will touch. Anything else is refused, so a
# leaked URL cannot turn the worker into a general-purpose proxy.
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

# One single-file rendition: merging separate video+audio streams requires a
# seekable output, which stdout is not, so `bv*+ba` would fail on /stream.
PROGRESSIVE_FORMAT = "best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/best"


def _cors(response: Response) -> Response:
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, x-bridge-secret"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
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
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return None
    host = parsed.hostname.lower()
    return url if any(_host_matches(host, base) for base in ALLOWED_HOSTS) else None


def _secret_ok() -> bool:
    if not BRIDGE_SECRET:
        return True
    return request.headers.get("x-bridge-secret", "") == BRIDGE_SECRET


def _is_youtube(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return any(_host_matches(host, base) for base in YOUTUBE_HOSTS)


def _base_args(url: str) -> list[str]:
    args = [YTDLP, "--no-playlist", "--no-warnings", "--no-cache-dir"]
    # The Android client signature survives the web bot walls and reports a
    # real duration, which is what keeps the result card off 0:00.
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


@app.get("/")
def index() -> Response:
    return _json(
        {
            "service": "lamptik-ytdlp-worker",
            "endpoints": ["/health", "/resolve?url=…", "/stream?url=…"],
            "secured": bool(BRIDGE_SECRET),
        }
    )


@app.get("/health")
def health() -> Response:
    version = "unknown"
    try:
        version = subprocess.run(
            [YTDLP, "--version"], capture_output=True, text=True, timeout=10
        ).stdout.strip() or "unknown"
    except Exception:  # noqa: BLE001 — health must answer even when yt-dlp is broken
        pass
    return _json({"status": "ok", "ytdlp": version, "secured": bool(BRIDGE_SECRET)})


@app.route("/resolve", methods=["GET", "POST", "OPTIONS"])
def resolve() -> Response:
    if request.method == "OPTIONS":
        return _cors(Response(status=204))
    if not _secret_ok():
        return _json({"error": "unauthorized"}, 401)

    url = _request_url()
    if not url:
        return _json({"error": "a supported public https video URL is required"}, 400)

    try:
        completed = subprocess.run(
            _base_args(url) + ["-f", "best[ext=mp4]/best", "-j", url],
            capture_output=True,
            text=True,
            timeout=RESOLVE_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        return _json({"error": "conversion timed out"}, 504)
    except OSError:
        return _json({"error": "yt-dlp is not installed in this container"}, 503)

    if completed.returncode != 0:
        detail = (completed.stderr or "").strip().splitlines()
        return _json({"error": detail[-1][:300] if detail else "yt-dlp failed"}, 502)

    data = _first_json(completed.stdout or "")
    if not data:
        return _json({"error": "yt-dlp returned no JSON payload"}, 502)

    media = data.get("url") or data.get("webpage_url")
    if not isinstance(media, str) or not media.startswith("https://"):
        return _json({"error": "yt-dlp exposed no direct https stream"}, 502)

    return _json(
        {
            "url": media,
            "id": data.get("id"),
            "title": data.get("title"),
            "duration": data.get("duration") or 0,
            "uploader": data.get("uploader") or data.get("channel") or data.get("uploader_id"),
            "thumbnail": data.get("thumbnail"),
            "ext": data.get("ext"),
            "engine": "worker",
        }
    )


@app.get("/stream")
def stream() -> Response:
    if not _secret_ok():
        return _json({"error": "unauthorized"}, 401)

    url = _request_url()
    if not url:
        return _json({"error": "a supported public https video URL is required"}, 400)

    def generate():
        process = subprocess.Popen(
            _base_args(url) + ["-f", PROGRESSIVE_FORMAT, "-o", "-", url],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            bufsize=1024 * 512,
        )
        try:
            while True:
                chunk = process.stdout.read(512 * 1024) if process.stdout else b""
                if not chunk:
                    break
                yield chunk
        finally:
            if process.stdout:
                process.stdout.close()
            process.wait()

    return Response(
        stream_with_context(generate()),
        mimetype="video/mp4",
        headers={
            "Content-Disposition": 'attachment; filename="lamptik-worker.mp4"',
            "Cache-Control": "no-store",
        },
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "7860")), threaded=True)

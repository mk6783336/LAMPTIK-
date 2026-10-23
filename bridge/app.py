"""
yt-dlp HTTP bridge — the server side of YTDLP_BRIDGE_URL.

Contract implemented for lib/youtube-ytdlp.ts (platform="youtube") and
lib/universal-ytdlp.ts (platform="tiktok"|"instagram"|"facebook"):

    POST /  {"url": "...", "platform": "youtube|tiktok|instagram|facebook",
             "client": "android"?, "kind": "video|audio"?     (both optional; client
                          ="android" is the legacy alias for platform=youtube)}
    → 200 {"url": "<direct progressive mp4>", "duration": 213, "title": "…",
           "uploader": "…", "thumbnail": "https://i.ytimg.com/...", "id": "..."}

The extraction command is FIXED server-side — requests choose nothing butthe URL and the asked-for platform, so this can't be turned into a
general yt-dlp argument proxy.

Run: docker compose up -d   (see bridge/README.md)
"""

import asyncio
import json
import os
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, HttpUrl

YTDLP_TIMEOUT = float(os.environ.get("YTDLP_TIMEOUT", "30"))
# Shared secret (set BRIDGE_SECRET to enable). Keep it ≥ 24 random chars —
# Vercel's route is the only intended caller.
BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "")

app = FastAPI(title="lamptik yt-dlp bridge")


class ExtractRequest(BaseModel):
    url: HttpUrl
    client: str = "android"
    platform: Literal["youtube", "tiktok", "instagram", "facebook"] | None = None
    kind: Literal["video", "audio"] = "video"


def _authorized(request: Request) -> bool:
    if not BRIDGE_SECRET:
        return True  # deployment MUST sit behind its own network control then
    return (request.headers.get("x-bridge-secret") or "") == BRIDGE_SECRET


def _platform(body: ExtractRequest) -> str:
    # Legacy payload: youtube-ytdlp.ts still sends {"client": "android"} with
    # no platform — that IS the youtube Android-client extraction.
    return body.platform or ("youtube" if body.client == "android" else "")


def _extractor_args(platform: str) -> list[str]:
    """Per-platform flags, fixed server-side so the request cannot carve them."""
    if platform == "youtube":
        # The Android player client signature survives the web bot walls.
        return ["--extractor-args", "youtube:player_client=android"]
    if platform == "tiktok":
        # Force the plain-public API host: web-hostname extractor tiers get
        # bot-walled from datacenter IPs; the portable API host does not.
        return ["--extractor-args", "tiktok:api_hostname=api16-normal-c-useast1a.tiktokv.com"]
    # instagram / facebook: yt-dlp's own extractors, no special args needed.
    return []


def _format_flag(kind: str) -> str:
    # Progressive MP4 with audio fused for video; for audio take the best
    # serverless audio track (m4a preferred — plays everywhere natively).
    return ["best[ext=mp4]/best", "bestaudio[ext=m4a]/bestaudio"][kind == "audio"]


@app.get("/ping")
def ping() -> dict:
    """Cheap liveness for /api/health's bridgeReachable ping."""
    return {"status": "ok"}


@app.post("/")
async def extract(req: Request) -> dict:
    if not _authorized(req):
        raise HTTPException(status_code=401, detail="bad bridge secret")

    try:
        body = ExtractRequest.model_validate(await req.json())
    except Exception:
        raise HTTPException(status_code=400, detail="expected {url, platform?, client?, kind?}")

    platform = _platform(body)
    if not platform:
        raise HTTPException(status_code=400, detail=f"unsupported client {body.client!r}")

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "--no-warnings",
        *(_extractor_args(platform)),
        "-f",
        _format_flag(body.kind),
        "-j",
        str(body.url),
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=YTDLP_TIMEOUT)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="yt-dlp timed out")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="yt-dlp binary missing in image")

    if proc.returncode != 0:
        # Return the tail (never the full dump) — enough to debug, small
        # enough to never leak cookies or paths.
        raise HTTPException(status_code=502, detail=stderr.decode(errors="replace")[-400:])

    decoded = stdout.decode(errors="replace")
    json_start = decoded.find("{")
    if json_start < 0:
        raise HTTPException(status_code=502, detail="yt-dlp produced no extract payload")
    info = json.loads(decoded[json_start:])

    stream = info.get("url")
    if not stream:
        # best[ext=mp4]/best can select a manifest when no progressive mp4
        # exists — tell the caller plainly instead of handing back a page.
        raise HTTPException(status_code=502, detail="no direct stream url in payload")

    return {
        "url": stream,
        "video": stream,            # alias tolerated by the consumer
        "download_url": stream,     # alias tolerated by the consumer
        "id": info.get("id"),
        "duration": info.get("duration") or 0,
        "title": info.get("title") or "",
        "uploader": info.get("uploader") or info.get("channel") or "",
        "thumbnail": info.get("thumbnail"),
    }

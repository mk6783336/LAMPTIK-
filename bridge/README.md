# yt-dlp bridge — deployment notes

A ~110-line FastAPI wrapper around `yt-dlp` that answers the exact contract
`lib/youtube-ytdlp.ts` speaks:

    POST /  {"url": "<youtube url>", "client": "android"}
    → 200 {"url": "<direct progressive stream>", "duration": 213,
           "title": "…", "uploader": "…", "thumbnail": "https://i.ytimg.com/…"}

## Why self-built instead of a ready-made project

The ready-made containers were checked and none match in one synchronous call:

| Project | Gap vs our contract |
|---|---|
| fvadicamo/yt-dlp-api | FastAPI + API key, but `GET /api/v1/info` returns normalized metadata — no guaranteed direct `url` field |
| Vasysik/yt-dlp-host | Active + cookies/proxy support, but async: POST → task id → poll `/status/{id}` |
| Totonyus/ydl_api_ng | Download-oriented; `/extract_info` omits the stream URL |
| cobalt-api | Self-hostable, but `status: tunnel/redirect` shape — not yt-dlp `-j`, no metadata |

A wrapper we own also keeps the two things that matter server-side: we can bake
`player_client=android` (and later cookies/PO-token plumbing) into the command
without exposing any yt-dlp argument to the caller, and the request can carry
nothing but the URL.

## Deploy

    # on any VPS — Hetzner CX23 ≈ €5.99/mo is the comfort floor (Fly's 256 MB
    # shared-cpu tier is too tight for yt-dlp + the Deno PO-token runtime):
    cd bridge/
    export BRIDGE_SECRET="$(head -c 24 /dev/urandom | base64)"   # ≥24 chars
    echo "BRIDGE_SECRET=$BRIDGE_SECRET" > .env
    docker compose up -d --build
    curl -s http://127.0.0.1:8000/ping      # → {"status":"ok"}

The compose file binds `127.0.0.1:8000` only. Put TLS or a private tunnel in
front — the two simplest options with no certificates to manage:

- **Cloudflare Tunnel** (free): `cloudflared tunnel --url http://127.0.0.1:8000`
  gives `https://<random>.trycloudflare.com`; a named tunnel gives a stable host
  on your own domain. TLS terminates at CF and no server port opens.
- **Caddy** on the same box with an A-record pointing at your VPS: two lines of
  Caddyfile for automatic Let's Encrypt certs on a public 443.

## Wire it into the app

Set these in Vercel Production (and Preview if you test there):

    YTDLP_BRIDGE_URL = https://<bridge-host>/      # plain env var, not a secret
    BRIDGE_SECRET    = <same ≥24-char value>       # Vercel secret

`lib/youtube-ytdlp.ts` picks the bridge up on the next deployment. Until that
file learns to send `x-bridge-secret`, keep the secret off the bridge (an empty
`BRIDGE_SECRET=` in `.env` — compose allows empty but not unset) *and* keep the
port off the internet (loopback bind + tunnel-only reachability only). Once the
header round-trip lands, set the secret and the tunnel becomes your network
control — which is exactly how it should stay.

## Keeping it alive

YouTube's extractor drifts; yt-dlp must be updated frequently. From a weekly
cron on the host:

    docker compose build --pull && docker compose up -d

No volumes, no state: the bridge is stateless by design, so this upgrade is a
drop-in restart.

## Operational smoke test

    curl -s -X POST http://127.0.0.1:8000/ \
      -H 'Content-Type: application/json' \
      -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","client":"android"}'
    # expect: {"url":"https://...googlevideo...", "duration":…, "title":…, …}

Failure shape (also fine): HTTP 502 with the stderr tail — that's what
`/api/health`'s `bridgeReachable` ping and the Next-side logs will surface.

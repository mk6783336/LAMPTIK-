---
title: LAMP TIK yt-dlp bridge
emoji: 🎬
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# LAMP TIK yt-dlp bridge

A small, optional Python service that extracts direct media URLs with
`yt-dlp`. It exists because **Vercel's Node runtime has no Python and no
`yt-dlp` binary** — the Next.js app calls this service over HTTPS instead.

Nothing in this folder is part of the Next.js build. Deploy it separately.

> Free cloud hosts (Hugging Face, Render) use datacenter IPs. YouTube may
> block those IPs for label music exactly as it blocks Vercel's. If `/resolve`
> works for normal videos but not for a specific song, run the bridge on a
> residential machine behind a tunnel (last section) or on your own VPS.

## Quick start from this repo

The repo already has the runner and the deps wiring:

```bash
cd bridge && py -3 -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # macOS/Linux: .venv/bin/pip
cd ..
npm run bridge:tunnel -- --write-env
```

That starts the bridge, opens a free Cloudflare Quick Tunnel, waits until the
public URL actually answers `/health`, prints the two Vercel variables and
(with `--write-env`) writes them into `.env.local` for local dev. Cloudflare
rate-limits quick tunnels per network; if it says so, wait a few minutes or use
a permanent host below.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Service info + yt-dlp version |
| `GET` | `/health` | `{"status":"ok","ytdlp":"<version>"}` — use as the platform health check |
| `GET`/`POST` | `/` or `/resolve` | JSON `{url, id, title, duration, uploader, thumbnail}` with a direct https stream |

`POST` accepts the exact body the Next.js resolver sends:

```json
{ "url": "https://www.youtube.com/watch?v=…", "client": "android" }
```

`/resolve` also accepts `{"url": "…", "platform": "youtube"}`.

If `BRIDGE_SECRET` is set on the bridge, every `/` and `/resolve` request must
carry it as the `x-bridge-secret` header. The app sends it automatically when
the same `BRIDGE_SECRET` exists in Vercel. `/health` stays public.

Only public https links on YouTube, TikTok, Instagram, Facebook and
`fb.watch` are accepted, so the service is not an open proxy.

## Deploy on Hugging Face (free Docker Space)

1. **Create** → *Docker* Space → *Blank*. Name it `lamptik-ytdlp`, hardware
   **CPU basic (free)**.
2. Upload the four files in this folder to the Space root:
   `Dockerfile`, `app.py`, `requirements.txt`, `README.md`.
3. **Settings → Variables and secrets** → add `BRIDGE_SECRET` as a *secret*
   (any long random string, e.g. `openssl rand -hex 24`).
4. Wait for the build. The Space is served at
   `https://<user>-<space>.hf.space`.
5. Verify:

   ```bash
   curl https://<user>-<space>.hf.space/health
   # {"status":"ok","secured":true,"ytdlp":"2026.xx.xx"}
   ```

6. In **Vercel → Project → Settings → Environment Variables** add:

   ```
   YTDLP_BRIDGE_URL=https://<user>-<space>.hf.space
   BRIDGE_SECRET=<the same secret>
   ```

   `YTDLP_BRIDGE_URL` is read at runtime, so it takes effect on the next
   request. `YTDLP_WORKER_URL` and `NEXT_PUBLIC_YTDLP_WORKER_URL` are accepted
   aliases; the latter is compiled into the build and needs a redeploy.

7. Confirm the app sees it:

   ```bash
   curl https://www.lamptik.online/api/health
   ```

   Look for `"bridge": { "configured": true, "reachable": true }`.

> Hugging Face free Spaces sleep after a period of inactivity. The first
> request after sleep can take 30–60s and will exceed the app's 12s bridge
> timeout; that resolve falls back to the normal waterfall. A later retry
> usually hits the awake Space.

## Deploy on Render (free web service)

`render.yaml` in this folder is a Blueprint for a free Docker web service in
Singapore. Either:

- Push this repo to GitHub, then Render → **New → Blueprint** → select the
  repo. Render reads `bridge/render.yaml`; or
- New → **Web Service** → Docker, root directory `bridge`, instance **Free**,
  health check `/health`, and add `BRIDGE_SECRET` yourself.

Render injects `PORT`; the Docker `CMD` expands it, so the service listens on
the right port. Free Render services sleep after ~15 minutes; the first
request after sleep is slow (same caveat as HF). Copy the service URL into
`YTDLP_BRIDGE_URL` and the secret into `BRIDGE_SECRET` in Vercel.

## Run locally (residential IP — best chance against YouTube blocks)

Requires Python 3.10+ and `yt-dlp` on PATH, or install the dependencies:

```bash
cd bridge
py -3 -m venv .venv
. .venv/Scripts/activate        # Windows Git Bash
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
export BRIDGE_SECRET=devsecret
python app.py                   # listens on :7860
```

Verify:

```bash
curl http://127.0.0.1:7860/health

curl -sS -X POST http://127.0.0.1:7860 \
  -H 'content-type: application/json' \
  -H 'x-bridge-secret: devsecret' \
  -d '{"url":"https://www.youtube.com/watch?v=YQHsXMglC9A"}'
```

### Expose it with a free Cloudflare Quick Tunnel

No account is required:

```bash
cloudflared tunnel --url http://127.0.0.1:7860
```

Cloudflare prints a `https://<random>.trycloudflare.com` URL. Put that URL in
Vercel as `YTDLP_BRIDGE_URL`, keep the terminal and the PC awake, and the
Vercel resolver will use your residential connection. The URL **changes every
time the tunnel restarts**; update the Vercel variable then.

### Permanent hostname (named tunnel)

A named tunnel fixes the rotating URL. One already exists for this deployment:

```bash
cloudflared tunnel --config .scratch/cloudflared-bridge.yml run lamptik-bridge
```

It publishes `https://bridge.lamptik.online` — a CNAME to
`1914e86b-….cfargotunnel.com` — so restarting the PC never changes the value in
Vercel. It answers whenever the PC, the bridge and the tunnel are running; see
[DNS-MIGRATION.md](DNS-MIGRATION.md) for the DNS side and the verification
commands.

For a host outside this PC, a small VPS with the same Dockerfile works too.

## Start on boot (Windows)

The tunnel and the bridge only exist while this PC is running. Install the
logon launcher once:

```bash
npm run bridge:autostart
```

That writes `LampTik Bridge.vbs` into the user's Startup folder — no
administrator rights, no console window — and starts the services immediately.
At every logon it runs `scripts/bridge-autostart.ps1`, which starts only what
is missing: the bridge with `BRIDGE_SECRET` read from `.env.local`, then the
named tunnel, and logs the result to `.scratch/bridge-autostart.log`.

Verified cold (both processes killed, launcher run): the bridge and tunnel were
back and `https://bridge.lamptik.online/health` answered `200` in ~4 s.

Remove the entry with:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-bridge-autostart.ps1 -Uninstall
```

## Wire-up contract

The Next.js side (`lib/youtube-ytdlp.ts`) tries the bridge for YouTube after
the 300 ms Innertube ANDROID attempt, inside the same failover race as the
mirrors, and the universal extractor uses the same service for TikTok /
Instagram / Facebook. Any non-2xx or missing `url` is treated as "engine
unavailable", so a sleeping or broken bridge never breaks the normal
waterfall — it only adds one bounded attempt.

How much time the bridge gets: the whole resolve is capped at 5.4 s to stay
inside Vercel's 6 s function limit, and the bridge receives whatever is left
after the Innertube attempt (~5 s in practice). A cold yt-dlp run takes ~3.5 s
on a warm container and is cached for 120 s afterwards, so a second click on
the same video answers instantly. That window is the reason a blocked music
video now resolves instead of dying at the old fixed 3.5 s cutoff.

The bridge answers with one **muxed MP4** (video + audio). The audio track is a
second, *lazy* extraction: `/resolve` signs an `audio` URL but does not run
yt-dlp for it, and the first byte request on that URL resolves the audio ladder
with yt-dlp's default (web) client — the Android client that produces the muxed
file advertises no audio-only format at all, so both cannot come from one run.
That keeps a resolve at ~4 s and makes the MP3 click the only thing that pays
for the extra run (~6 s cold, then instant from the 120 s cache). Only YouTube
advertises `audio`; that is the ladder verified here.

The audio file is the platform's AAC track (`.m4a`), exactly what the MP3
button already returns for Innertube-resolved videos — nothing is transcoded.

## Security

- Keep `BRIDGE_SECRET` long and random; put it in the host's **secret** store,
  never in Git.
- The URL allowlist is the SSRF boundary. Do not add arbitrary hosts.
- The service is stateless and writes nothing to disk.

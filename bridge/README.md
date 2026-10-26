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

## Deploy a 24/7 backup bridge (3 minutes)

The home PC behind the tunnel is the best bridge (residential IP), but it sleeps
with the machine. Run a second copy on a free cloud host and list it as the
backup: when the PC is offline the app probes it in ~2.5s and fails over, so
label music still resolves.

> **Hugging Face needs PRO now (checked October 2026).** Creating a Docker
> Space on a free account fails with `402 … hosting Gradio and Docker Spaces
> on free cpu-basic requires a PRO subscription`, and downgrading an existing
> Space to `cpu-basic` is refused with the same 402. The steps below still
> work on a PRO account; on a free one use Render.
>
> **Supabase cannot host this.** Its Edge Functions are a Deno runtime with no
> shell, no Python and no ffmpeg, so `yt-dlp` cannot run there; the database,
> auth and storage products do not run containers at all.

### Hugging Face (Docker Space, PRO plan)

1. **Create → Docker → Blank**: name it `lamptik-ytdlp`, hardware **CPU basic
   (free)**.
2. Upload three files to the Space root: `Dockerfile`, `app.py`,
   `requirements.txt` (the README is optional).
3. **Settings → Variables and secrets**:

   | Name | Value |
   | --- | --- |
   | `BRIDGE_SECRET` | same secret as the PC bridge (`openssl rand -hex 24`) |
   | `YTDLP_COOKIES_BASE64` | *optional*, see [Cookies](#cookies-and-proxy) |
   | `YTDLP_PROXY` | *optional*, see [Cookies](#cookies-and-proxy) |

4. Wait for the build, then verify — it must report the runtime it found:

   ```bash
   curl https://<user>-lamptik-ytdlp.hf.space/health
   # {"status":"ok","secured":true,"ytdlp":"2026.xx.xx",
   #  "cookies":false,"proxy":false,"js_runtime":"deno"}
   ```

   `"js_runtime":"deno"` confirms signature solving is available. If it says
   `null`, the image was built from an old Dockerfile.

### Render

`render.yaml` in this folder is a Blueprint for a free Docker web service.
Render → **New → Blueprint** → pick the repo, or create a Docker web service
with root directory `bridge`, health check `/health`, and add `BRIDGE_SECRET`.
The image's `CMD` expands Render's `PORT`, so the same file works on both.

### Wire the failover in Vercel

Add both hosts, primary first — comma-separated in one variable, or a dedicated
backup variable (either works, and both may be combined):

```
YTDLP_BRIDGE_URL=https://bridge.lamptik.online
YTDLP_BRIDGE_BACKUP_URL=https://<user>-lamptik-ytdlp.hf.space
BRIDGE_SECRET=<the same secret on both bridges>
```

Then confirm the chain:

```bash
curl https://www.lamptik.online/api/health
# "bridges": [
#   {"url":"https://bridge.lamptik.online","reachable":true},
#   {"url":"https://…hf.space","reachable":true}
# ]
```

A `reachable: false` primary with a `true` backup is the *expected* state when
the PC is off — resolves still work. Both `false` means every bridge is down
and the app is running on its JavaScript waterfall alone.

> Free Spaces go to sleep after inactivity. The first request after sleep takes
> 30–60s and will miss the 2.5s failover probe, so that resolve uses the
> JavaScript waterfall; the next one usually hits the awake Space. A paid
> instance (or a Fly/Railway machine with `auto_stop=false`) removes that
> first-hit penalty.

## Cookies and proxy

Both are optional and only worth setting when the cloud IP is bot-checked on a
specific video.

**`YTDLP_COOKIES_BASE64`** — export a `cookies.txt` for youtube.com with any
browser extension in Netscape format, then base64 it into the platform's secret
store (never commit it):

```bash
base64 -w0 cookies.txt | pbcopy      # macOS: base64 -i - | pbcopy
```

The bridge decodes it at boot to a `0600` temp file, removes it on exit, and
passes `--cookies` to every extraction. `/health` reports `"cookies": true`
and never returns the value. Use an account you do not mind risking: YouTube
can flag accounts whose cookies are used from datacenter IPs.

**`YTDLP_PROXY`** — any `http(s)://` or `socks5://` URL (user:pass inline is
fine). Passed as `--proxy`; useful when a residential proxy is available.
`/health` reports `"proxy": true`.

**`YTDLP_REMOTE_COMPONENTS`** — defaults to `ejs:github` whenever a JS runtime
exists, which is what actually solves `nsig`. Set it to `off` to stop the
one-time fetch from GitHub (yt-dlp then falls back to throttled URLs).

> Older README advice said a first request can exceed the app's "12s bridge
timeout" — the client now waits 22s and the failover probe is 2.5s, so only a
> genuinely cold Space is skipped.

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

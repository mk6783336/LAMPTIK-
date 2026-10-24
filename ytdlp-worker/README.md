# yt-dlp worker

A standalone Python service that extracts direct media URLs with `yt-dlp`. It
exists because **Vercel's serverless runtime has no Python and no `yt-dlp`
binary** — the Next.js app calls this worker over HTTPS instead of trying to
spawn something that was never installed.

Nothing in this folder is part of the Next.js build. Deploy it separately.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | `{"status":"ok","ytdlp":"<version>"}` — use it as the platform health check |
| `GET`/`POST` | `/resolve?url=…` | JSON `{url, id, title, duration, uploader, thumbnail}` with a direct https stream |
| `GET` | `/stream?url=…` | The bytes themselves, `Content-Type: video/mp4`, attachment filename |

`POST /resolve` also accepts `{"url": "…", "platform": "youtube"}` (the exact
body the Next.js resolver sends). If `BRIDGE_SECRET` is set on the worker,
every request must carry it as the `x-bridge-secret` header — the app sends it
automatically when `BRIDGE_SECRET` exists in Vercel too.

Only public https links on YouTube, TikTok, Instagram, Facebook and `fb.watch`
are accepted, so the service is not an open proxy.

## Deploy on Hugging Face (free Docker Space)

1. **Create** → *Docker* Space → *Blank*, name it `lamptik-ytdlp`, hardware
   **CPU basic (free)**.
2. In the Space's **Files** tab, add the three files from this folder
   (`Dockerfile`, `app.py`, `README.md`) — or push them to the Space repo.
3. **Settings → Variables and secrets**: add `BRIDGE_SECRET` (any long random
   string) as a *secret*. The Space builds and exposes
   `https://<user>-<space>.hf.space`.

Verify with `curl https://<user>-<space>.hf.space/health` — it should answer
`{"status":"ok","ytdlp":"2026.xx.xx"}`.

## Deploy on Render (free web service)

1. New → **Web Service** → *Deploy from a Git repo* (or “Public Git repository”).
2. Root directory: `ytdlp-worker` · Runtime: **Docker** · Instance: **Free**.
3. Add environment variable `BRIDGE_SECRET`. Render injects `PORT`; the
   container listens on `7860` by default and gunicorn binds that port, so no
   extra config is needed.

## Wire it into the Next.js app

In **Vercel → Project → Settings → Environment Variables**:

```
YTDLP_WORKER_URL=https://<your-worker-host>
BRIDGE_SECRET=<same random string>
```

`YTDLP_WORKER_URL` is read at runtime, so saving it takes effect on the next
request. The legacy names still work: `NEXT_PUBLIC_YTDLP_WORKER_URL` (compiled
into the build — needs a redeploy) and `YTDLP_BRIDGE_URL`.

Then check `https://www.lamptik.online/api/health`:

```json
{ "youtube": { "ytdlp": { "bridgeConfigured": true, "bridgeReachable": true, "binaryAvailable": false } } }
```

`bridgeConfigured: true` + `bridgeReachable: true` means the worker is wired
up. `binaryAvailable: false` is expected on Vercel and harmless — the app
skips the local-binary probe there entirely, so it never spawns a process that
cannot exist.

## Local run

```bash
docker build -t lamptik-ytdlp .
docker run --rm -p 7860:7860 -e BRIDGE_SECRET=devsecret lamptik-ytdlp
curl "http://localhost:7860/resolve?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
  -H "x-bridge-secret: devsecret"
```

## Notes

- `/stream` uses a **progressive** single-file format
  (`best[ext=mp4][vcodec!=none][acodec!=none]/best`). Merging separate
  video+audio streams needs a seekable output file, which stdout is not.
- `/resolve` uses `-f best[ext=mp4]/best -j`, so the `url` it returns is the
  single best progressive MP4 with a real `duration`.
- The worker is stateless: no cache, no disk writes. yt-dlp is reinstalled on
  every rebuild, which is how it keeps up with YouTube extractor changes.

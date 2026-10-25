# LAMP TIK yt-dlp bridge — cloud image
#
# Python + ffmpeg + yt-dlp + deno behind gunicorn. Deploy this folder on its
# own (Hugging Face Docker Space, Render, Fly, Railway, a VPS) and point the
# Next.js app at it with YTDLP_BRIDGE_URL / YTDLP_BRIDGE_BACKUP_URL. Nothing
# here is bundled into the Next build.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=7860

# ffmpeg is required whenever yt-dlp has to remux/merge anything; the slim
# image ships without it. curl backs the HEALTHCHECK. --no-install-recommends
# keeps the layer small.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# A JS runtime is what lets yt-dlp solve YouTube's `n` signature. Without one
# it warns "signature solving failed", silently loses formats and the URLs it
# does return are throttled to a fraction of the line speed. The official bin
# image is copied in (no curl | sh), and app.py detects it on PATH and passes
# `--js-runtimes deno --remote-components ejs:github`.
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

WORKDIR /app

COPY requirements.txt ./
# --upgrade on purpose: yt-dlp's YouTube extractor breaks within weeks of a
# YouTube change, and every rebuild should pick up the current one.
RUN pip install --upgrade pip \
    && pip install --upgrade -r requirements.txt

COPY app.py ./

# Hugging Face Spaces runs containers as uid 1000; creating the user here keeps
# the same image valid on Render/Fly too (they run as root and ignore it).
RUN useradd --create-home --uid 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD curl -fsS "http://127.0.0.1:${PORT:-7860}/health" || exit 1

# One worker / eight threads: every request shells out to yt-dlp, so the work
# is I/O-bound. ${PORT} lets Render (10000) and HF (7860) share the image.
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-7860} --workers 1 --threads 8 --timeout 120 --access-logfile - app:app"]

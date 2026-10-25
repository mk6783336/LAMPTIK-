# LAMP TIK yt-dlp bridge
#
# Python + ffmpeg + yt-dlp behind gunicorn. Deploy this folder on its own
# (Hugging Face Docker Space, Render, Fly, a VPS) and point the Next.js app at
# it with YTDLP_BRIDGE_URL. Nothing here is bundled into the Next build.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

# ffmpeg is required whenever yt-dlp has to remux/merge anything; the slim
# image ships without it. --no-install-recommends keeps the layer small.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY app.py ./

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD curl -fsS "http://127.0.0.1:${PORT:-7860}/health" || exit 1

# One worker / eight threads: every request shells out to yt-dlp, so
# concurrency is I/O-bound. ${PORT} lets Render (10000) and HF (7860) share
# the same image.
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-7860} --workers 1 --threads 8 --timeout 120 --access-logfile - app:app"]

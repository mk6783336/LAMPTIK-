# lamptik yt-dlp worker
#
# Python 3.11 + ffmpeg + yt-dlp behind gunicorn. Deploy this folder on its own
# (Hugging Face Docker Space, Render, Fly, a VPS) and point the Next.js app at
# it with YTDLP_WORKER_URL. Nothing here is bundled into the Next build.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

# ffmpeg is required whenever yt-dlp has to remux/merge anything; the slim
# image ships without it. --no-install-recommends keeps the layer small.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# yt-dlp is installed from PyPI rather than a pinned binary so a rebuild always
# picks up the current YouTube extractor fix.
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -U flask gunicorn yt-dlp

COPY app.py ./

EXPOSE 7860

# 1 worker / 8 threads: each request shells out to yt-dlp, so concurrency is
# I/O-bound. --timeout is above the resolver's own 45s budget.
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "1", "--threads", "8", \
     "--timeout", "120", "--access-logfile", "-", "app:app"]

# lamptik yt-dlp bridge — the strongest YouTube extractor in one small image.
#
# yt-dlp[default] pulls: yt-dlp itself + Deno (the PO-token provider runtime
# where supported) + ffmpeg (mux helpers). Total image ≈ 350 MB.
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir "yt-dlp[default]" fastapi uvicorn

# yt-dlp must stay CURRENT for YouTube — pin a version only when you
# deliberately need reproducibility. Rebuild the container weekly (a cron on
# the host or CI) so the YouTube extractor tweaks keep shipping.
WORKDIR /app
COPY app.py .
EXPOSE 8000

HEALTHCHECK --interval=60s --timeout=5s CMD python -c \
  "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/ping', timeout=4)"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

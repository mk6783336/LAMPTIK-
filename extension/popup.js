/**
 * LampTik extension — toolbar popup.
 *
 * Detects the current tab's video, asks the background worker to resolve it,
 * and renders one-click MP4 / MP3 downloads. The popup is a normal extension
 * page, but it still routes through the worker so both surfaces share the
 * permission model and the resolution cache.
 */
(() => {
  const BASE = "https://www.lamptik.online";

  const ui = {
    tag: document.getElementById("platform-tag"),
    url: document.getElementById("url-line"),
    card: document.getElementById("card"),
    thumb: document.getElementById("thumb"),
    title: document.getElementById("title"),
    sub: document.getElementById("sub"),
    status: document.getElementById("status"),
    mp4: document.getElementById("mp4"),
    mp3: document.getElementById("mp3"),
    hint: document.getElementById("hint"),
    site: document.getElementById("site"),
  };

  const LABEL = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook" };

  function detect(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;
    if (host.endsWith("youtube.com") || host === "youtu.be") {
      if (host === "youtu.be") {
        const id = path.replace(/^\//, "").split("/")[0];
        return /^[A-Za-z0-9_-]{6,}$/.test(id)
          ? { platform: "youtube", url: `https://www.youtube.com/watch?v=${id}` }
          : null;
      }
      const match = `${path}${parsed.search}`.match(/(?:[?&]v=|^\/shorts\/|^\/live\/)([A-Za-z0-9_-]{6,})/);
      return match
        ? { platform: "youtube", url: `https://www.youtube.com/watch?v=${match[1]}` }
        : null;
    }
    if (host.endsWith("tiktok.com")) {
      return /\/(video|photo)\//.test(path) || /\/t\//.test(path) || host.startsWith("vm.") || host.startsWith("vt.")
        ? { platform: "tiktok", url }
        : null;
    }
    if (host.endsWith("instagram.com")) {
      return /\/(reel|reels|p|tv)\//.test(path)
        ? { platform: "instagram", url: `https://www.instagram.com${path.replace(/\/+$/, "")}/` }
        : null;
    }
    if (host.endsWith("facebook.com") || host === "fb.watch") {
      return /\/(reel|videos|watch)\//.test(path) || /[?&]v=\d+/.test(parsed.search) || host === "fb.watch"
        ? { platform: "facebook", url }
        : null;
    }
    return null;
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    if (!total) return "";
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return hours ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
  }

  function setStatus(text, state) {
    ui.status.textContent = text;
    ui.status.dataset.state = state || "loading";
  }

  function setHint(text, state) {
    ui.hint.textContent = text || "";
    ui.hint.dataset.state = state || "idle";
  }

  function ask(url) {
    return new Promise((done) => {
      chrome.runtime.sendMessage({ type: "lamptik:resolve", url }, (response) => {
        if (chrome.runtime.lastError) {
          done({ ok: false, error: { message: "The LampTik helper did not answer. Reopen the popup." } });
          return;
        }
        done(response || { ok: false, error: { message: "No answer from the LampTik helper." } });
      });
    });
  }

  function startDownload(url) {
    if (!url) return;
    if (url.includes("/api/download")) {
      // Attachment response: the download starts, the popup stays put.
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.rel = "noopener";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }
    chrome.tabs.create({ url });
  }

  function renderMedia(media) {
    ui.card.classList.add("is-on");
    if (media.thumbnail) {
      ui.thumb.src = media.thumbnail;
      ui.thumb.referrerPolicy = "no-referrer";
    }
    ui.title.textContent = media.title || "Video";
    const bits = [media.author, formatDuration(media.duration)].filter(Boolean);
    ui.sub.textContent = bits.join(" · ");
    if (media.pageUrl) ui.site.href = media.pageUrl;

    const videoUrl = media.videoHd || media.videoSd || "";
    const audioUrl = media.audioMp3 || "";

    ui.mp4.disabled = !videoUrl;
    ui.mp4.dataset.href = videoUrl;
    ui.mp4.textContent = videoUrl ? "Download HD MP4" : "MP4 not available";

    ui.mp3.disabled = !audioUrl;
    ui.mp3.dataset.href = audioUrl;
    ui.mp3.textContent = audioUrl ? "Download MP3" : "MP3 not available";

    setStatus(
      videoUrl || audioUrl ? "Ready — saved by your browser." : "No stream came back for this video.",
      videoUrl || audioUrl ? "ready" : "error",
    );
    setHint("");
  }

  async function run() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs[0];
    const rawUrl = (tab && tab.url) || "";

    ui.url.textContent = rawUrl || "No active tab.";
    ui.url.title = rawUrl;

    const target = rawUrl ? detect(rawUrl) : null;
    if (!target) {
      ui.tag.textContent = "unsupported";
      ui.card.classList.remove("is-on");
      setHint("Open a YouTube watch/shorts page, a TikTok video, an Instagram reel, or a Facebook video.", "error");
      ui.mp4.disabled = true;
      ui.mp3.disabled = true;
      return;
    }

    ui.tag.textContent = LABEL[target.platform] || target.platform;
    ui.card.classList.add("is-on");
    ui.title.textContent = tab.title ? tab.title.replace(/\s*[-–]\s*YouTube\s*$/i, "") : "Video";
    ui.sub.textContent = LABEL[target.platform] || "";
    setStatus("Resolving the best stream…", "loading");

    const result = await ask(target.url);
    if (!result || result.ok !== true) {
      setStatus((result && result.error && result.error.message) || "Could not resolve this video.", "error");
      setHint("Open the site to try again with the full player.", "error");
      return;
    }
    renderMedia(result.media);
  }

  ui.mp4.addEventListener("click", () => startDownload(ui.mp4.dataset.href || ""));
  ui.mp3.addEventListener("click", () => startDownload(ui.mp3.dataset.href || ""));

  run().catch(() => {
    setStatus("Something went wrong while resolving.", "error");
    setHint("Open lamptik.online to download this video.", "error");
  });
})();

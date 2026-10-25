/**
 * LampTik extension — page-level UI.
 *
 * On YouTube it adds one native-looking "⚡ Download" button to the action bar
 * of a watch/shorts page; on TikTok, Instagram and Facebook it adds a floating
 * pill. Both open the same in-page popover, which resolves the video through
 * the extension worker (→ lamptik.online) and hands the file to Chrome's own
 * download manager via lamptik's attachment endpoint.
 *
 * Rules that keep this safe on a host page we do not control:
 *  - every selector, class and id is namespaced with `lamptik-`;
 *  - every block is wrapped so a host-page change can never throw into it;
 *  - nothing runs before `document_idle`, and no host script is touched.
 */
(() => {
  if (window.__lamptikExtensionLoaded) return;
  window.__lamptikExtensionLoaded = true;

  const BASE = "https://www.lamptik.online";
  const YOUTUBE_ID = /(?:[?&]v=|^\/shorts\/|^\/live\/|^\/embed\/)([A-Za-z0-9_-]{6,})/;

  /** url → in-flight promise, so a peek + a click never resolve twice. */
  const pending = new Map();

  /* ---------------------------------------------------------------- utils */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
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

  function hostOf(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  }

  /* ----------------------------------------------------------- detection */

  /**
   * Which video is this page, and at which resolver?
   * @returns {{ platform: string, url: string, videoId: string | null } | null}
   */
  function detect() {
    const host = location.hostname.toLowerCase();
    const path = location.pathname;
    const search = location.search;

    if (host.endsWith("youtube.com") || host === "youtu.be") {
      if (host === "youtu.be") {
        const id = path.replace(/^\//, "").split("/")[0];
        if (/^[A-Za-z0-9_-]{6,}$/.test(id)) {
          return { platform: "youtube", url: `https://www.youtube.com/watch?v=${id}`, videoId: id };
        }
        return null;
      }
      const match = `${path}${search}`.match(YOUTUBE_ID);
      if (match) {
        const id = match[1];
        return { platform: "youtube", url: `https://www.youtube.com/watch?v=${id}`, videoId: id };
      }
      return null;
    }

    if (host.endsWith("tiktok.com")) {
      if (/\/(video|photo)\//.test(path) || /\/t\//.test(path) || host.startsWith("vm.") || host.startsWith("vt.")) {
        return { platform: "tiktok", url: location.href, videoId: null };
      }
      return null;
    }

    if (host.endsWith("instagram.com")) {
      if (/\/(reel|reels|p|tv)\//.test(path)) {
        const code = path.split("/").filter(Boolean).pop();
        return {
          platform: "instagram",
          url: `https://www.instagram.com${path.replace(/\/+$/, "")}/`,
          videoId: code || null,
        };
      }
      return null;
    }

    if (host.endsWith("facebook.com") || host === "fb.watch") {
      if (/\/(reel|videos|watch)\//.test(path) || /[?&]v=\d+/.test(search) || host === "fb.watch") {
        return { platform: "facebook", url: location.href, videoId: null };
      }
      return null;
    }

    return null;
  }

  /** Title + thumbnail straight from the host page — no network, instant. */
  function pageMeta(target) {
    const read = (selector) => {
      const node = document.querySelector(selector);
      return node && node.getAttribute("content") ? node.getAttribute("content") : "";
    };
    const rawTitle =
      read('meta[property="og:title"]') ||
      read('meta[name="title"]') ||
      document.title ||
      "Video";
    const title = rawTitle.replace(/\s*[-–]\s*YouTube\s*$/i, "").trim();
    const image =
      read('meta[property="og:image"]') ||
      (target.videoId ? `https://i.ytimg.com/vi/${target.videoId}/hqdefault.jpg` : "");
    const author =
      (document.querySelector('link[itemprop="name"]') &&
        document.querySelector('link[itemprop="name"]').getAttribute("content")) ||
      read('meta[property="og:site_name"]') ||
      "";
    return { title, image, author };
  }

  /* ------------------------------------------------------------ messenger */

  /** Ask the background worker to resolve; it owns host permissions + cache. */
  function ask(url, force) {
    return new Promise((done) => {
      try {
        chrome.runtime.sendMessage({ type: "lamptik:resolve", url, force: Boolean(force) }, (response) => {
          const failed = chrome.runtime.lastError;
          if (failed) {
            done({ ok: false, error: { message: "The LampTik helper is not available. Reload the page." } });
            return;
          }
          done(response || { ok: false, error: { message: "No answer from the LampTik helper." } });
        });
      } catch {
        done({ ok: false, error: { message: "The LampTik helper is not available. Reload the page." } });
      }
    });
  }

  function resolveTarget(target, force) {
    const key = target.url;
    if (!force && pending.has(key)) return pending.get(key);
    const promise = ask(target.url, force).finally(() => {
      // Keep only the short-lived in-flight entry; the worker caches payloads.
      window.setTimeout(() => pending.delete(key), 1000);
    });
    pending.set(key, promise);
    return promise;
  }

  /* --------------------------------------------------------------- styles */

  function ensureRoot() {
    let root = document.getElementById("lamptik-root");
    if (root) return root;
    root = el("div");
    root.id = "lamptik-root";
    document.documentElement.appendChild(root);
    return root;
  }

  /* --------------------------------------------------------- download CTA */

  /**
   * Hand a URL to Chrome's download manager.
   *
   * lamptik's `/api/download` answers with `Content-Disposition: attachment`,
   * so a same-tab click starts the file and leaves the page where it is. A raw
   * CDN URL is not under our control, so it opens in its own tab instead — the
   * user's YouTube tab must never be navigated away from.
   */
  function startDownload(url) {
    if (!url) return;
    try {
      if (url.includes("/api/download")) {
        const anchor = el("a");
        anchor.href = url;
        anchor.rel = "noopener";
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        window.setTimeout(() => anchor.remove(), 5000);
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  /* --------------------------------------------------------------- popover */

  /** @type {HTMLElement | null} */
  let popover = null;
  /** @type {{ platform: string, url: string, videoId: string | null } | null} */
  let popoverTarget = null;
  let resolving = false;

  function closePopover() {
    if (popover && popover.parentNode) popover.parentNode.removeChild(popover);
    popover = null;
    popoverTarget = null;
    resolving = false;
  }

  function positionPopover(anchor) {
    if (!popover) return;
    const width = 344;
    const margin = 12;
    const rect = anchor.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    let top = rect.bottom + 10;
    if (top + 320 > window.innerHeight) {
      top = Math.max(margin, rect.top - 330);
    }
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  }

  function openPopover(anchor, target) {
    try {
      ensureRoot();
      closePopover();
      popoverTarget = target;

      const panel = el("div", "lamptik-pop");
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "LampTik download");
      popover = panel;

      const head = el("div", "lamptik-pop-head");
      const brand = el("span", "lamptik-pop-brand");
      brand.innerHTML = '<span class="lamptik-bolt">⚡</span><span>LampTik</span>';
      const close = el("button", "lamptik-pop-close", "×");
      close.type = "button";
      close.setAttribute("aria-label", "Close LampTik");
      close.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closePopover();
      });
      head.append(brand, close);

      const meta = pageMeta(target);

      const body = el("div", "lamptik-pop-body");
      const thumb = el("img", "lamptik-pop-thumb");
      thumb.alt = "";
      thumb.referrerPolicy = "no-referrer";
      if (meta.image) thumb.src = meta.image;
      else thumb.classList.add("lamptik-pop-thumb-empty");
      const metaCol = el("div", "lamptik-pop-meta");
      const title = el("p", "lamptik-pop-title", meta.title || "Video");
      const sub = el("p", "lamptik-pop-sub", meta.author || hostOf(target.url));
      metaCol.append(title, sub);
      body.append(thumb, metaCol);

      const status = el("p", "lamptik-pop-status", "Resolving the best stream…");
      status.dataset.state = "loading";

      const actions = el("div", "lamptik-pop-actions");
      const videoAction = el("button", "lamptik-act lamptik-act-primary", "Download HD MP4");
      videoAction.type = "button";
      videoAction.disabled = true;
      const audioAction = el("button", "lamptik-act", "Download MP3");
      audioAction.type = "button";
      audioAction.disabled = true;
      const siteAction = el("a", "lamptik-act lamptik-act-ghost", "Open on lamptik.online ↗");
      siteAction.href = BASE;
      siteAction.target = "_blank";
      siteAction.rel = "noopener noreferrer";
      actions.append(videoAction, audioAction, siteAction);

      const note = el("p", "lamptik-pop-note", "Free · no account · file saved by your browser");

      panel.append(head, body, status, actions, note);
      ensureRoot().appendChild(panel);
      positionPopover(anchor);

      videoAction.addEventListener("click", () => startDownload(videoAction.dataset.href || ""));
      audioAction.addEventListener("click", () => startDownload(audioAction.dataset.href || ""));

      hydrate(target, { status, title, sub, thumb, videoAction, audioAction, siteAction });
    } catch {
      // A host-page change must never break the page.
    }
  }

  function setStatus(node, state, text) {
    if (!node) return;
    node.dataset.state = state;
    node.textContent = text;
  }

  async function hydrate(target, refs) {
    resolving = true;
    setStatus(refs.status, "loading", "Resolving the best stream…");
    const result = await resolveTarget(target);
    resolving = false;
    if (!popoverTarget || popoverTarget.url !== target.url) return;

    if (!result || result.ok !== true) {
      const message =
        (result && result.error && result.error.message) ||
        "lamptik.online could not resolve this video. Please retry.";
      setStatus(refs.status, "error", message);
      const retry = el("button", "lamptik-retry", "Retry");
      retry.type = "button";
      retry.addEventListener("click", async () => {
        retry.disabled = true;
        retry.remove();
        resolving = true;
        setStatus(refs.status, "loading", "Resolving again…");
        const second = await resolveTarget(target, true);
        resolving = false;
        if (!popoverTarget || popoverTarget.url !== target.url) return;
        if (second && second.ok === true) {
          apply(refs, second.media);
        } else {
          setStatus(
            refs.status,
            "error",
            (second && second.error && second.error.message) || "Still unavailable. Try the site.",
          );
        }
      });
      refs.status.after(retry);
      return;
    }

    apply(refs, result.media);
  }

  function apply(refs, media) {
    if (!media) return;
    if (media.title) refs.title.textContent = media.title;
    const bits = [media.author, formatDuration(media.duration)].filter(Boolean);
    refs.sub.textContent = bits.length ? bits.join(" · ") : hostOf(location.href);
    if (media.thumbnail) {
      refs.thumb.src = media.thumbnail;
      refs.thumb.classList.remove("lamptik-pop-thumb-empty");
    }
    if (media.pageUrl) refs.siteAction.href = media.pageUrl;

    const videoUrl = media.videoHd || media.videoSd || "";
    const audioUrl = media.audioMp3 || "";

    refs.videoAction.dataset.href = videoUrl;
    refs.videoAction.disabled = !videoUrl;
    refs.videoAction.textContent = videoUrl
      ? "Download HD MP4"
      : "MP4 not available for this video";

    refs.audioAction.dataset.href = audioUrl;
    refs.audioAction.disabled = !audioUrl;
    refs.audioAction.textContent = audioUrl ? "Download MP3" : "MP3 not available";

    setStatus(
      refs.status,
      "ready",
      videoUrl || audioUrl
        ? "Ready — the file goes straight to your Downloads."
        : "No stream came back for this video. Try the site.",
    );
  }

  /* ---------------------------------------------------------- entry points */

  function mountYouTubeButton(target) {
    const bar =
      document.querySelector("#top-level-buttons-computed") ||
      document.querySelector("#actions #top-level-buttons-computed") ||
      document.querySelector("ytd-watch-metadata #actions") ||
      document.querySelector("#actions");

    const existing = document.getElementById("lamptik-yt-btn");
    if (!bar) return;
    if (existing) {
      if (bar.contains(existing)) return;
      existing.remove();
    }

    const button = el("button", "lamptik-btn");
    button.id = "lamptik-yt-btn";
    button.type = "button";
    button.title = "Download this video with LampTik";
    button.innerHTML = '<span class="lamptik-bolt">⚡</span><span class="lamptik-btn-label">Download</span>';
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const current = detect();
      if (current) openPopover(button, current);
    });
    bar.appendChild(button);
  }

  function mountPill(target) {
    const root = ensureRoot();
    let pill = document.getElementById("lamptik-pill");
    if (!pill) {
      pill = el("button", "lamptik-pill");
      pill.id = "lamptik-pill";
      pill.type = "button";
      pill.innerHTML = '<span class="lamptik-bolt">⚡</span><span>Download</span>';
      pill.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const current = detect();
        if (current) openPopover(pill, current);
      });
      root.appendChild(pill);
    }
  }

  function clearUi() {
    const button = document.getElementById("lamptik-yt-btn");
    if (button) button.remove();
    const pill = document.getElementById("lamptik-pill");
    if (pill) pill.remove();
    closePopover();
  }

  function sync() {
    try {
      const target = detect();
      if (!target) {
        clearUi();
        return;
      }
      if (target.platform === "youtube") {
        const pill = document.getElementById("lamptik-pill");
        if (pill) pill.remove();
        mountYouTubeButton(target);
      } else {
        const button = document.getElementById("lamptik-yt-btn");
        if (button) button.remove();
        mountPill(target);
      }
    } catch {
      // Never propagate into the host page.
    }
  }

  /* ------------------------------------------------------------- lifecycle */

  let scheduled = 0;
  function schedule() {
    if (scheduled) return;
    scheduled = window.setTimeout(() => {
      scheduled = 0;
      sync();
    }, 350);
  }

  try {
    const appRoot = document.getElementById("lamptik-root");
    if (!appRoot) ensureRoot();
    sync();

    // The four sites are single-page apps: a route change replaces the action
    // bar without a navigation event, and YouTube's own renderer can also wipe
    // an injected node. One debounced observer + the SPA event covers both.
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener("yt-navigate-finish", schedule, true);
    window.addEventListener("popstate", schedule, true);
    window.addEventListener("resize", () => {
      const button = document.getElementById("lamptik-yt-btn");
      if (popover && button) positionPopover(button);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePopover();
    });
    document.addEventListener(
      "click",
      (event) => {
        if (!popover) return;
        const node = event.target;
        if (node instanceof Node && (popover.contains(node) || node.id === "lamptik-yt-btn")) return;
        closePopover();
      },
      true,
    );

    // Last-resort URL poll: some in-app navigations fire none of the above.
    let lastHref = location.href;
    window.setInterval(() => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        schedule();
      }
    }, 1000);
  } catch {
    // Extension UI is best-effort on a third-party page.
  }
})();

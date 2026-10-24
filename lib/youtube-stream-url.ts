/**
 * A completed Savenow v2 job can return a URL that redirects through
 * `/ajax/ad/` to an unrelated affiliate offer, not the media file. Never
 * surface known job and ad-redirect routes as downloadable streams.
 */
export function isKnownLoaderInterstitialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const saverHost = host === "savenow.to" || host.endsWith(".savenow.to");
    const loaderV2Host = host === "lto2.affadaffa.com" || host.endsWith(".lto2.affadaffa.com");
    const v2DownloadPath = /^\/api\/v2\/download(?:\/|$)/i.test(url.pathname);
    return (
      (saverHost && (v2DownloadPath || /^\/ajax\/ad\//i.test(url.pathname))) ||
      (loaderV2Host && v2DownloadPath)
    );
  } catch {
    return false;
  }
}

/**
 * Converter CDN hosts that serve a finished file to ANY visitor IP and send
 * their own `Content-Disposition: attachment`. Only these may be handed to
 * the browser as a direct top-level download.
 *
 * `googlevideo.com` is deliberately NOT here: those URLs are signed for the
 * resolver's IP, so a browser on a different connection is refused. They must
 * ride the same-origin proxy, which fetches them from the resolving network.
 */
export function isConverterAttachmentUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host === "loader.to" ||
      host.endsWith(".loader.to") ||
      host === "oceansaver.in" ||
      host.endsWith(".oceansaver.in") ||
      host === "savenow.to" ||
      host.endsWith(".savenow.to") ||
      host === "lto2.affadaffa.com" ||
      host.endsWith(".lto2.affadaffa.com") ||
      host === "pacific-cdn.net" ||
      host.endsWith(".pacific-cdn.net")
    );
  } catch {
    return false;
  }
}

/** True for Loader/Savenow links which are still converter job handles. */
export function isLoaderJobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const converterHost =
      host === "savenow.to" ||
      host.endsWith(".savenow.to") ||
      host === "lto2.affadaffa.com" ||
      host.endsWith(".lto2.affadaffa.com");
    return converterHost && /^\/api\/v2\/download(?:\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
}

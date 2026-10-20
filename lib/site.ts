/**
 * Canonical origin. NEXT_PUBLIC_SITE_URL wins (previews/staging); the
 * production domain is the hard fallback so a missing env var can NEVER emit
 * a localhost canonical again — that was the SEO bug on Vercel.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lamptik.online"
).replace(/\/+$/, "");

/**
 * Canonical + hreflang pair for a route. The site is English-only, so every
 * page declares `en` and an `x-default` — that is the correct signal for a
 * single-locale property and prevents Google from guessing.
 */
export function pageAlternates(path: string) {
  return {
    canonical: path,
    languages: { en: path, "x-default": path },
  } as const;
}

export const siteConfig = {
  name: "LAMP TIK",
  title: "LAMP TIK — TikTok Video Downloader Without Watermark (HD MP4)",
  description:
    "Free TikTok video downloader without watermark — save HD MP4 at 1080p, convert TikTok to MP3 original sound, and resolve vt/vm short links. No app or sign-up.",
  keywords: [
    "TikTok video downloader without watermark",
    "download TikTok video HD MP4",
    "TikTok to MP3 converter",
    "TikTok downloader online free no app",
    "TikTok 1080p downloader",
    "vt.tiktok.com short link resolver",
    "vm.tiktok.com downloader",
    "save TikTok audio original sound MP3",
    "download TikTok without logo iPhone Android",
    "no watermark TikTok",
    "LAMP TIK",
  ],
  creator: "LAMP TIK",
  /** Real content-update date, not build time — Google only trusts accurate lastmod. */
  lastModified: "2026-10-20",
} as const;

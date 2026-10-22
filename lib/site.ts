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

/**
 * The shipped Android build, in one place.
 *
 * The download buttons, the /app-download copy, its JSON-LD and the /api/apk
 * route all read these values, so a new APK only has to be dropped into
 * public/downloads and described here once — the page can never advertise a
 * version or a file size that is not the one being served.
 */
export const androidApp = {
  version: "3.0",
  versionCode: 30,
  fileName: "lamptik-v3.0.apk",
  downloadName: "LAMP-TIK-v3.0.apk",
  sizeBytes: 4_432_273,
  /** Human label shown next to every download button. */
  sizeLabel: "4.2 MB",
  minAndroid: "Android 7.0+",
} as const;

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

/**
 * Canonical origin. NEXT_PUBLIC_SITE_URL wins (previews/staging); the
 * production domain is the hard fallback so a missing env var can NEVER emit
 * a localhost canonical again — that was the SEO bug on Vercel.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lamptik.online"
).replace(/\/+$/, "");

/**
 * Canonical + hreflang pair for a route. A page that is English-only declares
 * `en` and `x-default`, which is the correct signal for a single-locale
 * document and stops Google from guessing.
 *
 * `translations` adds the locales that really carry the page — only the two
 * Spanish twins use it today (`/es/twitter-video-downloader`,
 * `/es/instagram-reels-audio`). An annotation has to be reciprocal, so the
 * Spanish route declares the same cluster in the other direction.
 */
export function pageAlternates(path: string, translations?: Record<string, string>) {
  return {
    canonical: path,
    languages: { en: path, ...(translations ?? {}), "x-default": path },
  } as const;
}

/**
 * The only hreflang cluster this site has: the home tool and its four
 * translated landings. It used to be emitted from the root layout on *every*
 * page, which told Google that `/youtube-downloader` was translated into
 * Arabic at `/ar` — a different tool on a different page. Alternates now
 * live only on the pages that really are translations of each other.
 *
 * Each key is the exact `html lang` its target serves (`lib/i18n/*.ts`): the
 * Brazilian landing is written in pt-BR and ships `<html lang="pt-BR">`, so
 * its hreflang has to say pt-BR too. A bare `pt` against a `pt-BR` document
 * is the same "hreflang and HTML lang mismatch" the audit reports.
 */
export const LANDING_LANGUAGES = {
  en: "/",
  ar: "/ar",
  es: "/es",
  de: "/de",
  "pt-BR": "/pt",
  // Indonesian is the largest single market for this category (Indonesia is
  // the top country for both Snaptik and SSSTik), and the incumbents answer it
  // mostly with English pages — so /id is the one locale with a real opening.
  id: "/id",
  // India and Vietnam are the next two volume markets where the incumbents
  // serve English pages and a local-language page can actually compete.
  hi: "/hi",
  vi: "/vi",
  // Thailand and the Philippines complete the Southeast Asian set: the two
  // remaining volume markets where the incumbents rank with English pages.
  th: "/th",
  tl: "/tl",
  // Turkish and French are the two non-English markets where the incumbents
  // rank with English pages and a native page still has room: Türkiye is a
  // top-five TikTok market, and French covers France plus francophone Africa.
  tr: "/tr",
  fr: "/fr",
  // Urdu is the one locale where the *demand* is unambiguous and the
  // competition is not: "tiktok video download" is one of Pakistan's largest
  // queries, and the incumbents answer it with English pages. The copy carries
  // roman-Urdu keywords beside the script ones because that is how the query
  // is actually typed.
  ur: "/ur",
  "x-default": "/",
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

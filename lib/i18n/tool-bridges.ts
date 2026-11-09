import type { LocaleCode } from "@/lib/i18n/types";

export interface BridgeLink {
  href: string;
  label: string;
  /** Set on links whose destination is in another language (the creator tools are English-only). */
  lang?: string;
}

export interface BridgeCopy {
  heading: string;
  links: BridgeLink[];
}

/**
 * Above-the-fold cross-links for the localized landings.
 *
 * The Spanish cluster is where this site already earns non-brand impressions
 * and its one page-one position, and `/de`, `/fr` and `/ar` are the same page
 * shape in higher-CPM markets. Every one of them now links — in flow, not from
 * the footer — to the two downloaders Google has not crawled yet, to the Reels
 * audio page, and to the four creator micro-tools that just got indexed. The
 * anchor text is the query each destination answers, so the link is a topic
 * signal as well as a crawl path.
 *
 * Only the four locales with demand evidence are wired here; a locale without
 * an entry simply renders no strip rather than an English one on a Spanish
 * page.
 */
export const TOOL_BRIDGES: Partial<Record<LocaleCode, BridgeCopy>> = {
  es: {
    // Carries the "bajar/descargar videos de TikTok online gratis" stem that
    // Search Console is already showing impressions for.
    heading: "Bajar o descargar videos de TikTok online gratis — y las herramientas del creador",
    links: [
      {
        href: "/es/facebook-video-downloader",
        label: "Descargar videos de Facebook en HD gratis",
      },
      {
        href: "/instagram-reels-audio",
        label: "Descargar audio de Reels de Instagram en MP3",
        lang: "en",
      },
      { href: "/tiktok-money-calculator", label: "Calculadora de ingresos de TikTok", lang: "en" },
      {
        href: "/tiktok-safe-zone-checker",
        label: "Comprobar la zona segura 1080 × 1920",
        lang: "en",
      },
      {
        href: "/video-thumbnail-downloader",
        label: "Descargar la miniatura de un video",
        lang: "en",
      },
      {
        href: "/tiktok-caption-hashtag-extractor",
        label: "Extraer título y hashtags",
        lang: "en",
      },
      { href: "/twitter-video-downloader", label: "Descargar videos de X / Twitter", lang: "en" },
    ],
  },

  de: {
    heading: "TikTok-Videos online gratis herunterladen — und die Creator-Werkzeuge",
    links: [
      {
        href: "/de/facebook-video-downloader",
        label: "Facebook-Videos in HD herunterladen",
      },
      { href: "/instagram-reels-audio", label: "Reels-Audio als MP3 speichern", lang: "en" },
      { href: "/tiktok-money-calculator", label: "TikTok-Einkommensrechner", lang: "en" },
      { href: "/tiktok-safe-zone-checker", label: "Safe-Zone 1080 × 1920 prüfen", lang: "en" },
      { href: "/video-thumbnail-downloader", label: "Video-Thumbnail herunterladen", lang: "en" },
      {
        href: "/tiktok-caption-hashtag-extractor",
        label: "Caption und Hashtags extrahieren",
        lang: "en",
      },
      { href: "/twitter-video-downloader", label: "X- / Twitter-Videos herunterladen", lang: "en" },
    ],
  },

  fr: {
    heading: "Télécharger des vidéos TikTok en ligne gratuitement — et les outils créateur",
    links: [
      {
        href: "/fr/facebook-video-downloader",
        label: "Télécharger des vidéos Facebook en HD",
      },
      { href: "/instagram-reels-audio", label: "Extraire l'audio d'un Reel en MP3", lang: "en" },
      { href: "/tiktok-money-calculator", label: "Calculateur de revenus TikTok", lang: "en" },
      {
        href: "/tiktok-safe-zone-checker",
        label: "Vérifier la zone sûre 1080 × 1920",
        lang: "en",
      },
      {
        href: "/video-thumbnail-downloader",
        label: "Télécharger la miniature d'une vidéo",
        lang: "en",
      },
      {
        href: "/tiktok-caption-hashtag-extractor",
        label: "Extraire la légende et les hashtags",
        lang: "en",
      },
      { href: "/twitter-video-downloader", label: "Télécharger des vidéos X / Twitter", lang: "en" },
    ],
  },

  ar: {
    heading: "تحميل فيديوهات تيك توك أونلاين مجانًا — وأدوات صانع المحتوى",
    links: [
      { href: "/ar/facebook-video-downloader", label: "تنزيل فيديوهات فيسبوك بجودة HD" },
      { href: "/instagram-reels-audio", label: "تنزيل صوت الريل بصيغة MP3", lang: "en" },
      { href: "/tiktok-money-calculator", label: "حاسبة أرباح تيك توك", lang: "en" },
      { href: "/tiktok-safe-zone-checker", label: "فحص المنطقة الآمنة 1080 × 1920", lang: "en" },
      { href: "/video-thumbnail-downloader", label: "تنزيل الصورة المصغرة للفيديو", lang: "en" },
      { href: "/tiktok-caption-hashtag-extractor", label: "استخراج الوصف والهاشتاقات", lang: "en" },
      { href: "/twitter-video-downloader", label: "تنزيل فيديوهات إكس / تويتر", lang: "en" },
    ],
  },
};

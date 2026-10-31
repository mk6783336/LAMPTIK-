"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/logo";
import type { FooterCopy, FooterGroupId, FooterLinkId } from "@/lib/i18n/footer-copy";

interface FooterLink {
  href: string;
  label: string;
  /** Key into the localized copy. Language names have none — they are endonyms. */
  id?: FooterLinkId;
}

/**
 * Footer navigation, in the order it renders.
 *
 * `label` is the English default; localized pages pass a `copy` and every group
 * and link reads its own string from it. The ids are explicit so
 * `footer-copy.ts` can be a total record: a locale that forgets a link fails the
 * type check instead of shipping one English word in an otherwise Hindi footer.
 */
const FOOTER_GROUPS: Array<{ id: FooterGroupId; label: string; links: FooterLink[] }> = [
  {
    id: "downloaders",
    label: "Downloaders",
    links: [
      { href: "/", label: "TikTok Downloader", id: "tiktok" },
      { href: "/instagram-reels-downloader", label: "Instagram Reels", id: "instagram" },
      { href: "/facebook-video-downloader", label: "Facebook HD", id: "facebook" },
      { href: "/youtube-downloader", label: "YouTube HD", id: "youtube" },
    ],
  },
  // Programmatic sub-tools: one link per high-intent query. These are real
  // pages with their own copy and schema, not anchors on the platform pages.
  {
    id: "subTools",
    label: "Sub-tools",
    links: [
      // The hub, first in the column: it lists all fifteen, so it is the better
      // entry point for anyone who is not already looking for one format.
      { href: "/tools", label: "All 15 tools", id: "allTools" },
      { href: "/tiktok-mp3-downloader", label: "TikTok to MP3", id: "tiktokMp3" },
      { href: "/tiktok-photo-downloader", label: "TikTok Photos", id: "tiktokPhotos" },
      { href: "/youtube-to-mp3", label: "YouTube to MP3", id: "youtubeMp3" },
      { href: "/youtube-playlist-downloader", label: "YouTube Playlist", id: "youtubePlaylist" },
      { href: "/tiktok-story-downloader", label: "TikTok Story", id: "tiktokStory" },
      { href: "/instagram-story-downloader", label: "Instagram Story", id: "instagramStory" },
      { href: "/instagram-reels-audio", label: "Reels Audio", id: "reelsAudio" },
      { href: "/facebook-reels-downloader", label: "Facebook Reels", id: "facebookReels" },
      { href: "/youtube-shorts-downloader", label: "YouTube Shorts", id: "youtubeShorts" },
    ],
  },
  {
    id: "languages",
    label: "Languages",
    // Indonesian first: it is the largest market in this category, so it is
    // the locale most likely to convert a visitor who does not read English.
    links: [
      { href: "/id", label: "Bahasa Indonesia" },
      { href: "/hi", label: "हिन्दी" },
      { href: "/vi", label: "Tiếng Việt" },
      { href: "/th", label: "ไทย" },
      { href: "/tl", label: "Filipino" },
      { href: "/ar", label: "العربية" },
      { href: "/es", label: "Español" },
      { href: "/de", label: "Deutsch" },
      { href: "/pt", label: "Português" },
    ],
  },
  {
    id: "product",
    label: "Product",
    links: [
      { href: "/guides", label: "Guides", id: "guides" },
      { href: "/#how", label: "How it works", id: "howItWorks" },
      { href: "/#faq", label: "FAQ", id: "faq" },
      { href: "/api/health", label: "API status", id: "apiStatus" },
    ],
  },
  {
    id: "company",
    label: "Company",
    // Commercial page first: it is the only link in this column that can turn
    // a visitor into income, so it should not sit under the legal entries.
    links: [
      { href: "/services", label: "Build services", id: "services" },
      { href: "/about", label: "About", id: "about" },
      { href: "/apps", label: "App & Extension", id: "apps" },
      { href: "/contact", label: "Contact & DMCA", id: "contact" },
    ],
  },
  // Highest-intent guides, sitewide. The below-the-fold matrices on the three
  // tool pages cover the rest with exact-match anchors.
  {
    id: "guides",
    label: "Guides",
    links: [
      {
        href: "/guides/download-tiktok-video-without-watermark",
        label: "No watermark",
        id: "guideNoWatermark",
      },
      // Distinct text from the /tiktok-mp3-downloader tool link above: Lighthouse
      // flags two links with the same name pointing at different pages
      // ("Identical links have the same purpose").
      {
        href: "/guides/download-tiktok-audio-as-mp3",
        label: "TikTok to MP3 Guide",
        id: "guideTiktokMp3",
      },
      {
        href: "/guides/tiktok-short-links-not-working",
        label: "Short links",
        id: "guideShortLinks",
      },
      {
        href: "/guides/how-to-download-instagram-reels-in-hd",
        label: "IG Reels HD",
        id: "guideIgReelsHd",
      },
      {
        href: "/guides/how-to-download-large-facebook-videos-in-1080p-hd",
        label: "Long FB videos",
        id: "guideLongFb",
      },
      {
        href: "/guides/browser-vs-app-tiktok-downloaders-safety",
        label: "Safety",
        id: "guideSafety",
      },
    ],
  },
  {
    id: "legal",
    label: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy", id: "privacy" },
      { href: "/terms", label: "Terms", id: "terms" },
    ],
  },
];

/**
 * Site footer. Pass `copy` on a localized page and every string below the
 * downloader — closing CTA, tagline, column headings, link labels, copyright and
 * the legal note — renders in that language. English pages pass nothing.
 *
 * Link destinations stay English on purpose: sub-tools, guides and the legal
 * pages exist only in one language, so a translated label would promise a
 * translated page that is not there. The four downloader links do point at the
 * English tool pages; the localized siblings are linked from the page body.
 */
export function SiteFooter({ copy }: { copy?: FooterCopy }) {
  const year = new Date().getFullYear();
  const copyright = (
    copy?.copyright ??
    "© {year} LAMP TIK. Not affiliated with TikTok, ByteDance, Instagram, Facebook, or Meta."
  ).replace("{year}", String(year));

  return (
    <footer className="relative border-t border-[var(--line)] pt-12">
      <div className="shell pb-8">
        {/* Closing CTA: one gradient panel, no second competing action. */}
        <div className="panel relative overflow-hidden p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full opacity-80"
            style={{
              background: "radial-gradient(closest-side, var(--mesh-b), transparent 72%)",
            }}
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="balance text-2xl font-semibold leading-tight tracking-headline sm:text-2xl">
                {copy?.cta.heading ?? "Save your next video in HD."}
              </h2>
              <p className="pretty mt-1.5 max-w-md text-sm leading-relaxed text-[var(--text-2)]">
                {copy?.cta.body ??
                  "Paste a link, get the original stream. No account, no app, nothing stored."}
              </p>
            </div>
            <Link
              href="/#tool"
              className="btn btn-primary group h-11 shrink-0 gap-2 px-5 text-sm font-semibold"
            >
              {copy?.cta.button ?? "Open the downloader"}
              <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-9 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)] lg:gap-12">
          <div className="max-w-xs">
            <Logo />
            <p className="pretty mt-4 text-sm leading-relaxed text-[var(--text-2)]">
              {copy?.tagline ??
                "Watermark-free TikTok, Instagram, Facebook & YouTube HD downloads. Paste a link, get the original stream. No account, no tracking of your downloads."}
            </p>
            <Link
              href="/api/health"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--field)] px-2.5 py-1 text-xs text-[var(--text-2)] transition-colors duration-200 hover:border-[var(--glass-border-hover)] hover:text-[var(--text)]"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--ok)]/60" />
                <span className="relative size-1.5 rounded-full bg-[var(--ok)]" />
              </span>
              {copy?.status ?? "All systems operational"}
            </Link>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5"
          >
            {FOOTER_GROUPS.map((group) => (
              <div key={group.id} className="flex min-w-0 flex-col gap-2.5">
                <span className="micro text-[var(--text-3)]">
                  {copy ? copy.groups[group.id] : group.label}
                </span>
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="w-fit text-sm text-[var(--text-2)] transition-colors duration-200 hover:text-[var(--text)]"
                  >
                    {link.id && copy ? copy.links[link.id] : link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="rule my-8" />

        <div className="flex flex-col gap-3 text-xs text-[var(--text-2)] sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <p className="pretty">{copyright}</p>
          <p className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-[var(--ok)]" />
            {copy?.legalNote ?? "Download only content you have the right to use."}
          </p>
        </div>

        <div className="mt-5 flex justify-center border-t border-[var(--line)] pt-4">
          <a
            href="https://github.com/mk6783336"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--field)] px-3.5 py-1.5 text-xs font-medium text-[var(--text)] transition-colors duration-200 hover:border-[var(--glass-border-hover)] hover:text-[var(--text)] sm:text-sm"
          >
            Developed with <span aria-hidden="true">⚡</span> by{" "}
            <span className="font-semibold text-[var(--text)]">SHAHID ZAIB</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

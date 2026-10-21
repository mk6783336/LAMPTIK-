"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/logo";

const FOOTER_LINKS = {
  Downloaders: [
    { href: "/", label: "TikTok Downloader" },
    { href: "/instagram-reels-downloader", label: "Instagram Reels" },
    { href: "/facebook-video-downloader", label: "Facebook HD" },
    { href: "/youtube-downloader", label: "YouTube HD (App)" },
  ],
  Product: [
    { href: "/app-download", label: "📱 Get App (YouTube HD)" },
    { href: "/guides", label: "Guides" },
    { href: "/#how", label: "How it works" },
    { href: "/#faq", label: "FAQ" },
    { href: "/api/health", label: "API status" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact & DMCA" },
  ],
  // Highest-intent guides, sitewide. The below-the-fold matrices on the three
  // tool pages cover the rest with exact-match anchors.
  Guides: [
    { href: "/guides/download-tiktok-video-without-watermark", label: "No watermark" },
    { href: "/guides/download-tiktok-audio-as-mp3", label: "TikTok to MP3" },
    { href: "/guides/tiktok-short-links-not-working", label: "Short links" },
    { href: "/guides/how-to-download-instagram-reels-in-hd", label: "IG Reels HD" },
    { href: "/guides/how-to-download-large-facebook-videos-in-1080p-hd", label: "Long FB videos" },
    { href: "/guides/browser-vs-app-tiktok-downloaders-safety", label: "Safety" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy policy" },
    { href: "/terms", label: "Terms" },
  ],
} as const;

export function SiteFooter() {
  return (
    <footer className="relative border-t border-[var(--line)] pt-12">
      <div className="shell pb-8">
        {/* Closing CTA: one gradient panel, no second competing action. */}
        <div className="panel relative overflow-hidden p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full opacity-80"
            style={{
              background:
                "radial-gradient(closest-side, var(--mesh-b), transparent 72%)",
            }}
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="balance text-[1.35rem] font-semibold leading-tight tracking-headline sm:text-2xl">
                Save your next video in HD.
              </h2>
              <p className="pretty mt-1.5 max-w-md text-[13.5px] leading-relaxed text-[var(--text-2)]">
                Paste a link, get the original stream. No account, no app, nothing stored.
              </p>
            </div>
            <Link
              href="/#tool"
              className="btn btn-primary group h-11 shrink-0 gap-2 px-5 text-[13.5px] font-semibold"
            >
              Open the downloader
              <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-9 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)] lg:gap-12">
          <div className="max-w-xs">
            <Logo />
            <p className="pretty mt-4 text-[12.5px] leading-relaxed text-[var(--text-2)]">
              Watermark-free TikTok, Instagram, Facebook &amp; YouTube HD downloads. Paste a link, get
              the original stream. No account, no tracking of your downloads.
            </p>
            <Link
              href="/api/health"
              className="mt-4 inline-flex items-center gap-2 rounded-pill border border-[var(--glass-border)] bg-[var(--field)] px-2.5 py-1 text-[11px] text-[var(--text-2)] transition-colors duration-200 hover:border-[var(--glass-border-hover)] hover:text-[var(--text)]"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--ok)]/60" />
                <span className="relative size-1.5 rounded-full bg-[var(--ok)]" />
              </span>
              All systems operational
            </Link>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-4"
          >
            {Object.entries(FOOTER_LINKS).map(([group, links]) => (
              <div key={group} className="flex min-w-0 flex-col gap-2.5">
                <span className="micro text-[var(--text-3)]">{group}</span>
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="w-fit text-[13px] text-[var(--text-2)] transition-colors duration-200 hover:text-[var(--text)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="rule my-8" />

        <div className="flex flex-col gap-3 text-[11.5px] text-[var(--text-3)] sm:flex-row sm:items-center sm:justify-between">
          <p className="pretty">
            © {new Date().getFullYear()} LAMP TIK. Not affiliated with TikTok, ByteDance,
            Instagram, Facebook, or Meta.
          </p>
          <p className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-[var(--ok)]" />
            Download only content you have the right to use.
          </p>
        </div>
      </div>
    </footer>
  );
}

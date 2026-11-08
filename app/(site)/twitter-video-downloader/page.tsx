import type { Metadata } from "next";

import { AdSlot } from "@/components/ads/AdSlot";
import { AmbientBackground } from "@/components/ambient-background";
import { CreatorToolkitBar } from "@/components/creator-toolkit-bar";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TwitterDownloader } from "@/components/twitter-downloader";
import { pageAlternates, siteUrl } from "@/lib/site";

/**
 * /twitter-video-downloader — the fifth platform page.
 *
 * Built after the Tier-1 keyword pull: "twitter video downloader" and
 * "x video downloader" show up in all six target markets (US, GB, CA, AU, DE,
 * NL), and the four existing platform pages had no surface for either. See
 * docs/tier-1-keyword-map.md.
 *
 * It is a standalone route rather than a fifth `PlatformPage` because X has no
 * audio track to offer and returns several renditions instead of one video —
 * the shared panel is built for the other shape.
 */

/** ≤60 chars, keyword first. */
const TITLE = "Twitter Video Downloader - Save X Videos & GIFs in 1080p";
const SOCIAL_TITLE = "Twitter (X) Video Downloader — MP4 in 1080p, No Login";
const DESCRIPTION =
  "Download Twitter (X) videos and GIFs as MP4 — pick 1080p, 720p or 480p and save straight to your device. Free, no login, no app, no watermark.";

const FAQS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "How do I download a video from X (Twitter)?",
    answer:
      "Copy the link to the post — not the profile — and paste it above. The page resolves the post, lists every MP4 rendition X published, and hands the one you pick to your browser's download manager.",
  },
  {
    question: "Can I download a video from a private or protected X account?",
    answer:
      "No. A protected account's media is only served to its approved followers, so there is nothing public for the resolver to read. Public posts from any account work, including posts that quote another video.",
  },
  {
    question: "What quality is available?",
    answer:
      "Whatever X published for that post, up to 1080p. Short clips are sometimes uploaded only at 480p or 720p, in which case those are the buttons shown — there is no higher stream to offer.",
  },
  {
    question: "Do GIFs download as GIF files?",
    answer:
      "X converts GIFs to looping MP4 before it stores them, so a GIF downloads as an MP4 that loops with no sound. That is the exact file the platform serves; a real .gif would be a re-encode.",
  },
  {
    question: "Is there a watermark or do I need an account?",
    answer:
      "No watermark and no account. The file is the rendition X itself serves to its own player, straight from video.twimg.com.",
  },
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "Twitter video downloader",
    "twitter gif saver",
    "twitter gif converter",
    "twitter gif downloader iphone",
    "twitter gif to mp4",
    "X video downloader",
    "download Twitter video MP4",
    "twitter video download 1080p",
    "X video download HD",
    "download Twitter GIF",
    "save X video without login",
    "twitter video downloader no watermark",
  ],
  alternates: pageAlternates("/twitter-video-downloader"),
  openGraph: {
    type: "website",
    url: `${siteUrl}/twitter-video-downloader`,
    siteName: "LAMP TIK",
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SOCIAL_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

const STEPS: ReadonlyArray<[string, string]> = [
  [
    "Copy the post link",
    "Open the post on x.com or in the app, tap Share → Copy link. The URL contains /status/ followed by the post id.",
  ],
  [
    "Paste it above",
    "The resolver reads the post, not the page HTML — so it works the same on a phone and on a desktop.",
  ],
  [
    "Pick a quality",
    "Every MP4 X published is listed best-first. Tap the one you want and your browser downloads it.",
  ],
];

export default function TwitterVideoDownloaderPage() {
  const pageUrl = `${siteUrl}/twitter-video-downloader`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${pageUrl}/#app`,
        name: "Twitter (X) Video Downloader",
        url: pageUrl,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Any",
        inLanguage: "en",
        isPartOf: { "@id": `${siteUrl}/#website` },
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: DESCRIPTION,
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}/#faq`,
        mainEntity: FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}/#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Tools", item: `${siteUrl}/tools` },
          {
            "@type": "ListItem",
            position: 3,
            name: "Twitter / X video",
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="relative min-h-dvh overflow-x-clip">
        <AmbientBackground />
        <SiteHeader />

        <main id="main">
          <section className="section-pad">
            <div className="shell">
              <Breadcrumb
                trail={[
                  { name: "Home", href: "/" },
                  { name: "Tools", href: "/tools" },
                  { name: "Twitter / X video" },
                ]}
              />

              <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
                <div className="min-w-0">
                  <p className="eyebrow">
                    <span aria-hidden="true" className="eyebrow-dot" />
                    Twitter / X downloader
                  </p>
                  <h1 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                    Twitter video downloader,{" "}
                    <span className="text-[var(--accent-text)]">straight to MP4.</span>
                  </h1>
                  <p className="pretty mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
                    Paste a link to any x.com or twitter.com post and download its video or
                    GIF in the quality X published it — up to 1080p, no watermark, no
                    account, no app. The file goes straight to your browser&apos;s download
                    manager.
                  </p>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {["x.com + twitter.com", "up to 1080p", "GIFs as MP4", "no login"].map(
                      (chip) => (
                        <li key={chip} className="tool-pill">
                          {chip}
                        </li>
                      ),
                    )}
                  </ul>
                </div>

                <div className="min-w-0">
                  <TwitterDownloader />
                  <CreatorToolkitBar className="mt-3" />
                </div>
              </div>

              <div className="mt-10">
                <AdSlot slot="under-tool" format="leaderboard" label="Advertisement" />
              </div>
            </div>
          </section>

          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <h2 className="balance text-3xl font-semibold leading-tight tracking-headline">
                Three taps, no account.
              </h2>
              <ol className="mt-8 grid gap-3.5 sm:grid-cols-3">
                {STEPS.map(([title, body], index) => (
                  <li key={title} className="bento-card flex flex-col">
                    <span className="font-mono text-xs tabular-nums text-[var(--text-3)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-3 text-base font-semibold tracking-tight">{title}</h3>
                    <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                      {body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="faq" className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <h2 className="balance text-3xl font-semibold leading-tight tracking-headline">
                Questions about X downloads.
              </h2>
              <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
                {FAQS.map((faq) => (
                  <div key={faq.question} className="bento-card">
                    <h3 className="text-base font-semibold leading-snug tracking-tight">
                      {faq.question}
                    </h3>
                    <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

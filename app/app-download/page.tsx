import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  Download,
  Lock,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Youtube,
  Zap,
} from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { VideoAdUnit } from "@/components/ads/VideoAdUnit";
import { AmbientBackground } from "@/components/ambient-background";
import { AppInstallHero } from "@/components/app-install-hero";
import { ConsentBar } from "@/components/consent-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  breadcrumbNode,
  JsonLd,
  organizationNode,
  websiteNode,
} from "@/components/seo/JsonLd";
import { adsterraRectangleKey, monetagSmartlinkUrl } from "@/lib/monetization";
import { androidApp, pageAlternates, siteConfig, siteUrl } from "@/lib/site";

const TITLE = `LAMP TIK for Android (Official APK v${androidApp.version}) — Free HD Video Downloader`;
const DESCRIPTION = `Download the official LAMP TIK Android APK (v${androidApp.version}, ${androidApp.sizeLabel}): a real native app with built-in YouTube 1080p & MP3 downloader, watermark-free TikTok, Instagram Reels & Facebook HD downloads, and direct background saving to your phone gallery. 100% free, no Play Store needed.`;

export const metadata: Metadata = {
  title: "LAMP TIK for Android (Official APK) — Free Download",
  description: DESCRIPTION,
  keywords: [
    "LAMP TIK APK download",
    "LAMP TIK for Android official APK",
    "TikTok downloader APK Android",
    "YouTube 1080p downloader Android APK",
    "Instagram Reels downloader APK",
    "Facebook video downloader Android app",
    "YouTube to MP3 Android app",
  ],
  alternates: pageAlternates("/app-download"),
  openGraph: {
    type: "website",
    url: `${siteUrl}/app-download`,
    siteName: siteConfig.name,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

const APP_FEATURES = [
  {
    emoji: "🎬",
    title: "Built-in YouTube 1080p & MP3 Downloader",
    body: "Full HD 1080p/720p YouTube videos, Shorts, and high-bitrate MP3 audio download natively inside the app — no browser switching, no limits.",
  },
  {
    emoji: "⚡",
    title: "TikTok, Instagram Reels & Facebook HD",
    body: "Save original 1080p MP4 streams with zero watermark from TikTok, Instagram Reels, and Facebook Watch in one tap.",
  },
  {
    emoji: "🚀",
    title: "Direct Background Downloads",
    body: "Hardware-accelerated Android download manager saves MP4 and MP3 files straight to your phone's Downloads and Gallery.",
  },
  {
    emoji: "🔒",
    title: "No Play Store Needed",
    body: `Direct official signed APK installation — ${androidApp.sizeLabel} of native Android code and art, no Google account required, no bloatware, 100% free forever.`,
  },
] as const;

const INSTALL_STEPS = [
  {
    title: "Tap “Download LAMP TIK APK” above",
    body: `Tap the primary download button at the top of this page to save the official signed ${androidApp.downloadName} file (${androidApp.sizeLabel}) to your phone.`,
  },
  {
    title: "Open the downloaded .apk file",
    body: `Tap the download complete notification in your Android notification bar, or open ${androidApp.downloadName} from your phone's Downloads folder.`,
  },
  {
    title: "Tap “Install” and launch LAMP TIK",
    body: "Tap Install (allow “Install unknown apps” if prompted by Android) and open LAMP TIK from your home screen — the native downloader is ready immediately.",
  },
] as const;

const FAQS = [
  {
    question: "Is the LAMP TIK Android APK 100% free and safe?",
    answer:
      "Yes — 100% free forever with no subscriptions or hidden fees. The official APK is cryptographically signed (v1/v2 signature) and only requests internet and file download access so your MP4 and MP3 files save straight to your phone.",
  },
  {
    question: "Why does Android ask to allow “Install unknown apps”?",
    answer:
      "Android shows this standard prompt whenever you install an official APK directly from your browser instead of the Google Play Store. Tap Settings → Allow from this source → Install.",
  },
  {
    question: "Does the app unlock anything the website does not?",
    answer:
      "No — YouTube, TikTok, Instagram Reels and Facebook downloads all work in any browser for free. The APK simply adds native share-sheet hand-off, background downloads straight to your gallery, and a built-in download list.",
  },
  {
    question: "Can iPhone users install LAMP TIK too?",
    answer:
      "Yes! On iPhone or iPad, tap the secondary “Install Instant Web App (1-Tap)” button above or use Safari → Share → Add to Home Screen to launch LAMP TIK in full-screen App Mode.",
  },
] as const;

export default function AppDownloadPage() {
  const pageUrl = `${siteUrl}/app-download`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "MobileApplication",
        "@id": `${pageUrl}#software`,
        name: "LAMP TIK for Android (Official APK)",
        url: pageUrl,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Android 7.0+",
        softwareVersion: androidApp.version,
        fileSize: androidApp.sizeLabel,
        downloadUrl: `${siteUrl}/downloads/${androidApp.fileName}`,
        installUrl: `${siteUrl}/api/apk`,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        isAccessibleForFree: true,
        inLanguage: "en",
        description: DESCRIPTION,
        featureList: [
          "Built-in YouTube 1080p & MP3 Downloader",
          "TikTok, Instagram Reels & Facebook HD without watermark",
          "Direct background downloads to phone gallery",
          "No Play Store needed — official signed APK",
        ],
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "HowTo",
        "@id": `${pageUrl}#howto-android`,
        name: "How to install LAMP TIK APK on Android",
        description:
          "Download and install the official LAMP TIK Android APK in 3 simple steps.",
        totalTime: "PT1M",
        step: INSTALL_STEPS.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.title,
          text: step.body,
          url: `${pageUrl}#install-steps`,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        url: pageUrl,
        inLanguage: "en",
        mainEntity: FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
      breadcrumbNode(`${pageUrl}#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: "Download Android APK", url: pageUrl },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <AmbientBackground />
      <ConsentBar />

      <div className="flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">
          <div className="shell pb-20 pt-10 sm:pt-12">
            {/* Hero Section — TubeMate / SnapTube style consumer APK download hub */}
            <section className="panel relative overflow-hidden p-6 text-center sm:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/70 to-transparent"
              />

              {/* Official App Icon */}
              <div className="mx-auto grid size-20 place-items-center rounded-2xl border border-white/20 bg-[linear-gradient(150deg,#22d3ee_0%,#3b82f6_52%,#6366f1_100%)] text-white shadow-[0_18px_42px_-12px_rgba(34,211,238,0.75),inset_0_1px_0_rgba(255,255,255,0.45)]">
                <Zap className="size-10" fill="currentColor" strokeWidth={0} />
              </div>

              {/* Version & Security Badges. Two short chips instead of one
                  long nowrap pill: at 320-390px the single line used to run
                  off both edges of the viewport and paint stray borders. */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 px-1">
                <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--field)] px-3 py-1.5 text-center text-xs text-[var(--text-2)]">
                  <ShieldCheck className="size-3.5 shrink-0 text-[var(--ok)]" />
                  Version 3.0 · Official Signed App
                </span>
                <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--field)] px-3 py-1.5 text-center text-xs text-[var(--text-2)]">
                  Android 7.0+ · 100% Free
                </span>
              </div>

              <h1 className="balance mx-auto mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-headline sm:text-5xl">
                LAMP TIK for Android (Official APK)
              </h1>

              <p className="pretty mx-auto mt-3 max-w-xl text-base leading-relaxed text-[var(--text-2)]">
                The all-in-one HD video &amp; MP3 downloader for Android. Save TikTok, Instagram
                Reels, Facebook Watch, and <strong className="text-[var(--text)]">YouTube 1080p &amp; MP3</strong> straight to your phone gallery.
              </p>

              {/* Primary + Secondary Download Buttons */}
              <div className="mt-7 flex justify-center">
                <AppInstallHero />
              </div>

              {/* Native YouTube perk banner */}
              <div
                id="youtube-perk"
                className="mx-auto mt-7 flex max-w-xl scroll-mt-24 items-start gap-3 rounded-2xl border border-[#ff0033]/35 bg-[#ff0033]/[0.08] p-4 text-left"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ff0033]/15 text-[#ff5c7a]">
                  <Youtube className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">
                    🎬 Built-in YouTube 1080p/720p &amp; MP3 Downloader
                  </p>
                  <p className="pretty mt-1 text-sm leading-relaxed text-[var(--text-2)]">
                    Open LAMP TIK and YouTube downloads run natively inside the app: Full HD
                    videos, Shorts, and 320kbps MP3 audio, saved straight to your gallery.{" "}
                    <Link
                      href="/youtube-downloader?app=android_apk"
                      className="font-semibold text-[var(--accent-text)] underline-offset-4 hover:underline"
                    >
                      Open YouTube Downloader →
                    </Link>
                  </p>
                </div>
              </div>

              {/* Quick Package Specs */}
              <dl className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { icon: <Smartphone className="size-3.5" />, term: "Package", value: `${androidApp.downloadName} · ${androidApp.sizeLabel}` },
                  { icon: <ShieldCheck className="size-3.5" />, term: "Signature", value: "v1/v2 Verified" },
                  { icon: <Rocket className="size-3.5" />, term: "Requires", value: "Android 7.0+" },
                  { icon: <Check className="size-3.5" />, term: "License", value: "100% Free" },
                ].map((fact) => (
                  <div
                    key={fact.term}
                    className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-3 py-2.5"
                  >
                    <dt className="flex items-center justify-center gap-1 text-[var(--text-3)]">
                      <span className="text-[var(--accent-text)]">{fact.icon}</span>
                      <span className="micro text-xs">{fact.term}</span>
                    </dt>
                    <dd className="mt-0.5 break-words text-sm font-semibold leading-snug">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Outstream Video Ad + High-RPM 300x250 & 728x90 Ad Units */}
            <div className="mt-8">
              <VideoAdUnit />
            </div>

            {/* Why Use the LAMP TIK App? (4 Clean Cards) */}
            <section className="seo-section mt-10">
              <div className="text-center sm:text-left">
                <p className="eyebrow justify-center sm:justify-start">
                  <span aria-hidden="true" className="eyebrow-dot" />
                  Built for Android
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-headline sm:text-4xl">
                  Why Use the LAMP TIK App?
                </h2>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {APP_FEATURES.map((feature) => (
                  <article
                    key={feature.title}
                    className="panel flex items-start gap-4 p-5 transition-colors duration-200 hover:border-[var(--glass-border-hover)]"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[var(--glass-border)] bg-[var(--field)] text-2xl"
                    >
                      {feature.emoji}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="pretty mt-1.5 text-sm leading-relaxed text-[var(--text-2)]">
                        {feature.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Simple 3-Step Visual Android Install Guide */}
            <section id="install-steps" className="seo-section mt-10 scroll-mt-24">
              <div className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">
                      <span aria-hidden="true" className="eyebrow-dot" />
                      3-step Android install guide
                    </p>
                    <h2 className="mt-2.5 text-2xl font-semibold tracking-headline sm:text-4xl">
                      How to Install LAMP TIK APK on Android
                    </h2>
                  </div>
                  <a
                    href={`/downloads/${androidApp.fileName}`}
                    download={androidApp.downloadName}
                    className="btn btn-primary h-10 gap-2 px-4 text-sm font-semibold"
                  >
                    <Download className="size-4" />
                    Download APK (v{androidApp.version} · {androidApp.sizeLabel})
                  </a>
                </div>

                <ol className="mt-6 grid gap-4 md:grid-cols-3">
                  {INSTALL_STEPS.map((step, index) => (
                    <li
                      key={step.title}
                      className="relative flex flex-col justify-between rounded-2xl border border-[var(--glass-border)] bg-[var(--field)] p-5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            aria-hidden="true"
                            className="grid size-9 place-items-center rounded-full bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent-text)]"
                          >
                            {index + 1}
                          </span>
                          <span className="micro text-xs text-[var(--text-3)]">
                            STEP {index + 1} OF 3
                          </span>
                        </div>
                        <p className="mt-3.5 text-base font-semibold tracking-tight">
                          {step.title}
                        </p>
                        <p className="pretty mt-1.5 text-sm leading-relaxed text-[var(--text-2)]">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* High-RPM Rectangle + Direct Sponsor Card */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:items-stretch">
                <AdSlot
                  format="rectangle"
                  zoneId={adsterraRectangleKey}
                  label="Sponsored — keeps LAMP TIK free"
                />
                <a
                  href={monetagSmartlinkUrl}
                  target="_blank"
                  rel="sponsored nofollow noopener"
                  className="group flex flex-col justify-between rounded-2xl border border-[var(--glass-border)] bg-[var(--field)] p-5 transition-colors duration-200 hover:border-[var(--glass-border-hover)]"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-text)] transition-transform duration-200 group-hover:scale-110">
                      <Sparkles className="size-5" />
                    </span>
                    <div className="min-w-0 text-left">
                      <span className="micro text-xs text-[var(--accent-text)]">
                        Ad · Sponsored partner
                      </span>
                      <span className="mt-1 block text-base font-semibold tracking-tight">
                        High-Speed Unlimited Cloud Video Saver
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-[var(--text-2)]">
                        Tap to visit our sponsor — supports free 1080p YouTube &amp; TikTok servers
                        for all LAMP TIK users.
                      </span>
                    </div>
                  </div>
                  <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3.5 py-1.5 text-sm font-semibold text-[var(--accent-text)]">
                    Open Sponsor Offer →
                  </span>
                </a>
              </div>
            </section>

            {/* Quick Links & FAQ */}
            <section className="seo-section mt-10">
              <h2 className="text-2xl font-semibold tracking-headline sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <div className="mt-4 space-y-3">
                {FAQS.map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-4"
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold tracking-tight">
                      {faq.question}
                    </summary>
                    <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={`/downloads/${androidApp.fileName}`}
                  download={androidApp.downloadName}
                  className="btn btn-primary tool-cta h-11 gap-2 px-5 text-sm font-semibold"
                >
                  <Download className="size-4" />
                  ⬇ Download LAMP TIK APK v{androidApp.version} ({androidApp.sizeLabel})
                </a>
                <Link
                  href="/youtube-downloader"
                  className="btn btn-primary h-11 gap-2 px-5 text-sm font-semibold"
                >
                  <Youtube className="size-4" />
                  Open YouTube 1080p Downloader
                </Link>
                <Link href="/#tool" className="btn btn-ghost h-11 gap-2 px-5 text-sm">
                  <Lock className="size-3.5" />
                  TikTok / Reels / Facebook Downloader
                </Link>
              </div>
            </section>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

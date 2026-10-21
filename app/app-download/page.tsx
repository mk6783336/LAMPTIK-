import type { Metadata } from "next";
import Link from "next/link";
import { BellPlus, Check, Download, MonitorPlay, Music2, ShieldCheck, Smartphone, Youtube, Zap } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
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
import { pageAlternates, siteConfig, siteUrl } from "@/lib/site";

const TITLE = "Download LAMP TIK Mobile App (Android & iOS) — Free HD Video Downloader";
const DESCRIPTION =
  "Install the LAMP TIK web app on Android (Chrome/Edge), iPhone/iPad (Safari) or PC: watermark-free TikTok, Instagram Reels & Facebook downloads plus App-Exclusive YouTube 1080p/720p & MP3 — from your home screen. Free, no app store, no sign-up.";

export const metadata: Metadata = {
  title: "Download App — Install on Android & iPhone",
  description: DESCRIPTION,
  keywords: [
    "LAMP TIK app download",
    "TikTok downloader app Android",
    "TikTok downloader iPhone install",
    "add LAMP TIK to home screen",
    "install web app TikTok downloader",
    "Instagram Reels downloader app",
    "YouTube HD downloader app exclusive",
    "YouTube Shorts downloader 1080p",
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

const ANDROID_STEPS = [
  {
    title: "Open lamptik.online in Chrome or Edge",
    body: "On your Android phone, open the Chrome (or Edge) browser and go to lamptik.online. The site works instantly — nothing to download first.",
  },
  {
    title: "Tap the browser menu ⁝",
    body: "Tap the three-dot menu in the top-right corner of Chrome (or the bottom menu in Edge) to open browser options.",
  },
  {
    title: "Select “Install app” or “Add to Home screen”",
    body: "Choose “Install app” (Chrome) or “Add to Home screen” (Edge), then confirm. The LAMP TIK icon lands on your home screen and launches full-screen like a native app.",
  },
] as const;

const IOS_STEPS = [
  {
    title: "Open lamptik.online in Safari",
    body: "On your iPhone or iPad, open Safari (installation only works from Safari, not Chrome on iOS) and visit lamptik.online.",
  },
  {
    title: "Tap the Share button at the bottom",
    body: "Tap the Share icon (the square with an arrow pointing up ⎋) in Safari's bottom toolbar to open the share sheet.",
  },
  {
    title: "Scroll down and tap “Add to Home Screen”",
    body: "Scroll the share sheet down, tap “Add to Home Screen”, rename it if you like, then tap Add. LAMP TIK now opens from your home screen in standalone mode.",
  },
] as const;

const PC_STEPS = [
  {
    title: "Open lamptik.online in Chrome or Edge",
    body: "On your Windows, Mac or Linux PC, open Chrome or Edge and visit lamptik.online — no Play Store or download needed.",
  },
  {
    title: "Click the Install icon in the address bar",
    body: "Click the install/computer icon at the right end of the address bar — or open the browser menu ⁝ and choose “Install LAMP TIK…” / “Apps → Install”.",
  },
  {
    title: "Confirm and pin it",
    body: "Confirm Install, then pin LAMP TIK to your taskbar or dock. It opens in its own window and unlocks App Mode with YouTube HD.",
  },
] as const;

const FAQS = [
  {
    question: "Is the LAMP TIK app free?",
    answer:
      "Yes — 100% free, forever. TikTok, Instagram and Facebook downloads are free for everyone; installing the app additionally unlocks the YouTube 1080p / 720p / MP3 downloader at no cost.",
  },
  {
    question: "Do I need the Play Store or App Store?",
    answer:
      "No. LAMP TIK is a lightweight web app: on Android use Chrome or Edge menu → Install app; on iPhone use Safari Share → Add to Home Screen; on PC use the install icon in the Chrome/Edge address bar.",
  },
  {
    question: "Why is the YouTube downloader app-exclusive?",
    answer:
      "YouTube streams are heavier and costlier to resolve (1080p renditions, long videos, bot checks). Gating them behind the installed app keeps abuse down so unlimited YouTube HD & MP3 downloads stay free for real users.",
  },
  {
    question: "Does the app work on PC too?",
    answer:
      "Yes. Install it from Chrome or Edge on Windows, Mac or Linux and it runs in its own window with App Mode unlocked — including the YouTube 1080p downloader.",
  },
  {
    question: "Is installing safe? What permissions does it need?",
    answer:
      "Installing only adds a home-screen icon that opens lamptik.online full-screen. It never asks for photo, contact or storage permissions, and the app itself is kilobytes — it updates automatically with the site.",
  },
] as const;

function StepList({ steps, start }: { steps: readonly { title: string; body: string }[]; start: number }) {
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="flex gap-3.5 rounded-[14px] border border-[var(--glass-border)] bg-[var(--field)] p-4"
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] font-mono text-[13px] font-bold text-[var(--accent-text)]"
          >
            {start + index}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold tracking-tight">{step.title}</p>
            <p className="pretty mt-1 text-[13px] leading-relaxed text-[var(--text-2)]">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function AppDownloadPage() {
  const pageUrl = `${siteUrl}/app-download`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      websiteNode(),
      {
        "@type": "SoftwareApplication",
        "@id": `${pageUrl}#software`,
        name: "LAMP TIK — TikTok Video Downloader",
        url: pageUrl,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Android, iOS, Windows, macOS, Linux, Web",
        downloadUrl: `${siteUrl}/downloads/lamp-tik-v2.1.apk`,
        softwareVersion: "2.1",
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
          "Watermark-free TikTok HD downloads",
          "Instagram Reels HD downloads",
          "Facebook video downloads",
          "App-Exclusive YouTube 1080p / 720p / MP3 downloader",
          "Installable PWA — Android, iOS & PC home screen",
          "No app store, no sign-up",
        ],
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "HowTo",
        "@id": `${pageUrl}#howto-android`,
        name: "How to install LAMP TIK on Android (Chrome / Edge)",
        description:
          "Add LAMP TIK to your Android home screen in three taps — no Play Store needed.",
        totalTime: "PT1M",
        step: ANDROID_STEPS.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.title,
          text: step.body,
          url: `${pageUrl}#install-steps`,
        })),
      },
      {
        "@type": "HowTo",
        "@id": `${pageUrl}#howto-ios`,
        name: "How to install LAMP TIK on iPhone / iPad (Safari)",
        description:
          "Add LAMP TIK to your iPhone home screen via Safari's Add to Home Screen in three taps.",
        totalTime: "PT1M",
        step: IOS_STEPS.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.title,
          text: step.body,
          url: `${pageUrl}#install-steps`,
        })),
      },
      {
        "@type": "HowTo",
        "@id": `${pageUrl}#howto-pc`,
        name: "How to install LAMP TIK on PC (Chrome / Edge)",
        description:
          "Install LAMP TIK as a desktop app from the Chrome or Edge address bar — no download needed.",
        totalTime: "PT1M",
        step: PC_STEPS.map((step, index) => ({
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
        { name: "Download App", url: pageUrl },
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
          <div className="shell pb-20 pt-10 sm:pt-14">
            {/* Hero */}
            <section className="panel relative overflow-hidden p-6 text-center sm:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/70 to-transparent"
              />
              <p className="tool-badge mx-auto w-fit">
                <Smartphone className="size-3.5" />
                Free web app · Android & iOS & PC
              </p>
              <h1 className="balance mx-auto mt-4 max-w-2xl text-[2rem] font-semibold leading-tight tracking-headline sm:text-[2.6rem]">
                Download LAMP TIK Mobile App (Android &amp; iOS)
              </h1>
              <p className="pretty mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-[var(--text-2)]">
                Get instant access to watermark-free TikTok, Instagram Reels, and Facebook
                video downloads straight from your home screen.
              </p>

              {/* App-Exclusive YouTube perk */}
              <div
                id="youtube-perk"
                className="mx-auto mt-5 flex max-w-xl scroll-mt-24 items-start gap-3 rounded-[16px] border border-[#ff0033]/30 bg-[#ff0033]/[0.07] p-4 text-left"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ff0033]/15 text-[#ff5c7a]">
                  <Youtube className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold tracking-tight">
                    🔥 Exclusive in App: Full HD 1080p/720p YouTube Video, Shorts &amp; MP3 Downloader!
                  </p>
                  <p className="pretty mt-1 text-[12.5px] leading-relaxed text-[var(--text-2)]">
                    Install the free app once to unlock unlimited YouTube 1080p, 720p, 360p and
                    MP3 downloads — Shorts and long videos included.{" "}
                    <Link
                      href="/youtube-downloader"
                      className="font-semibold text-[var(--accent-text)] underline-offset-4 hover:underline"
                    >
                      Open the YouTube downloader →
                    </Link>
                  </p>
                </div>
              </div>

              {/* Real APK download — primary App Hub action alongside the PWA installer */}
              <div className="mx-auto mt-6 flex max-w-xl flex-col items-center gap-2.5">
                <a
                  href="/downloads/lamp-tik-v2.1.apk"
                  download="lamp-tik-v2.1.apk"
                  className="btn tool-cta group h-[60px] w-full gap-2.5 px-6 text-[16px] font-semibold sm:w-auto sm:min-w-[340px]"
                >
                  <Download className="size-5 transition-transform duration-200 group-hover:translate-y-0.5" />
                  Download LAMP TIK APK (v2.1)
                </a>
                <p className="text-[12px] text-[var(--text-3)]">
                  Free · Android 8.0+ · ~1 KB setup wrapper · unlocks YouTube HD in the app
                </p>
              </div>

              <div className="mt-6 flex justify-center">
                <AppInstallHero />
              </div>
              <dl className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-2">
                {[
                  { icon: <Zap className="size-3.5" />, term: "Price", value: "Free" },
                  { icon: <ShieldCheck className="size-3.5" />, term: "Watermark", value: "Never" },
                  { icon: <Check className="size-3.5" />, term: "Sign-up", value: "None" },
                ].map((fact) => (
                  <div
                    key={fact.term}
                    className="rounded-[12px] border border-[var(--glass-border)] bg-[var(--field)] px-2 py-2.5"
                  >
                    <dt className="flex items-center justify-center gap-1 text-[var(--text-3)]">
                      <span className="text-[var(--accent-text)]">{fact.icon}</span>
                      <span className="micro text-[10px]">{fact.term}</span>
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-semibold">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* High-value leaderboard directly below the hero */}
            <div className="mt-6">
              <AdSlot format="leaderboard" label="Sponsored — download partner" />
            </div>

            {/* Installation guides */}
            <section id="install-steps" className="seo-section mt-10 scroll-mt-24">
              <h2 className="text-[1.5rem] font-semibold tracking-headline sm:text-[1.8rem]">
                Install in 3 taps — pick your device
              </h2>
              <p className="pretty mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[var(--text-2)]">
                LAMP TIK is a lightweight web app: no app-store download, no storage
                permission, no updates to manage. Follow the steps for your device —
                under a minute, free forever.
              </p>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <article className="panel p-5 sm:p-6">
                  <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
                    <span className="tool-pill">Android</span>
                    Chrome / Edge users
                  </h3>
                  <StepList steps={ANDROID_STEPS} start={1} />
                </article>

                <article className="panel p-5 sm:p-6">
                  <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
                    <span className="tool-pill">iPhone / iPad</span>
                    Safari users
                  </h3>
                  <StepList steps={IOS_STEPS} start={1} />
                </article>
              </div>

              <article className="panel mt-5 p-5 sm:p-6">
                <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
                  <span className="tool-pill">PC</span>
                  Windows / Mac / Linux (Chrome / Edge)
                </h3>
                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  {PC_STEPS.map((step, index) => (
                    <div
                      key={step.title}
                      className="rounded-[14px] border border-[var(--glass-border)] bg-[var(--field)] p-4"
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-8 place-items-center rounded-full bg-[var(--accent-soft)] font-mono text-[13px] font-bold text-[var(--accent-text)]"
                      >
                        {index + 1}
                      </span>
                      <p className="mt-2.5 text-[14px] font-semibold tracking-tight">{step.title}</p>
                      <p className="pretty mt-1 text-[12.5px] leading-relaxed text-[var(--text-2)]">
                        {step.body}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              {/* Attention-peak monetization: rectangle + honest sponsor card */}
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
                  className="group flex items-center gap-3 rounded-[16px] border border-[var(--glass-border)] bg-[var(--field)] p-4 transition-colors duration-200 hover:border-[var(--glass-border-hover)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] transition-transform duration-200 group-hover:scale-110">
                    <BellPlus className="size-5" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-[14px] font-semibold tracking-tight">
                      Support free HD downloads — visit sponsor
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[var(--text-3)]">
                      Sponsored · opens in a new tab, never blocks your download
                    </span>
                  </span>
                </a>
              </div>
            </section>

            {/* SEO blog/guide hub */}
            <section className="seo-section mt-12">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                installation guide
              </p>
              <h2 className="balance mt-4 max-w-2xl text-[1.6rem] font-semibold leading-tight tracking-headline sm:text-[2rem]">
                How to Download &amp; Install the LAMP TIK App on Android, iPhone, and PC
                (No Play Store Needed)
              </h2>
              <div className="pretty mt-4 max-w-3xl space-y-4 text-[13.5px] leading-relaxed text-[var(--text-2)]">
                <p>
                  LAMP TIK is a progressive web app (PWA): instead of a 100MB store download
                  that begs for photo and contact permissions, you install a featherweight
                  home-screen icon that opens lamptik.online full-screen. It updates itself
                  with the site, uses kilobytes of storage, and works on Android, iPhone,
                  iPad, Windows, Mac and Linux.
                </p>
                <h3 className="text-[16px] font-semibold tracking-tight text-[var(--text)]">
                  On Android (Chrome / Edge)
                </h3>
                <p>
                  Open lamptik.online in Chrome, tap the ⁝ menu, and choose “Install app”.
                  In Edge, the same option lives under “Add to Home screen”. Confirm once and
                  the LAMP TIK bolt appears in your app drawer — launching it opens the
                  downloader instantly, signed in to nothing, with App Mode already unlocked
                  for the YouTube HD downloader.
                </p>
                <h3 className="text-[16px] font-semibold tracking-tight text-[var(--text)]">
                  On iPhone &amp; iPad (Safari)
                </h3>
                <p>
                  Apple only allows installation from Safari: open this page in Safari, tap
                  the Share button ⎋ in the bottom toolbar, scroll down and tap “Add to Home
                  Screen”. After adding, open LAMP TIK from the new icon at least once — that
                  first standalone launch enables App Mode and unlocks YouTube 1080p/720p
                  and MP3 downloads on your iPhone.
                </p>
                <h3 className="text-[16px] font-semibold tracking-tight text-[var(--text)]">
                  On PC (Windows / Mac / Linux)
                </h3>
                <p>
                  In Chrome or Edge, look for the install icon at the right end of the
                  address bar (or open the ⁝ menu → “Install LAMP TIK…”). The app runs in its
                  own window, can be pinned to the taskbar or dock, and unlocks the same
                  App-Exclusive YouTube downloader as the mobile install.
                </p>
                <h3 className="text-[16px] font-semibold tracking-tight text-[var(--text)]">
                  Troubleshooting
                </h3>
                <p>
                  Don&apos;t see “Install app”? Update Chrome/Edge to the latest version and
                  make sure you&apos;re on the live https://www.lamptik.online origin (not a
                  preview or offline copy). On iOS, “Add to Home Screen” only appears in
                  Safari — Chrome on iPhone can&apos;t install web apps. If the YouTube
                  downloader still shows a lock after installing, open the app from the new
                  icon once, or tap “Unlock App Mode in Browser” above.
                </p>
              </div>
            </section>

            {/* Why install */}
            <section className="seo-section mt-10">
              <h2 className="text-[1.5rem] font-semibold tracking-headline sm:text-[1.8rem]">
                Why install instead of bookmarking?
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: <Zap className="size-4" />,
                    title: "One-tap downloads",
                    body: "Home-screen icon opens the downloader full-screen — paste a link and save in seconds.",
                  },
                  {
                    icon: <MonitorPlay className="size-4" />,
                    title: "HD + MP3, no watermark",
                    body: "Same clean H.264 streams as the site: TikTok HD, Reels, Facebook videos and MP3 audio.",
                  },
                  {
                    icon: <Music2 className="size-4" />,
                    title: "Zero storage bloat",
                    body: "The web app is kilobytes, updates itself, and never asks for photo or contact access.",
                  },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="rounded-[14px] border border-[var(--glass-border)] bg-[var(--field)] p-4"
                  >
                    <span className="grid size-9 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]">
                      {item.icon}
                    </span>
                    <p className="mt-2.5 text-[14px] font-semibold tracking-tight">{item.title}</p>
                    <p className="pretty mt-1 text-[12.5px] leading-relaxed text-[var(--text-2)]">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/youtube-downloader" className="btn btn-primary h-11 gap-2 px-5 text-[13.5px] font-semibold">
                  <Youtube className="size-4" />
                  Open YouTube HD Downloader
                </Link>
                <Link href="/#tool" className="btn btn-ghost h-11 gap-2 px-5 text-[13.5px]">
                  Open the downloader
                </Link>
                <Link
                  href="/guides"
                  className="btn btn-ghost h-11 gap-2 px-5 text-[13.5px]"
                >
                  Read the guides
                </Link>
              </div>
            </section>

            {/* FAQ (mirrors the FAQPage JSON-LD above) */}
            <section className="seo-section mt-12">
              <h2 className="text-[1.5rem] font-semibold tracking-headline sm:text-[1.8rem]">
                App install FAQ
              </h2>
              <div className="mt-4 space-y-3">
                {FAQS.map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-[14px] border border-[var(--glass-border)] bg-[var(--field)] p-4"
                  >
                    <summary className="cursor-pointer list-none text-[14px] font-semibold tracking-tight">
                      {faq.question}
                    </summary>
                    <p className="pretty mt-2 text-[13px] leading-relaxed text-[var(--text-2)]">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

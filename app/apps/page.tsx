import type { Metadata } from "next";
import Link from "next/link";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ArrowUpRight, Chrome, Download, ShieldCheck, Smartphone, Sparkles } from "lucide-react";

import { AmbientBackground } from "@/components/ambient-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { JsonLd, breadcrumbNode } from "@/components/seo/JsonLd";
import { siteConfig, siteUrl } from "@/lib/site";

const TITLE = "App & Extension — download with one click, anywhere";
const DESCRIPTION =
  "Get LampTik outside the browser tab: a Chrome extension that puts a Download button inside YouTube, TikTok, Instagram and Facebook, and the Android app that catches a link the moment you share it.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · ${siteConfig.name}` },
  description: DESCRIPTION,
  alternates: { canonical: "/apps" },
  openGraph: {
    type: "website",
    url: `${siteUrl}/apps`,
    siteName: siteConfig.name,
    title: `${TITLE} · ${siteConfig.name}`,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · ${siteConfig.name}`,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

/**
 * Distribution is deliberately off-store: Chrome Web Store review and a Play
 * Store listing both demand a privacy policy contact they can audit and a
 * publisher identity this project does not have. The ZIP and the APK are built
 * from this repository, so the download button points at real files — and when
 * a build has not been published yet, it says so and links to the release
 * page instead of 404ing a button that claims to start a download.
 */
const EXTENSION_ZIP = "/downloads/lamptik-chrome-extension.zip";

function resolveApk(): { href: string; direct: boolean } {
  const fromEnv = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL?.trim();
  if (fromEnv) return { href: fromEnv, direct: true };
  // Checked at build time: `public/` is baked into the deployment, so this is
  // a static answer, not a per-request filesystem probe.
  if (existsSync(join(process.cwd(), "public", "downloads", "lamptik-android.apk"))) {
    return { href: "/downloads/lamptik-android.apk", direct: true };
  }
  return { href: "https://github.com/mk6783336/LAMPTIK-/releases/latest", direct: false };
}

const EXTENSION_STEPS: ReadonlyArray<readonly [string, string]> = [
  [
    "Unzip the download",
    "One folder, no installer. Keep it somewhere permanent — Chrome loads the extension from that folder every time it starts.",
  ],
  [
    "Open chrome://extensions",
    "Turn on Developer mode (top right). Edge and Brave use the same page at edge://extensions and brave://extensions.",
  ],
  [
    "Load unpacked",
    "Pick the unzipped folder — or drag the ZIP straight onto the page. The ⚡ button appears on YouTube immediately; no restart needed.",
  ],
];

const ANDROID_STEPS: ReadonlyArray<readonly [string, string]> = [
  [
    "Install the APK",
    "Android will warn about installing from an unknown source the first time — that is the standard sideload prompt, and it only appears because this app is not on the Play Store.",
  ],
  [
    "Copy or share any link",
    "Copy a YouTube, TikTok, Instagram or Facebook link and LampTik picks it up from the clipboard. Or use Share → LampTik from inside those apps.",
  ],
  [
    "Pick a quality, done",
    "1080p MP4, 720p MP4 or MP3. The file saves to your Gallery and stays in the in-app history tab.",
  ],
];

export default function AppsPage() {
  const apk = resolveApk();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}/apps#page`,
        name: "LampTik App & Extension",
        url: `${siteUrl}/apps`,
        description: DESCRIPTION,
        isPartOf: { "@id": `${siteUrl}/#website` },
        hasPart: [
          {
            "@type": "SoftwareApplication",
            name: "LampTik Chrome Extension",
            applicationCategory: "BrowserApplication",
            operatingSystem: "Chrome, Edge, Brave",
            url: `${siteUrl}/apps#extension`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            description:
              "Manifest V3 extension that adds a one-click Download button to YouTube, TikTok, Instagram and Facebook.",
          },
          {
            "@type": "SoftwareApplication",
            name: "LampTik for Android",
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Android",
            url: `${siteUrl}/apps#android`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            description:
              "Android app that resolves a copied or shared video link and saves the MP4 or MP3 straight to the gallery.",
          },
        ],
      },
      breadcrumbNode(`${siteUrl}/apps#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: "App & Extension", url: `${siteUrl}/apps` },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <AmbientBackground />

      <div className="flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">
          <section className="pb-10 pt-10 sm:pb-14 sm:pt-14">
            <div className="shell">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                Install · Off-store · Free
              </p>
              <h1 className="balance mt-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-headline sm:text-5xl">
                Take the downloader <span className="text-gradient">with you.</span>
              </h1>
              <p className="pretty mt-4 max-w-xl text-base leading-relaxed text-[var(--text-2)]">
                The website is the whole product. These two clients just remove the copy-and-paste
                step: a Chrome extension that puts a ⚡ button inside the video page, and an Android
                app that catches the link the moment you share it. Same resolver, same files, still
                no account.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {[
                  { label: "No sign-in", Icon: ShieldCheck },
                  { label: "Nothing stored on our side", Icon: Sparkles },
                  { label: "Ad-supported, no upsells", Icon: Download },
                ].map(({ label, Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-xs text-[var(--text-2)] backdrop-blur"
                  >
                    <Icon className="size-3 text-[var(--accent-text)]" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* The two clients side by side; stacked on phones. */}
          <section className="pb-12">
            <div className="shell grid gap-3 lg:grid-cols-2">
              <article
                id="extension"
                className="panel flex min-w-0 scroll-mt-24 flex-col gap-5 p-6 sm:p-7"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--glass-border)] bg-[var(--field-strong)] text-[var(--accent-text)]">
                      <Chrome className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold tracking-tight">
                        Chrome extension
                      </h2>
                      <p className="micro mt-0.5 text-[var(--text-3)]">
                        Manifest V3 · Chrome, Edge, Brave
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    v1.0.0
                  </span>
                </div>

                <p className="pretty text-sm leading-relaxed text-[var(--text-2)]">
                  Adds a native-looking ⚡ Download button next to Share on every YouTube video and
                  Short, and a floating ⚡ pill on TikTok, Instagram Reels and Facebook video pages.
                  The popover resolves the file on the spot and hands MP4 or MP3 straight to your
                  download manager.
                </p>

                <ul className="flex flex-col gap-2 text-sm text-[var(--text-2)]">
                  {[
                    "Reads the page you are on — no browsing history access",
                    "One file per click, no extra tabs, no pop-unders",
                    "Works alongside the site: same API, same rate limits",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--ok)]" />
                      <span className="pretty">{line}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                  <a
                    href={EXTENSION_ZIP}
                    download
                    className="btn btn-primary h-11 flex-1 gap-2 px-5 text-sm font-semibold"
                  >
                    <Download className="size-4" />
                    Download extension (.zip)
                  </a>
                  <Link
                    href="#extension-steps"
                    className="btn btn-secondary h-11 flex-1 gap-2 px-5 text-sm font-semibold"
                  >
                    How to install
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </article>

              <article id="android" className="panel flex min-w-0 scroll-mt-24 flex-col gap-5 p-6 sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--glass-border)] bg-[var(--field-strong)] text-[var(--accent-text)]">
                      <Smartphone className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold tracking-tight">
                        Android app
                      </h2>
                      <p className="micro mt-0.5 text-[var(--text-3)]">
                        com.lamptik.app · Android 8+
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200">
                    Sideload
                  </span>
                </div>

                <p className="pretty text-sm leading-relaxed text-[var(--text-2)]">
                  Copy a link and it appears in the app before you switch to it — or tap{" "}
                  <span className="font-medium text-[var(--text)]">Share → LampTik</span> from inside
                  YouTube, TikTok, Instagram or Facebook. Pick 1080p MP4, 720p MP4 or MP3 and the file
                  lands in your gallery, with a history tab that remembers what you saved.
                </p>

                <ul className="flex flex-col gap-2 text-sm text-[var(--text-2)]">
                  {[
                    "Clipboard and Share-sheet detection, no manual paste",
                    "Saves to the Gallery — no cloud, no account, no sync",
                    "Downloads run in the background with a real progress bar",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--ok)]" />
                      <span className="pretty">{line}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                  <a
                    href={apk.href}
                    {...(apk.direct
                      ? { download: true }
                      : { target: "_blank", rel: "noopener noreferrer" })}
                    className="btn btn-primary h-11 flex-1 gap-2 px-5 text-sm font-semibold"
                  >
                    <Download className="size-4" />
                    {apk.direct ? "Download APK" : "Get the APK on GitHub"}
                  </a>
                  <Link
                    href="#android-steps"
                    className="btn btn-secondary h-11 flex-1 gap-2 px-5 text-sm font-semibold"
                  >
                    How to install
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>

                {apk.direct ? null : (
                  <p className="text-xs leading-relaxed text-[var(--text-3)]">
                    The signed build is published as a release asset from this repository&apos;s
                    Android build. Installing from an APK means updates are manual — the web
                    downloader always stays current.
                  </p>
                )}
              </article>
            </div>
          </section>

          <section id="extension-steps" className="section-pad scroll-mt-24 border-t border-[var(--line)]">
            <div className="shell">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                Chrome · three steps
              </p>
              <h2 className="balance mt-4 text-3xl font-semibold leading-tight tracking-headline sm:text-4xl">
                Install the extension
              </h2>
              <ol className="mt-6 grid gap-3 sm:grid-cols-3">
                {EXTENSION_STEPS.map(([title, body], index) => (
                  <li key={title} className="panel flex min-w-0 flex-col gap-2 p-5">
                    <span className="micro text-[var(--accent-text)]">Step {index + 1}</span>
                    <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                    <p className="pretty text-sm leading-relaxed text-[var(--text-2)]">{body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="android-steps" className="section-pad scroll-mt-24 border-t border-[var(--line)]">
            <div className="shell">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                Android · three steps
              </p>
              <h2 className="balance mt-4 text-3xl font-semibold leading-tight tracking-headline sm:text-4xl">
                Use the share sheet
              </h2>
              <ol className="mt-6 grid gap-3 sm:grid-cols-3">
                {ANDROID_STEPS.map(([title, body], index) => (
                  <li key={title} className="panel flex min-w-0 flex-col gap-2 p-5">
                    <span className="micro text-[var(--accent-text)]">Step {index + 1}</span>
                    <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                    <p className="pretty text-sm leading-relaxed text-[var(--text-2)]">{body}</p>
                  </li>
                ))}
              </ol>

              <div className="panel mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="pretty max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
                  Nothing here is required. The browser tool handles every supported platform with no
                  install at all — these clients exist for people who download several videos a day.
                </p>
                <Link
                  href="/"
                  className="btn btn-ghost group h-11 shrink-0 gap-2 px-4 text-sm font-semibold"
                >
                  Use it in the browser
                  <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

import Link from "next/link";
import { ArrowUpRight, Check, Globe } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { VideoAdUnit } from "@/components/ads/VideoAdUnit";
import { AmbientBackground } from "@/components/ambient-background";
import { ConsentBar } from "@/components/consent-bar";
import { Downloader } from "@/components/downloader";
import {
  breadcrumbNode,
  faqPageNode,
  howToNode,
  JsonLd,
  organizationNode,
  websiteNode,
} from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { LandingCopy } from "@/lib/i18n/types";
import { LOCALE_CODES } from "@/lib/i18n/types";
import { PLATFORMS } from "@/lib/platforms";
import { siteUrl } from "@/lib/site";

/** Language switcher labels stay in their own language, never translated. */
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
};

/**
 * A regional landing page: localized hero, steps and FAQ around the same
 * resolver the English tool pages use.
 *
 * `dir` is applied to the whole page wrapper (not just a paragraph) so RTL
 * mirrors the layout, the icon order and the card gutters — an Arabic page
 * that keeps LTR text alignment reads as a machine translation.
 */
export function LocalizedLanding({ copy }: { copy: LandingCopy }) {
  const pageUrl = `${siteUrl}/${copy.code}`;
  const tiktok = PLATFORMS.tiktok;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      { ...websiteNode(), inLanguage: copy.htmlLang },
      {
        "@type": "WebApplication",
        "@id": `${pageUrl}/#app`,
        name: copy.title,
        url: pageUrl,
        description: copy.description,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "All",
        browserRequirements: "Requires JavaScript",
        inLanguage: copy.htmlLang,
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        featureList: copy.chips,
      },
      howToNode({
        id: `${pageUrl}/#howto`,
        name: copy.stepsHeading,
        description: copy.description,
        steps: copy.steps,
        url: pageUrl,
        anchor: "how",
      }),
      faqPageNode(`${pageUrl}/#faq`, copy.faqs, pageUrl),
      breadcrumbNode(`${pageUrl}/#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: copy.title, url: pageUrl },
      ]),
    ],
  };

  const otherLanguages = (["en", ...LOCALE_CODES] as const).filter(
    (code) => code !== copy.code,
  );

  return (
    <>
      <JsonLd data={jsonLd} />
      <AmbientBackground />
      <ConsentBar />

      <div
        dir={copy.dir}
        lang={copy.htmlLang}
        data-platform-theme={tiktok.id}
        className="flex min-h-dvh flex-col"
      >
        <SiteHeader />

        <main className="flex-1">
          <section className="pb-12 pt-10 sm:pb-16 sm:pt-14 lg:pt-20">
            <div className="shell grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
              <div className="animate-rise min-w-0 lg:col-span-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="eyebrow">
                    <span aria-hidden="true" className="eyebrow-dot" />
                    {copy.eyebrow}
                  </p>
                </div>

                <h1 className="balance mt-4 text-4xl font-semibold leading-[1.05] tracking-headline sm:mt-5 sm:text-5xl">
                  {copy.h1Lead}
                  <span className="text-gradient mt-1 block">{copy.h1Accent}</span>
                </h1>

                <p className="pretty mt-4 max-w-lg text-base leading-relaxed text-[var(--text-2)] sm:mt-5">
                  {copy.lede}
                </p>

                <div className="mt-6 hidden flex-wrap items-center gap-2 sm:flex">
                  {copy.chips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-xs text-[var(--text-2)]"
                    >
                      <Check className="size-3 text-[var(--accent-text)]" />
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-3)]">
                  <Globe className="size-3.5" aria-hidden="true" />
                  {otherLanguages.map((code) => (
                    <Link
                      key={code}
                      href={code === "en" ? "/" : `/${code}`}
                      hrefLang={code}
                      className="rounded-full border border-[var(--glass-border)] px-2 py-0.5 transition-colors duration-200 hover:border-[var(--glass-border-hover)] hover:text-[var(--text)]"
                    >
                      {LANGUAGE_LABELS[code]}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="animate-rise min-w-0 lg:col-span-7 [animation-delay:80ms]">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold tracking-tight">{copy.tool.heading}</p>
                  <p className="text-xs text-[var(--text-3)]">{copy.tool.note}</p>
                </div>
                <Downloader platform="tiktok" />
              </div>
            </div>

            <div className="shell mt-8 sm:mt-10">
              <VideoAdUnit />
            </div>

            <div className="shell mt-10 sm:mt-12">
              <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {copy.facts.map(([term, value]) => (
                  <div
                    key={term}
                    className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3"
                  >
                    <dt className="micro text-xs text-[var(--text-3)]">{term}</dt>
                    <dd className="mt-1 text-sm font-medium leading-snug tracking-tight">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section id="how" className="seo-section section-pad scroll-mt-24 border-t border-[var(--line)]">
            <div className="shell mb-10">
              <AdSlot format="leaderboard" label="Advertisement" />
            </div>
            <div className="shell max-w-3xl">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                {copy.eyebrow}
              </p>
              <h2 className="balance mt-4 text-3xl font-semibold leading-tight tracking-headline sm:text-4xl">
                {copy.stepsHeading}
              </h2>
              <ol className="mt-6 space-y-3">
                {copy.steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="flex gap-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-4"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent-text)]"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold tracking-tight">{step.title}</p>
                      <p className="pretty mt-1 text-sm leading-relaxed text-[var(--text-2)]">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <h2 id="faq" className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-headline">
                {copy.faqHeading}
              </h2>
              <div className="mt-4 space-y-3">
                {copy.faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-4"
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
            </div>
          </section>

          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <h2 className="balance text-2xl font-semibold tracking-headline">{copy.otherToolsHeading}</h2>
              <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
                {(["tiktok", "instagram", "facebook", "youtube"] as const).map((id) => (
                  <Link key={id} href={PLATFORMS[id].path} className="bento-card group flex items-start gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 text-base font-semibold tracking-tight">
                        {PLATFORMS[id].name}
                        <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                      <span className="pretty mt-1.5 block text-sm leading-relaxed text-[var(--text-2)]">
                        {PLATFORMS[id].blurb}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>

              <div className="panel mt-8 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-semibold tracking-tight">{copy.cta.heading}</p>
                  <p className="pretty mt-1 text-sm leading-relaxed text-[var(--text-2)]">{copy.cta.body}</p>
                </div>
                <Link href="/#tool" className="btn btn-primary h-11 shrink-0 gap-2 px-5 text-sm font-semibold">
                  {copy.cta.button}
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>

              <p className="mt-4 text-xs text-[var(--text-3)]">{copy.footerNote}</p>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

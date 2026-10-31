import Link from "next/link";
import { ArrowUpRight, Globe } from "lucide-react";

import { PlatformIcon } from "@/components/platform-icons";
import { LANGUAGE_LABELS } from "@/lib/i18n/language-labels";
import {
  LOCALIZED_PLATFORM_SLUGS,
  PLATFORM_LANDINGS,
  PLATFORM_LOCALES,
  type LocalizedPlatform,
} from "@/lib/i18n/platform-landings";
import { PLATFORMS } from "@/lib/platforms";

/**
 * The three networks that have localized siblings. The locale roots (`/de`,
 * `/pt`, …) are TikTok pages and were already linked sitewide from the footer,
 * so they are not repeated here.
 */
const NETWORKS: readonly LocalizedPlatform[] = ["instagram", "youtube", "facebook"];

/**
 * Anchor text, in the target language, taken from the target page's own title.
 *
 * The whole title ("Instagram Reels herunterladen in HD — ohne Wasserzeichen")
 * is too long for a card row, and a bare language name ("Deutsch") tells Google
 * nothing about what sits behind the link. Everything up to the em dash is the
 * part that names the page: "Instagram Reels herunterladen in HD".
 */
function anchorText(title: string): string {
  return title.split(" — ")[0]?.trim() || title;
}

function hrefFor(code: string, platform: LocalizedPlatform): string {
  return `/${code}/${LOCALIZED_PLATFORM_SLUGS[platform]}`;
}

/**
 * Language selector for an English platform page: the same downloader in every
 * language that has one.
 *
 * Before this block the 27 localized platform pages were reachable only from
 * the sitemap and from each other — Google had to crawl them cold. A real link
 * from the page they translate is the difference between "in the index" and
 * "crawled, given context, and paired with its hreflang cluster".
 *
 * Each link carries `hrefLang` and `lang` for its target, so a crawler reads the
 * pair (this page is English, that page is German) twice over — once from the
 * `<head>` alternates and once from the anchor itself.
 */
export function PlatformLanguages({ platform }: { platform: LocalizedPlatform }) {
  const english = PLATFORMS[platform];

  return (
    <section className="section-pad border-t border-[var(--line)]">
      <div className="shell">
        <p className="eyebrow">
          <Globe className="size-3.5" aria-hidden="true" />
          {PLATFORM_LOCALES.length + 1} languages
        </p>
        <h2 className="balance mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-headline">
          This downloader, in your language.
        </h2>
        <p className="pretty mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
          The {english.name} page you are reading is the English original. Each version below is
          its own page — written for the query people type in that language, not machine
          translated — around the same resolver, so the saved file is identical.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_LOCALES.map((code) => {
            const copy = PLATFORM_LANDINGS[code][platform];
            return (
              <li key={code} className="flex">
                <Link
                  href={hrefFor(code, platform)}
                  hrefLang={copy.htmlLang}
                  lang={copy.htmlLang}
                  className="bento-card group flex w-full items-center justify-between gap-3 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold tracking-tight">
                      {LANGUAGE_LABELS[code]}
                    </span>
                    <span className="pretty mt-0.5 block truncate text-xs text-[var(--text-3)]">
                      {anchorText(copy.title)}
                    </span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--tool-ink)]" />
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-xs text-[var(--text-3)]">
          Every page in this list declares the other nine as translations of the same topic, so
          search engines serve the right one for each country instead of picking for themselves.
        </p>
      </div>
    </section>
  );
}

/**
 * The same 27 pages, indexed by language, for the /tools hub.
 *
 * The hub is where a crawler (and a lost visitor) lands when they know the task
 * but not the page; a language-first grid answers "do you have this in Hindi?"
 * without scrolling past fifteen English cards first.
 */
export function HubLanguages() {
  return (
    <section className="section-pad border-t border-[var(--line)]">
      <div className="shell">
        <p className="eyebrow">
          <span aria-hidden="true" className="eyebrow-dot" />
          In your language
        </p>
        <h2 className="balance mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-headline">
          {PLATFORM_LOCALES.length * NETWORKS.length} pages, nine languages.
        </h2>
        <p className="pretty mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
          Instagram Reels, YouTube and Facebook each have a page in every language below. The
          downloader is the same one; the instructions, the FAQ and the search terms are not.
        </p>

        <div className="mt-8 grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_LOCALES.map((code) => (
            <div key={code} className="bento-card flex flex-col">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold tracking-tight">
                  {LANGUAGE_LABELS[code]}
                </h3>
                <span className="micro text-xs tabular-nums text-[var(--text-3)]">/{code}</span>
              </div>

              <ul className="mt-3 space-y-1">
                {NETWORKS.map((platform) => {
                  const copy = PLATFORM_LANDINGS[code][platform];
                  return (
                    <li key={platform}>
                      <Link
                        href={hrefFor(code, platform)}
                        hrefLang={copy.htmlLang}
                        lang={copy.htmlLang}
                        title={copy.title}
                        className="group flex items-center gap-2 rounded-lg py-1.5 pl-1 pr-1.5 text-sm text-[var(--text-2)] transition-colors duration-200 hover:bg-[var(--field)] hover:text-[var(--text)]"
                      >
                        <PlatformIcon
                          platform={platform}
                          className="size-3.5 shrink-0 text-[var(--text-3)]"
                        />
                        <span className="pretty min-w-0 flex-1">{anchorText(copy.title)}</span>
                        <ArrowUpRight className="size-3 shrink-0 text-[var(--text-3)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-[var(--text-3)]">
          TikTok is the exception: its nine localized versions are the locale roots (`/es`, `/de`,
          `/hi` …), already linked in the footer and from every page&rsquo;s language switcher.
        </p>
      </div>
    </section>
  );
}

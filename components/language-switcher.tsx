"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  LOCALIZED_PLATFORM_SLUGS,
  platformPath,
  type LocalizedPlatform,
} from "@/lib/i18n/platform-landings";
import { languageLabel } from "@/lib/i18n/language-labels";
import { isLocaleCode, LOCALE_CODES, type LocaleCode } from "@/lib/i18n/types";

/**
 * Header language switcher.
 *
 * A `<details>` element rather than a stateful menu, for three reasons:
 * every language is a real `<a href>` in the markup (Googlebot discovers all
 * eleven roots from the header, not only from the sitemap), it opens with the
 * keyboard before any JavaScript runs, and there is no focus trap to get wrong.
 *
 * Links follow the *topic*, not just the locale: on `/es/youtube-downloader`,
 * «Deutsch» opens `/de/youtube-downloader`, not the German TikTok landing. A
 * locale without that platform page (Turkish and French do not have one yet)
 * falls back to its root instead of linking to a 404.
 */
/**
 * Display order, then anything the roster grows later. Written this way so a
 * locale added to `LOCALE_CODES` can never be missing from the menu — the
 * previous hand-written list was exactly how /tr and /fr would have been
 * forgotten.
 */
const PREFERRED_ORDER: LocaleCode[] = [
  "es",
  "id",
  "pt",
  "ar",
  "tr",
  "fr",
  "de",
  "vi",
  "hi",
  "th",
  "tl",
];

const LANGUAGE_ORDER: LocaleCode[] = [
  ...PREFERRED_ORDER.filter((code) => LOCALE_CODES.includes(code)),
  ...LOCALE_CODES.filter((code) => !PREFERRED_ORDER.includes(code)),
];

export function LanguageSwitcher() {
  const pathname = usePathname() ?? "/";
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  const close = useCallback(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, []);

  // Click-away and Escape: a details sheet stays open until it is told not to.
  useEffect(() => {
    const node = detailsRef.current;
    if (!node) return;

    function onPointerDown(event: PointerEvent) {
      if (!node?.open) return;
      if (event.target instanceof Node && !node.contains(event.target)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && node?.open) {
        close();
        node.querySelector("summary")?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close]);

  const segments = pathname.split("/").filter(Boolean);
  const current: LocaleCode | "en" = isLocaleCode(segments[0] ?? "")
    ? (segments[0] as LocaleCode)
    : "en";
  const rest = current === "en" ? segments : segments.slice(1);
  const slug = rest.join("/");
  const platform = (Object.keys(LOCALIZED_PLATFORM_SLUGS) as LocalizedPlatform[]).find(
    (entry) => LOCALIZED_PLATFORM_SLUGS[entry] === slug,
  );

  function hrefFor(code: LocaleCode | "en"): string {
    if (code === "en") return slug ? `/${slug}` : "/";
    if (!platform) return `/${code}`;
    return platformPath(code, platform) ?? `/${code}`;
  }

  const targets: Array<{ code: LocaleCode | "en"; href: string }> = [
    { code: "en", href: hrefFor("en") },
    ...LANGUAGE_ORDER.map((code) => ({ code, href: hrefFor(code) })),
  ];

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--field)] px-2.5 text-xs font-medium text-[var(--text-2)] transition-colors duration-200 [&::-webkit-details-marker]:hidden hover:border-[var(--glass-border-hover)] hover:text-[var(--text)] sm:text-sm"
        aria-label={`Language: ${languageLabel(current)}. Choose a language`}
      >
        <Globe aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="hidden whitespace-nowrap sm:inline">{languageLabel(current)}</span>
        <span className="whitespace-nowrap uppercase sm:hidden">
          {current === "en" ? "EN" : current}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-3 shrink-0 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>

      <div className="panel absolute end-0 top-[calc(100%+0.4rem)] z-[2147483646] w-56 p-1.5">
        <p className="micro px-2 py-1 text-[var(--text-3)]">Language</p>
        <ul className="grid gap-0.5">
          {targets.map(({ code, href }) => {
            const active = code === current;
            return (
              <li key={code}>
                <Link
                  href={href}
                  hrefLang={code}
                  aria-current={active ? "page" : undefined}
                  onClick={close}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150",
                    active
                      ? "bg-[var(--field-strong)] text-[var(--text)]"
                      : "text-[var(--text-2)] hover:bg-[var(--field)] hover:text-[var(--text)]",
                  )}
                >
                  <span className="truncate">{languageLabel(code)}</span>
                  {active ? (
                    <Check aria-hidden="true" className="size-3.5 shrink-0 text-[var(--ok)]" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

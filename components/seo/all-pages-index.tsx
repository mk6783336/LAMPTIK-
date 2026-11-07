import Link from "next/link";

import { GUIDE_LIST } from "@/lib/content/guides";
import { SUB_TOOLS } from "@/lib/content/sub-tools";
import { CREATOR_TOOLS } from "@/lib/creator-tools";
import {
  LOCALIZED_PLATFORM_SLUGS,
  LOCALIZED_PLATFORMS,
  PLATFORM_LOCALES,
} from "@/lib/i18n/platform-landings";
import { languageLabel } from "@/lib/i18n/language-labels";
import { LOCALE_CODES } from "@/lib/i18n/types";
import { PLATFORMS, PLATFORM_LIST } from "@/lib/platforms";

/**
 * Every URL the sitemap lists, in one place, one hop from the home page.
 *
 * Ahrefs' audit counted 157 uncrawled internal links, and the cause is depth:
 * a localized platform page sitting at /es/youtube-downloader was reachable only
 * through the sitemap and a language hub, which is three hops from the home
 * page and easy for a crawler to deprioritise. This block links each one
 * directly from /tools, whose own depth is one.
 *
 * It is generated from the same arrays that build the routes — `SUB_TOOLS`,
 * `GUIDE_LIST`, `CREATOR_TOOLS`, `LOCALE_CODES` and the localized platform
 * table — so a page cannot be added to the site and forgotten here.
 */
export function AllPagesIndex() {
  const groups: Array<{ id: string; title: string; links: Array<{ href: string; label: string }> }> = [
    {
      id: "index-downloaders",
      title: "Platform downloaders",
      links: [
        { href: "/", label: "TikTok downloader" },
        ...PLATFORM_LIST.filter((id) => PLATFORMS[id].path !== "/").map((id) => ({
          href: PLATFORMS[id].path,
          label: `${PLATFORMS[id].name} downloader`,
        })),
        { href: "/twitter-video-downloader", label: "Twitter / X downloader" },
      ],
    },
    {
      id: "index-creator",
      title: "Creator tools",
      links: CREATOR_TOOLS.map((tool) => ({ href: `/${tool.slug}`, label: tool.name })),
    },
    {
      id: "index-subtools",
      title: "Format & device tools",
      links: SUB_TOOLS.map((tool) => ({ href: `/${tool.slug}`, label: tool.title })),
    },
    {
      id: "index-guides",
      title: "Guides",
      links: [
        { href: "/guides", label: "All guides" },
        ...GUIDE_LIST.map((guide) => ({ href: `/guides/${guide.slug}`, label: guide.title })),
      ],
    },
    {
      id: "index-languages",
      title: "Translated landings",
      links: LOCALE_CODES.map((code) => ({ href: `/${code}`, label: languageLabel(code) })),
    },
    {
      id: "index-localized",
      title: "Translated platform pages",
      links: PLATFORM_LOCALES.flatMap((code) =>
        LOCALIZED_PLATFORMS.map((platform) => ({
          href: `/${code}/${LOCALIZED_PLATFORM_SLUGS[platform]}`,
          label: `${PLATFORMS[platform].name} · ${languageLabel(code)}`,
        })),
      ),
    },
    {
      id: "index-company",
      title: "Site",
      links: [
        { href: "/tools", label: "All tools" },
        { href: "/services", label: "Build services" },
        { href: "/apps", label: "Apps & extension" },
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact & DMCA" },
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
      ],
    },
  ];

  return (
    <section id="all-pages" className="section-pad scroll-mt-24 border-t border-[var(--line)]">
      <div className="shell">
        <p className="eyebrow">
          <span aria-hidden="true" className="eyebrow-dot" />
          Every page
        </p>
        <h2 className="balance mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-headline">
          The whole site, one click deep.
        </h2>
        <p className="pretty mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
          Every route in the sitemap — downloaders, creator tools, format pages, all fifteen
          guides and every translated landing.
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} id={group.id} className="min-w-0 scroll-mt-24">
              <h3 className="micro text-xs text-[var(--text-3)]">{group.title}</h3>
              <ul className="mt-3 space-y-1.5">
                {group.links.map((link) => (
                  <li key={`${group.id}-${link.href}`}>
                    <Link
                      href={link.href}
                      className="pretty inline-block text-sm leading-snug text-[var(--text-2)] transition-colors duration-200 hover:text-[var(--text)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

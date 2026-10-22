import Link from "next/link";
import { ArrowUpRight, Check, Plus, X } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import type { ToolId, ToolSeo } from "@/lib/content/tool-seo";
import { TOOL_SEO } from "@/lib/content/tool-seo";

/** High-contrast 24px verdict badge — readable at a glance, never a dim glyph. */
function VerdictBadge({ positive }: { positive: boolean }) {
  return positive ? (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-300"
    >
      <X className="size-3.5" strokeWidth={3} />
    </span>
  );
}

/**
 * Below-the-fold semantic content for the three tool routes.
 *
 * Everything here exists for a reader first and a crawler second: the steps
 * mirror the actual pipeline, the comparison table states only things the
 * engine really does (faststart MP4, H.264/AAC, no logging), and the FAQ is
 * the exact array that produces the page's `FAQPage` JSON-LD — so the markup
 * and the schema can never disagree.
 *
 * Rendered on the server: zero client JS, no hydration cost, no layout shift.
 */
export function ToolSeoContent({ platform }: { platform: ToolId }) {
  const seo: ToolSeo = TOOL_SEO[platform];

  return (
    <>
      {/* 1 — Three-step bento grid ---------------------------------------- */}
      <section id="how" className="section-pad scroll-mt-24 border-t border-[var(--line)]">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                {seo.eyebrow}
              </p>
              <h2 className="balance mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-headline">
                {seo.heading}
              </h2>
              <p className="pretty mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
                {seo.lede}
              </p>
            </div>
          </div>

          <ol className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {seo.steps.map((step, index) => (
              <li key={step.title} className="bento-card flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.015] font-mono text-xs tabular-nums text-[var(--accent-text)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-semibold tracking-tight">{step.title}</h3>
                </div>
                <p className="pretty mt-3 text-sm leading-relaxed text-[var(--text-2)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 2 — Comparison table --------------------------------------------- */}
      <section className="section-pad border-t border-[var(--line)]">
        <div className="shell">
          <p className="eyebrow">
            <span aria-hidden="true" className="eyebrow-dot" />
            Comparison
          </p>
          <h2 className="balance mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-headline">
            Why this downloader beats the copycats
          </h2>
          <p className="pretty mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
            {seo.comparisonLede}
          </p>

          {/* Phones: a three-column table at 390px is unreadable, so the same
              rows render as stacked cards. Both markups carry identical copy. */}
          <ul className="mt-8 flex flex-col gap-2.5 sm:hidden">
            {seo.comparison.map((row) => (
              <li
                key={row.label}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5"
              >
                <p className="text-base font-semibold tracking-tight text-[var(--text)]">
                  {row.label}
                </p>
                <p className="mt-3 flex items-start gap-2.5 text-sm leading-relaxed text-[var(--text-2)]">
                  <VerdictBadge positive />
                  <span className="pt-0.5">{row.ours}</span>
                </p>
                <p className="mt-2.5 flex items-start gap-2.5 text-sm leading-relaxed text-[var(--text-3)]">
                  <VerdictBadge positive={false} />
                  <span className="pt-0.5">{row.theirs}</span>
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 hidden overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015] sm:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                LAMP TIK compared with typical {seo.noun} downloaders
              </caption>
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th
                    scope="col"
                    className="px-5 py-4 text-xs font-medium text-[var(--text-3)]"
                  >
                    Feature
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-4 text-xs font-medium text-[var(--accent-text)]"
                  >
                    LAMP TIK
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-4 text-xs font-medium text-[var(--text-3)]"
                  >
                    Typical downloader
                  </th>
                </tr>
              </thead>
              <tbody>
                {seo.comparison.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-white/[0.05] last:border-b-0 align-top"
                  >
                    <th
                      scope="row"
                      className="w-[28%] px-5 py-4 text-sm font-medium leading-snug tracking-tight text-[var(--text)] sm:text-base"
                    >
                      {row.label}
                    </th>
                    <td className="px-5 py-4 text-sm leading-relaxed text-[var(--text-2)] sm:text-base">
                      <span className="flex items-start gap-2.5">
                        <VerdictBadge positive />
                        <span className="pt-0.5">{row.ours}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm leading-relaxed text-[var(--text-3)] sm:text-base">
                      <span className="flex items-start gap-2.5">
                        <VerdictBadge positive={false} />
                        <span className="pt-0.5">{row.theirs}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* The single static-page ad slot before the FAQ. Together with the
          unit under the tool this is the whole scroll-path inventory — no
          back-to-back banners. */}
      <section className="border-t border-[var(--line)] py-10 sm:py-12">
        <div className="shell">
          <AdSlot format="leaderboard" label="Advertisement" />
        </div>
      </section>

      {/* 3 — FAQ accordion (the FAQPage schema source) --------------------- */}
      <section id="faq" className="section-pad scroll-mt-24 border-t border-[var(--line)]">
        <div className="shell grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">
              <span aria-hidden="true" className="eyebrow-dot" />
              FAQ
            </p>
            <h2 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
              {seo.noun}, answered
            </h2>
            <p className="pretty mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-2)]">
              Straight answers about quality, legality and storage. Still stuck?{" "}
              <Link
                href="/contact"
                className="text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-4 transition-colors hover:decoration-[var(--accent)]"
              >
                Tell us
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {seo.faqs.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.015] px-4 py-1 backdrop-blur-md transition-colors duration-200 hover:border-[var(--line-strong)] [&[open]]:bg-[var(--field)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-left">
                  <h3 className="balance text-sm font-medium leading-snug tracking-tight">
                    {item.question}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="grid size-6 shrink-0 place-items-center rounded-full border border-white/[0.07] bg-[var(--field)] text-[var(--text-3)] transition-[transform,color,border-color] duration-300 group-open:rotate-45 group-open:border-[color-mix(in_srgb,var(--accent)_45%,transparent)] group-open:text-[var(--accent-text)]"
                  >
                    <Plus className="size-3.5" />
                  </span>
                </summary>
                <p className="pretty mt-0.5 max-w-2xl pb-4 pr-8 text-sm leading-relaxed text-[var(--text-2)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Internal linking matrix -------------------------------------- */}
      <section className="section-pad border-t border-[var(--line)]">
        <div className="shell">
          <p className="eyebrow">
            <span aria-hidden="true" className="eyebrow-dot" />
            Keep reading
          </p>
          <h2 className="balance mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-headline">
            Every tool and guide, in one place
          </h2>

          <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {seo.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-start justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4 transition-colors duration-200 hover:border-[var(--line-strong)]"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-snug tracking-tight transition-colors duration-200 group-hover:text-[var(--accent-text)]">
                    {link.anchor}
                  </span>
                  <span className="pretty mt-1.5 block text-sm leading-relaxed text-[var(--text-3)]">
                    {link.note}
                  </span>
                </span>
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-[var(--text-3)] transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent-text)]" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

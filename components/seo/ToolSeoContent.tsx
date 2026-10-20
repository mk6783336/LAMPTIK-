import Link from "next/link";
import { ArrowUpRight, Check, Minus, Plus } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import type { ToolId, ToolSeo } from "@/lib/content/tool-seo";
import { TOOL_SEO } from "@/lib/content/tool-seo";
import { adsterraRectangleKey } from "@/lib/monetization";

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
              <h2 className="balance mt-4 max-w-2xl text-[1.75rem] font-semibold leading-tight tracking-headline sm:text-4xl">
                {seo.heading}
              </h2>
              <p className="pretty mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--text-2)]">
                {seo.lede}
              </p>
            </div>
          </div>

          <ol className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {seo.steps.map((step, index) => (
              <li key={step.title} className="bento-card flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[12px] border border-white/[0.07] bg-white/[0.015] font-mono text-[11px] tabular-nums text-[var(--accent-text)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[15px] font-semibold tracking-tight">{step.title}</h3>
                </div>
                <p className="pretty mt-3 text-[13px] leading-relaxed text-[var(--text-2)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Slot C — leaderboard between the How-It-Works steps and the
          comparison table. */}
      <div className="shell pb-2">
        <AdSlot format="leaderboard" label="Advertisement" />
      </div>

      {/* 2 — Comparison table --------------------------------------------- */}
      <section className="section-pad border-t border-[var(--line)]">
        <div className="shell">
          <p className="eyebrow">
            <span aria-hidden="true" className="eyebrow-dot" />
            comparison
          </p>
          <h2 className="balance mt-4 max-w-2xl text-[1.75rem] font-semibold leading-tight tracking-headline sm:text-4xl">
            Why this downloader beats the copycats
          </h2>
          <p className="pretty mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--text-2)]">
            {seo.comparisonLede}
          </p>

          {/* Phones: a three-column table at 390px is unreadable, so the same
              rows render as stacked cards. Both markups carry identical copy. */}
          <ul className="mt-8 flex flex-col gap-2.5 sm:hidden">
            {seo.comparison.map((row) => (
              <li
                key={row.label}
                className="rounded-[16px] border border-white/[0.07] bg-white/[0.015] p-4"
              >
                <p className="text-[12.5px] font-medium tracking-tight text-[var(--text)]">
                  {row.label}
                </p>
                <p className="mt-2 flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--text-2)]">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--ok)]" />
                  <span>{row.ours}</span>
                </p>
                <p className="mt-1.5 flex items-start gap-2 text-[12px] leading-relaxed text-[var(--text-3)]">
                  <Minus className="mt-0.5 size-3.5 shrink-0 opacity-60" />
                  <span>{row.theirs}</span>
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 hidden overflow-hidden rounded-[18px] border border-white/[0.07] bg-white/[0.015] sm:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                LAMP TIK compared with typical {seo.noun} downloaders
              </caption>
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th
                    scope="col"
                    className="micro px-4 py-3 text-[9.5px] font-normal text-[var(--text-3)] sm:px-5"
                  >
                    Feature
                  </th>
                  <th
                    scope="col"
                    className="micro px-4 py-3 text-[9.5px] font-normal text-[var(--accent-text)] sm:px-5"
                  >
                    LAMP TIK
                  </th>
                  <th
                    scope="col"
                    className="micro px-4 py-3 text-[9.5px] font-normal text-[var(--text-3)] sm:px-5"
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
                      className="w-[28%] px-4 py-3.5 text-[12.5px] font-medium leading-snug tracking-tight text-[var(--text)] sm:px-5"
                    >
                      {row.label}
                    </th>
                    <td className="px-4 py-3.5 text-[12.5px] leading-relaxed text-[var(--text-2)] sm:px-5">
                      <span className="flex items-start gap-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--ok)]" />
                        <span>{row.ours}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] leading-relaxed text-[var(--text-3)] sm:px-5">
                      <span className="flex items-start gap-2">
                        <Minus className="mt-0.5 size-3.5 shrink-0 opacity-60" />
                        <span>{row.theirs}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 2b — Rectangle unit (300×250). Mounted after the comparison and
          before the FAQ: below the tool, above the questions. Reserved height
          on first paint, so it never shifts the FAQ. */}
      {/* Slot D — between the comparison table and the FAQ: leaderboard
          plus the 300x250 rectangle. Reserved heights on first paint, so
          neither shifts the FAQ. */}
      <section className="section-pad border-t border-[var(--line)]">
        <div className="shell">
          <AdSlot format="leaderboard" label="Advertisement" />
        </div>
        <div className="shell mt-8 flex justify-center">
          <AdSlot
            format="rectangle"
            zoneId={adsterraRectangleKey}
            label="Advertisement"
            className="max-w-[300px]"
          />
        </div>
      </section>

      {/* 3 — FAQ accordion (the FAQPage schema source) --------------------- */}
      <section id="faq" className="section-pad scroll-mt-24 border-t border-[var(--line)]">
        <div className="shell grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">
              <span aria-hidden="true" className="eyebrow-dot" />
              faq
            </p>
            <h2 className="balance mt-4 text-[1.75rem] font-semibold leading-tight tracking-headline sm:text-4xl">
              {seo.noun} questions, answered
            </h2>
            <p className="pretty mt-3 max-w-sm text-[14px] leading-relaxed text-[var(--text-2)]">
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
                className="group rounded-[16px] border border-white/[0.07] bg-white/[0.015] px-4 py-1 backdrop-blur-md transition-colors duration-200 hover:border-[var(--line-strong)] [&[open]]:bg-[var(--field)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-left">
                  <h3 className="balance text-[14px] font-medium leading-snug tracking-tight">
                    {item.question}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="grid size-6 shrink-0 place-items-center rounded-full border border-white/[0.07] bg-[var(--field)] text-[var(--text-3)] transition-[transform,color,border-color] duration-300 group-open:rotate-45 group-open:border-[color-mix(in_srgb,var(--accent)_45%,transparent)] group-open:text-[var(--accent-text)]"
                  >
                    <Plus className="size-3.5" />
                  </span>
                </summary>
                <p className="pretty mt-0.5 max-w-2xl pb-4 pr-8 text-[13.5px] leading-relaxed text-[var(--text-2)]">
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
            keep reading
          </p>
          <h2 className="balance mt-4 max-w-2xl text-[1.75rem] font-semibold leading-tight tracking-headline sm:text-4xl">
            Every tool and guide, in one place
          </h2>

          <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {seo.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-start justify-between gap-4 rounded-[16px] border border-white/[0.07] bg-white/[0.015] p-4 transition-colors duration-200 hover:border-[var(--line-strong)]"
              >
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium leading-snug tracking-tight transition-colors duration-200 group-hover:text-[var(--accent-text)]">
                    {link.anchor}
                  </span>
                  <span className="pretty mt-1.5 block text-[12.5px] leading-relaxed text-[var(--text-3)]">
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

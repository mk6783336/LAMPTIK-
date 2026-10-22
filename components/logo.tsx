import Link from "next/link";
import { Zap } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Brand mark: a lit gradient bolt tile with an ambient cyan glow, next to a
 * high-contrast wordmark. The colour lives in the tile; the type stays clean
 * so the lockup reads at 20px in a header or 40px in a footer.
 */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="LAMP TIK — home"
      className={cn("group inline-flex shrink-0 items-center gap-2.5", className)}
    >
      <span
        aria-hidden="true"
        className="relative grid size-9 place-items-center rounded-lg border border-white/20 bg-[linear-gradient(150deg,#22d3ee_0%,#3b82f6_52%,#6366f1_100%)] text-white shadow-[0_10px_28px_-12px_rgba(34,211,238,0.85),inset_0_1px_0_rgba(255,255,255,0.45)] transition-transform duration-200 group-hover:-translate-y-px group-active:scale-95"
      >
        <Zap className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={0} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-white/25 to-transparent opacity-70"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-base font-semibold tracking-tightest">
          LAMP
          <span className="logo-ink ml-1">TIK</span>
        </span>
        <span className="mt-1 hidden font-mono text-xs uppercase tracking-[0.22em] text-[var(--text-3)] sm:block">
          no watermark
        </span>
      </span>
    </Link>
  );
}

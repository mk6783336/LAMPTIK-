"use client";

import Link from "next/link";
import { AlertOctagon, Home, RotateCcw } from "lucide-react";

import { SiteHeader } from "@/components/site-header";

/**
 * Route-level error boundary. Renders inside the root layout (so the design
 * system still applies) and always offers two real ways out: retry the same
 * route, or go back to the tool. Stack traces are never shown to visitors —
 * only the digest, which is safe to display and useful in a support mail.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const detail =
    process.env.NODE_ENV === "production"
      ? null
      : (error.message ?? "Unknown error");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-lg text-center">
          <span className="eyebrow mx-auto">
            <span aria-hidden="true" className="eyebrow-dot" />
            Something broke
          </span>

          <h1 className="balance mt-5 text-4xl font-semibold leading-tight tracking-headline sm:text-5xl">
            That request{" "}
            <span className="text-gradient">didn’t finish.</span>
          </h1>
          <p className="pretty mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--text-2)]">
            Nothing was saved and nothing is broken. Retrying usually works —
            the resolver talks to three platforms and one of them is often
            having a slow moment.
          </p>

          {detail || error.digest ? (
            <p className="mx-auto mt-5 max-w-sm truncate rounded-xl border border-[var(--glass-border)] bg-[var(--field)] px-3 py-2 font-mono text-xs text-[var(--text-3)]">
              {detail ?? `digest ${error.digest}`}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="btn btn-primary h-11 gap-2 px-5 text-sm font-semibold"
            >
              <RotateCcw className="size-4" />
              Try again
            </button>
            <Link
              href="/#tool"
              className="btn btn-ghost h-11 gap-2 px-4 text-sm"
            >
              <Home className="size-4" />
              Back to the downloader
            </Link>
          </div>

          <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-[var(--text-3)]">
            <AlertOctagon className="size-3.5 text-[var(--warn)]" />
            Persistent?{" "}
            <Link
              href="/contact"
              className="text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-4"
            >
              Report it
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

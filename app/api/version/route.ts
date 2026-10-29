import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/version — the commit this deployment is actually serving.
 *
 * Vercel exposes `VERCEL_GIT_COMMIT_SHA` to every function, so this is the one
 * honest answer to "is the deploy that contains my change live yet?". The
 * IndexNow workflow polls it before announcing URLs, so a search engine is
 * never told a page changed while the edge is still serving the previous HTML
 * (which is exactly how a submission gets ignored).
 *
 * Nothing here is sensitive — a commit SHA is public in the repository — and
 * nothing is cached, because a cached answer would defeat the probe.
 */
export async function GET() {
  return NextResponse.json(
    {
      service: "lamp-tik",
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? "development",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

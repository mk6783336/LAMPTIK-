import { NextResponse } from "next/server";

import { adsTxtLines } from "@/lib/ads";

export const runtime = "nodejs";

/**
 * IAB `ads.txt`, generated from the configured ad-network records so it can
 * never go stale relative to the environment. Answers 404 while no records
 * are configured — the app never claims a publisher relationship it does not
 * have.
 */
export function GET() {
  if (adsTxtLines.length === 0) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  const body = ["# LAMP TIK advertising authorization", ...adsTxtLines].join("\n") + "\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

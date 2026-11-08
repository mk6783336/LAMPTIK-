import { NextResponse, type NextRequest } from "next/server";

import {
  HOME_TITLE_COOKIE,
  HOME_TITLE_COOKIE_MAX_AGE,
  isCrawler,
  isVariant,
  pickVariant,
} from "@/lib/experiments/home-title";

/**
 * Assigns the homepage title variant, once per visitor.
 *
 * Only `/` is matched: no other route reads the cookie, and running middleware
 * on every request would add a hop to the API routes for nothing.
 *
 * The cookie is written on the *response*, but the first render needs it on the
 * *request* — without the header rewrite below, every first-time visitor would
 * see the control title and only the second pageview would honour the split,
 * which biases the result toward control by the repeat-visit rate. Rewriting
 * `cookie` for this render puts the assigned variant in front of the very first
 * byte of HTML.
 *
 * Crawlers are skipped entirely: no cookie, so `app/(site)/page.tsx` falls back
 * to `control`, and the indexed title stays stable while the test runs.
 */
export const config = {
  matcher: "/",
};

export function middleware(request: NextRequest): NextResponse {
  const existing = request.cookies.get(HOME_TITLE_COOKIE)?.value;
  if (isVariant(existing)) return NextResponse.next();

  const response = NextResponse.next();
  if (isCrawler(request.headers.get("user-agent") ?? "")) return response;

  const variant = pickVariant();
  const headers = new Headers(request.headers);
  const cookie = request.headers.get("cookie");
  headers.set(
    "cookie",
    `${cookie ? `${cookie}; ` : ""}${HOME_TITLE_COOKIE}=${variant}`,
  );

  const assigned = NextResponse.next({ request: { headers } });
  assigned.cookies.set({
    name: HOME_TITLE_COOKIE,
    value: variant,
    path: "/",
    maxAge: HOME_TITLE_COOKIE_MAX_AGE,
    sameSite: "lax",
    // Read by the analytics component to label the pageview, so it cannot be
    // httpOnly. It carries a single word and identifies nobody.
    httpOnly: false,
  });
  return assigned;
}

import { bingSiteAuthUuid } from "@/lib/verification";

/**
 * `BingSiteAuth.xml` — Bing Webmaster Tools' file-verification method.
 *
 * Active only when `BING_SITE_AUTH_UUID` holds the UUID from the account's
 * verification page. Without it the route answers 404 rather than serving an
 * empty `<users>` document: Bing treats a malformed file as a *failed*
 * verification and remembers it, so an unconfigured deploy must stay invisible.
 *
 * The path is fixed by Bing and must stay at the site root — it cannot live
 * under `public/` because the UUID is per-deployment config, not source.
 */
export function GET() {
  if (!bingSiteAuthUuid) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const xml = `<?xml version="1.0"?>\n<users>\n  <user>${bingSiteAuthUuid}</user>\n</users>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // Verifiers fetch this during a check, so a stale CDN copy would let a
      // revoked token keep passing. Revalidate every time.
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}

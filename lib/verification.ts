/**
 * Bing Webmaster Tools verification tokens.
 *
 * Bing will not accept a sitemap, expose crawl stats, or report indexing for a
 * property it cannot prove you own. Until that happens the site is unverified:
 * IndexNow submissions are accepted (`api.indexnow.org` and
 * `www.bing.com/indexnow` both answer `200`) but they land in a queue with no
 * crawl priority attached, which is why a site can submit every URL for weeks
 * and stay at zero pages in the index.
 *
 * The token below was issued by Bing for `https://www.lamptik.online/` and is
 * public by construction: it is served in every page's `<head>`. Hardcoding it
 * is what makes verification work on the deployed site without depending on a
 * Vercel environment variable being present in all three environments — the
 * failure mode that kept this property unverified, with a sitemap detached and
 * 50 URLs discovered but never crawled. An env var still overrides it, which is
 * what a re-issued token needs.
 *
 * An empty `content=""` tag would fail verification silently, so the fallback
 * is a real value rather than an empty string.
 *
 * Two methods are supported because Bing offers both and they verify
 * independently:
 *
 *   1. HTML meta tag  → `msvalidate.01` in `<head>`, read by `rootMetadata`.
 *      Needs the NEXT_PUBLIC_ prefix: metadata is compiled into the RSC payload
 *      and only NEXT_PUBLIC_* values survive that inlining.
 *   2. XML file       → `/BingSiteAuth.xml`, served by a route handler. Server
 *      only, so it keeps its secret-free-but-unprefixed name.
 *
 * The fastest route is neither of these: Bing Webmaster Tools can import the
 * site straight from a verified Google Search Console property, which needs no
 * token at all. See `docs/bing-webmaster-setup.md`.
 */

/**
 * The code Bing Webmaster Tools issued for `https://www.lamptik.online/`.
 *
 * Note the host: the verified property in Bing is the apex `lamptik.online`,
 * which 308-redirects to `www` — so every sitemap URL sat outside the property
 * that owned the crawl budget. This token is for the host that actually serves.
 */
const BING_WWW_VERIFICATION_TOKEN = "CC944CC51BCD8597DE36DD247DE3DD26";

/** `<meta name="msvalidate.01">` content. */
export const bingSiteVerification =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim() || BING_WWW_VERIFICATION_TOKEN;

/**
 * The `<user>` UUID inside `BingSiteAuth.xml`.
 *
 * Constrained to the shape Bing actually issues (hex + dashes) rather than
 * escaped, because this value is interpolated into XML: accepting arbitrary
 * text from the environment would make a misconfigured deploy a way to inject
 * elements into a file crawlers parse.
 */
export const bingSiteAuthUuid = (() => {
  const raw = (process.env.BING_SITE_AUTH_UUID ?? BING_WWW_VERIFICATION_TOKEN).trim();
  if (!raw) return null;
  // Still shape-checked: this value is interpolated into XML, and an override
  // must not become a way to inject elements into a file crawlers parse.
  return /^[A-Za-z0-9-]{8,64}$/.test(raw) ? raw : null;
})();

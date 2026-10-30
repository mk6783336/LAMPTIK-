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
 * Both tokens are issued per account *and* per site, so they cannot be
 * hardcoded — they are read from the environment and every consumer degrades to
 * "render nothing" when they are absent. That keeps an unconfigured preview
 * clean instead of emitting an empty `content=""` tag that fails verification
 * silently.
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

/** `<meta name="msvalidate.01">` content. */
export const bingSiteVerification =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim() || null;

/**
 * The `<user>` UUID inside `BingSiteAuth.xml`.
 *
 * Constrained to the shape Bing actually issues (hex + dashes) rather than
 * escaped, because this value is interpolated into XML: accepting arbitrary
 * text from the environment would make a misconfigured deploy a way to inject
 * elements into a file crawlers parse.
 */
export const bingSiteAuthUuid = (() => {
  const raw = process.env.BING_SITE_AUTH_UUID?.trim();
  if (!raw) return null;
  return /^[A-Za-z0-9-]{8,64}$/.test(raw) ? raw : null;
})();

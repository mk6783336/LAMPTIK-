import { ahrefsAnalyticsKey } from "@/lib/analytics";

/**
 * Ahrefs Web Analytics — `analytics.ahrefs.com`, key `bvFt4FqjILDAl/TYJk2XAA`.
 *
 * A literal `<script async>` rather than `next/script`, and that is the whole
 * point: `afterInteractive` only ships the tag inside the RSC payload and
 * injects it after hydration, so the served HTML has no `<script src>` for
 * Ahrefs' "Recheck installation" crawler to find — and a visitor with
 * JavaScript queued behind a slow font would not be counted until later.
 * The raw element is in the document from the first byte, exactly as the
 * install guide specifies, and `async` keeps it off the critical path.
 *
 * Not consent-gated, unlike GA4: the script sets no cookies and collects no
 * personal data, so there is no storage state to deny. The privacy policy
 * names it alongside Google Analytics so the two statements stay true.
 */
export function AhrefsAnalytics() {
  if (!ahrefsAnalyticsKey) return null;

  return (
    <script
      async
      src="https://analytics.ahrefs.com/analytics.js"
      data-key={ahrefsAnalyticsKey}
    />
  );
}

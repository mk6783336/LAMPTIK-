/**
 * Client IP for rate limiting.
 *
 * Order matters: `x-real-ip` and `cf-connecting-ip` are written by the edge
 * (Vercel / Cloudflare) and cannot be set by the visitor, while
 * `x-forwarded-for` is a list a client can prepend to — trusting its first
 * entry let a caller mint a fresh rate-limit bucket per request just by
 * sending a random header. Platform headers win; the forwarded list is only a
 * local-dev fallback.
 */
export function getClientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const cloudflare = headers.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;

  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown";
}

/**
 * Crisp inline SVG marks — no sprite requests, no icon fonts, colorable via
 * currentColor so they inherit each platform's accent. Platform glyphs are
 * the official brand paths (filled); bento glyphs are custom line icons.
 */

interface IconProps {
  className?: string;
  title?: string;
}

function Svg({
  className,
  title,
  children,
  viewBox = "0 0 24 24",
}: IconProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** TikTok glyph (official note mark), filled. */
export function TikTokIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <use href="#g-tiktok" />
    </svg>
  );
}

/**
 * Instagram glyph (official rounded-lg + lens), filled.
 *
 * The path lives in `components/glyph.tsx` as the `g-instagram` symbol: the
 * homepage drew this 1.8 KB mark three times, and a `<use>` costs 60 bytes.
 */
export function InstagramIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <use href="#g-instagram" />
    </svg>
  );
}

/** Facebook glyph (official "f" in circle), filled. */
export function FacebookIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103.512.06 1.141.195 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12S0 5.417 0 12.044c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}

/** YouTube glyph (official play-button rounded rect), filled. */
export function YouTubeIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
  );
}

/** One lookup for the switcher / badges / pills. */
export function PlatformIcon({
  platform,
  className,
  title,
}: IconProps & { platform: "tiktok" | "instagram" | "facebook" | "youtube" }) {
  if (platform === "instagram") return <InstagramIcon className={className} title={title} />;
  if (platform === "facebook") return <FacebookIcon className={className} title={title} />;
  if (platform === "youtube") return <YouTubeIcon className={className} title={title} />;
  return <TikTokIcon className={className} title={title} />;
}

/* ---------------------------------------------------------------------------
 * Custom bento glyphs — hand-drawn line icons for the platform feature cards.
--------------------------------------------------------------------------- */

/** Resolution frame with play mark — "original 1080p quality". */
export function GlyphResolution({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 8.5V5.5A1.5 1.5 0 0 1 4.5 4h3M16.5 4h3A1.5 1.5 0 0 1 21 5.5v3M21 15.5v3a1.5 1.5 0 0 1-1.5 1.5h-3M7.5 20h-3A1.5 1.5 0 0 1 3 18.5v-3" />
      <path d="M10 9.2v5.6l4.5-2.8L10 9.2Z" />
    </Svg>
  );
}

/** Clapperboard — "every video post type". */
export function GlyphClapper({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 9.5h16a1 1 0 0 1 1 1v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V10.5a1 1 0 0 1 1-1Z" />
      <path d="m3.6 9.3-.8-3.4a1 1 0 0 1 .7-1.2l12.8-3.1a1 1 0 0 1 1.2.7l3.9 1.3" />
      <path d="m8.2 8.4-1.4-6M13 7.3l-1.4-6" />
    </Svg>
  );
}

/** Shield with check — "zero watermark, zero account". */
export function GlyphShield({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3 4.5 6v5.7c0 4.4 3 7.9 7.5 9.3 4.5-1.4 7.5-4.9 7.5-9.3V6L12 3Z" />
      <path d="m9 11.8 2.1 2.1 4.2-4.4" />
    </Svg>
  );
}

/** Long film strip — "long HD videos, 1GB+". */
export function GlyphLongVideo({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M7.5 6v12M16.5 6v12" />
      <path d="M3 10.5h4.5M3 13.5h4.5M16.5 10.5H21M16.5 13.5H21" />
    </Svg>
  );
}

/** Link nodes with spark — "instant short-link resolver". */
export function GlyphLinkBolt({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10 13.8a3.6 3.6 0 0 0 5.2.3l2.4-2.4a3.6 3.6 0 1 0-5.1-5.1l-1.3 1.3" />
      <path d="M14 10.2a3.6 3.6 0 0 0-5.2-.3l-2.4 2.4a3.6 3.6 0 1 0 5.1 5.1l1.2-1.2" />
    </Svg>
  );
}

/** Person with slash — "no account required". */
export function GlyphNoAccount({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="10.5" cy="8" r="3.5" />
      <path d="M4 20c.7-3.2 3.3-5.3 6.5-5.3 1.2 0 2.3.3 3.2.8" />
      <path d="M15.2 17.3 21 21M21 17l-5.8 4" />
    </Svg>
  );
}

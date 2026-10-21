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
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" />
    </svg>
  );
}

/** Instagram glyph (official rounded-square + lens), filled. */
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
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03m0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.795.646-1.44 1.44-1.44.795 0 1.44.646 1.44 1.44z" />
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

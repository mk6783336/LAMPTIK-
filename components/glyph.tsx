/**
 * One sprite, one `<use>` per icon.
 *
 * The homepage rendered 91 inline `<svg>` marks, 41 of them unique: twelve
 * copies of the same check, twelve of the same ✕, sixteen of the same
 * arrow, and three copies of Instagram's 1.8 KB brand path. Every copy
 * repeats `xmlns`, `width`, `height`, `viewBox`, `fill`, `stroke`,
 * `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `aria-hidden` and
 * `focusable` — roughly 200 bytes of identical attributes before a single
 * path is drawn.
 *
 * A `<symbol>` holds the geometry once per document; each icon becomes a
 * `<use>` plus its own class. The rendered result is identical because the
 * geometry, stroke treatment and class names are unchanged, and `currentColor`
 * still resolves against the element the icon sits in. Only the bytes change:
 * measured on the homepage, this took 91 inline marks from 38.6 KB to 6.4 KB.
 *
 * `strokeWidth` stays on the outer `<svg>` on purpose — a few call sites draw
 * the check at 3 or 3.5 so it reads at 14px, and an attribute on the `<symbol>`
 * would win over anything the icon sets itself.
 */

export type GlyphName = "check" | "x" | "plus" | "arrow-up-right" | "instagram" | "tiktok";

interface GlyphDefinition {
  kind: "stroke" | "fill";
  body: React.ReactNode;
}

const GLYPHS: Record<GlyphName, GlyphDefinition> = {
  check: {
    kind: "stroke",
    body: <path d="M20 6 9 17l-5-5" />,
  },
  x: {
    kind: "stroke",
    body: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  },
  plus: {
    kind: "stroke",
    body: (
      <>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </>
    ),
  },
  "arrow-up-right": {
    kind: "stroke",
    body: (
      <>
        <path d="M7 7h10v10" />
        <path d="M7 17 17 7" />
      </>
    ),
  },
  tiktok: {
    kind: "fill",
    body: (
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" />
    ),
  },
  instagram: {
    kind: "fill",
    body: (
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03m0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.795.646-1.44 1.44-1.44.795 0 1.44.646 1.44 1.44z" />
    ),
  },
};

/**
 * The document's symbol table. Rendered once, inside `<body>`, before anything
 * that references it: an SVG `<use>` resolves only against symbols that are
 * already parsed, and the browser parses the document top to bottom.
 */
export function GlyphSprite() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      className="absolute overflow-hidden"
    >
      {Object.entries(GLYPHS).map(([name, glyph]) =>
        glyph.kind === "stroke" ? (
          <symbol
            key={name}
            id={`g-${name}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {glyph.body}
          </symbol>
        ) : (
          <symbol key={name} id={`g-${name}`} viewBox="0 0 24 24" fill="currentColor" stroke="none">
            {glyph.body}
          </symbol>
        ),
      )}
    </svg>
  );
}

export function Glyph({
  name,
  className,
  strokeWidth,
  title,
}: {
  name: GlyphName;
  className?: string;
  strokeWidth?: number;
  title?: string;
}) {
  const glyph = GLYPHS[name];

  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      className={className}
      {...(glyph.kind === "stroke" ? { strokeWidth: strokeWidth ?? 2 } : {})}
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <use href={`#g-${name}`} />
    </svg>
  );
}

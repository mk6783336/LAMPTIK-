/**
 * Obsidian light-mesh backdrop — three soft radial washes (cyan top-left,
 * violet top-right, blue centre) over #050505, a masked hairline grid, and a
 * fine static grain for depth.
 *
 * Performance: every layer is a pre-painted gradient or a tiled SVG. No
 * `filter: blur()` (which caused scroll jank on mid-range Android); the only
 * animation is a 22s transform drift on a composited layer, and it is
 * disabled entirely under prefers-reduced-motion.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-clip"
    >
      <div className="absolute inset-0 bg-[var(--bg)]" />

      {/* Top spotlight — anchors the hero and the tool. */}
      <div
        className="absolute inset-x-0 top-0 h-[820px] opacity-90"
        style={{
          background:
            "radial-gradient(70% 58% at 50% -12%, var(--mesh-a), transparent 68%)",
        }}
      />

      {/* Cyan wash, top-left. Slow drift keeps the page feeling alive without
          repainting the gradient itself. */}
      <div
        className="absolute -left-[18%] -top-[14%] h-[760px] w-[760px] max-w-[95vw] animate-aurora rounded-full opacity-80 [animation-delay:-6s]"
        style={{
          background:
            "radial-gradient(closest-side, var(--mesh-a), transparent 72%)",
        }}
      />

      {/* Violet wash, top-right. */}
      <div
        className="absolute -right-[20%] top-[2%] h-[720px] w-[720px] max-w-[95vw] animate-aurora rounded-full opacity-85 [animation-delay:-13s]"
        style={{
          background:
            "radial-gradient(closest-side, var(--mesh-b), transparent 72%)",
        }}
      />

      {/* Cool blue core, low opacity — stops the two top washes fighting. */}
      <div
        className="absolute left-1/2 top-[26%] h-[560px] w-[900px] max-w-[110vw] -translate-x-1/2 opacity-70"
        style={{
          background:
            "radial-gradient(closest-side, var(--mesh-c), transparent 74%)",
        }}
      />

      {/* Structure: hairline grid confined to the hero zone. */}
      <div className="hairline-grid absolute inset-x-0 top-0 h-[780px] [mask-image:radial-gradient(ellipse_74%_64%_at_50%_0%,black_8%,transparent_78%)]" />

      {/* Static film grain. A 160px tile, painted once. */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          opacity: "var(--noise-opacity)",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Bottom anchor so long pages settle into the canvas. */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-[var(--bg)]" />
    </div>
  );
}

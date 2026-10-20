import { cn } from "@/lib/cn";
import {
  GlyphClapper,
  GlyphLinkBolt,
  GlyphLongVideo,
  GlyphNoAccount,
  GlyphResolution,
  GlyphShield,
} from "@/components/platform-icons";
import type { Platform } from "@/lib/platforms";

/**
 * Bento capability grid: claims you can actually check, each carrying a custom
 * line icon tinted by the platform accent system. Two tiles on the first row
 * and one wide "instrument" tile beneath — a real bento rhythm that collapses
 * to a single column on phones (1 → 2 → 3 columns).
 */
interface BentoContent {
  heading: string;
  subheading: string;
  cards: Array<{ title: string; body: string; icon: React.ReactNode }>;
  footer: Array<[string, string]>;
}

const BENTO: Record<Platform, BentoContent> = {
  tiktok: {
    heading: "Built for TikTok",
    subheading:
      "The clean source stream — the same MP4 TikTok's own player uses, served straight to your device.",
    cards: [
      {
        title: "1080p, no watermark burned in",
        body: "The original upload at its highest resolution — never a re-encoded, logo-stamped share copy.",
        icon: <GlyphResolution className="size-5" />,
      },
      {
        title: "vt/vm short links resolved",
        body: "Share-sheet short links are followed server-side to the video ID before a single byte moves.",
        icon: <GlyphLinkBolt className="size-5" />,
      },
      {
        title: "Zero account required",
        body: "No login, no app, no extension. Your links are resolved and never stored.",
        icon: <GlyphNoAccount className="size-5" />,
      },
    ],
    footer: [
      ["Format", "MP4 · MP3"],
      ["Max quality", "1080p source"],
      ["Storage", "None"],
    ],
  },
  instagram: {
    heading: "Built for Reels",
    subheading:
      "Everything Instagram exposes publicly, extracted cleanly — original quality, no watermark, no login.",
    cards: [
      {
        title: "1080p original Reels",
        body: "The exact MP4 Instagram's player streams — original resolution, zero re-encoding, nothing burned into the frame.",
        icon: <GlyphResolution className="size-5" />,
      },
      {
        title: "Every video post type",
        body: "instagram.com/reel/, /reels/, /p/, /tv/ and legacy instagr.am links all resolve to a clean stream.",
        icon: <GlyphClapper className="size-5" />,
      },
      {
        title: "Zero watermark or account",
        body: "No login, no app, no sign-up. Links resolve server-side and are never stored.",
        icon: <GlyphShield className="size-5" />,
      },
    ],
    footer: [
      ["Format", "MP4"],
      ["Max quality", "Original HD"],
      ["Storage", "None"],
    ],
  },
  facebook: {
    heading: "Built for long Facebook video",
    subheading:
      "Watch pages, Reels, and shared links — including hour-long uploads that other downloaders choke on.",
    cards: [
      {
        title: "Long Facebook HD videos (1GB+)",
        body: "Full-length Watch videos and page uploads download at native HD quality, however long they run.",
        icon: <GlyphLongVideo className="size-5" />,
      },
      {
        title: "Instant fb.watch & share resolver",
        body: "fb.watch and facebook.com/share/v/ short links expand server-side, following every redirect inside Facebook's own hosts.",
        icon: <GlyphLinkBolt className="size-5" />,
      },
      {
        title: "Zero watermark or account",
        body: "No login, no app, no sign-up. The MP4 saves straight to your device.",
        icon: <GlyphNoAccount className="size-5" />,
      },
    ],
    footer: [
      ["Format", "MP4"],
      ["Long videos", "1GB+"],
      ["Storage", "None"],
    ],
  },
};

export function PlatformBento({ platform }: { platform: Platform }) {
  const content = BENTO[platform];

  return (
    <section className="section-pad border-t border-[var(--line)]">
      <div className="shell">
        <p className="eyebrow">
          <span aria-hidden="true" className="eyebrow-dot" />
          capabilities
        </p>
        <h2 className="balance mt-4 text-[1.75rem] font-semibold leading-tight tracking-headline sm:text-4xl">
          {content.heading}
        </h2>
        <p className="pretty mt-3 max-w-xl text-[14.5px] leading-relaxed text-[var(--text-2)]">
          {content.subheading}
        </p>

        <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-6">
          {content.cards.slice(0, 2).map((card) => (
            <article key={card.title} className="bento-card flex flex-col lg:col-span-3">
              <span data-accent={platform} className="bento-icon">
                {card.icon}
              </span>
              <h3 className="balance mt-6 text-[16px] font-semibold leading-snug tracking-tight">
                {card.title}
              </h3>
              <p className="pretty mt-2 text-[13.5px] leading-relaxed text-[var(--text-2)]">
                {card.body}
              </p>
            </article>
          ))}

          {/* Wide instrument tile: the third claim plus the hard facts. */}
          <article className="bento-card sm:col-span-2 lg:col-span-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full opacity-60"
              style={{
                background:
                  "radial-gradient(closest-side, var(--accent-soft), transparent)",
              }}
            />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <span data-accent={platform} className="bento-icon">
                  {content.cards[2].icon}
                </span>
                <div className="min-w-0">
                  <h3 className="balance text-[16px] font-semibold leading-snug tracking-tight">
                    {content.cards[2].title}
                  </h3>
                  <p className="pretty mt-1.5 max-w-md text-[13.5px] leading-relaxed text-[var(--text-2)]">
                    {content.cards[2].body}
                  </p>
                </div>
              </div>

              <dl className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
                {content.footer.map(([term, value]) => (
                  <div
                    key={term}
                    className={cn(
                      "min-w-0 rounded-[12px] border border-[var(--glass-border)] bg-[var(--field)] px-3 py-2",
                    )}
                  >
                    <dt className="micro truncate text-[9.5px] text-[var(--text-3)]">{term}</dt>
                    <dd className="mt-1 truncate font-mono text-[12px] tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

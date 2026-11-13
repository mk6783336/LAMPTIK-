import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * In-content links to the two pages Google has never crawled.
 *
 * `/facebook-video-downloader` and `/twitter-video-downloader` both answer 200,
 * carry `index, follow`, a self-canonical and a sitemap entry — and URL
 * Inspection still reports "URL is unknown to Google · never crawled" while
 * every page around them is indexed. The links that reached them were the ones
 * a crawler walks last: header nav, the footer column, and one strip on
 * `/youtube-downloader`.
 *
 * This block puts them inside the body of the pages Google does crawl, with
 * anchor text that describes the destination instead of repeating the H1. The
 * anchors differ per host platform on purpose: eleven copies of the same
 * sentence is a boilerplate signal, which is exactly what the footer already
 * provides and was not enough.
 *
 * It renders as ordinary in-flow content: no fixed positioning, no overlay, and
 * two wrapped cards so it cannot overflow at 390px or cover the Download CTA.
 */
export type BridgeHost = "tiktok" | "instagram" | "facebook" | "youtube" | "guide";

interface Destination {
  href: string;
  anchor: string;
  note: string;
}

const FACEBOOK: Record<BridgeHost, Destination | null> = {
  tiktok: {
    href: "/facebook-video-downloader",
    anchor: "Facebook video downloader — Watch uploads and fb.watch links",
    note: "The same paste-and-save flow for Facebook: Watch videos, page uploads, Reels and fb.watch short links, up to the HD rendition the uploader published.",
  },
  instagram: {
    href: "/facebook-video-downloader",
    anchor: "Facebook Reels and Watch videos, saved the same way",
    note: "Reels, page uploads and fb.watch links all resolve from one paste, and long Watch uploads stream to your disk instead of buffering on a server first.",
  },
  facebook: null,
  youtube: {
    href: "/facebook-video-downloader",
    anchor: "Facebook video downloader (Watch, Reels, fb.watch)",
    note: "Returns the highest rendition Facebook actually published, and says so when the uploader only posted SD.",
  },
  guide: {
    href: "/facebook-video-downloader",
    anchor: "facebook video downloader without a watermark",
    note: "Watch uploads, page videos, Reels and fb.watch links, in the resolution the uploader posted.",
  },
};

const TWITTER: Record<BridgeHost, Destination | null> = {
  tiktok: {
    href: "/twitter-video-downloader",
    anchor: "Twitter / X video downloader — a post link to MP4",
    note: "Every MP4 X published for a post is listed best-first — a 4K upload offers a 4K file — and GIFs arrive as the looping MP4 X stores them as.",
  },
  instagram: {
    href: "/twitter-video-downloader",
    anchor: "X / Twitter posts and GIFs, saved as MP4",
    note: "Paste an x.com or twitter.com post link and the resolver returns the video or GIF in the quality X served — no account needed.",
  },
  facebook: {
    href: "/twitter-video-downloader",
    anchor: "Twitter / X video downloader for the cross-post",
    note: "The X side of the same workflow: a post link in, an MP4 out, no login and no watermark to remove.",
  },
  youtube: {
    href: "/twitter-video-downloader",
    anchor: "Twitter / X video downloader (MP4, X's own resolutions)",
    note: "For the clips people quote from X: the post link resolves to the video or GIF without an account.",
  },
  guide: {
    href: "/twitter-video-downloader",
    anchor: "x / twitter video downloader 1080p",
    note: "Public posts and GIFs, in the qualities X published, with no login and nothing kept on the server.",
  },
};

export function PlatformBridge({ host }: { host: BridgeHost }) {
  const links = [FACEBOOK[host], TWITTER[host]].filter(
    (link): link is Destination => link !== null,
  );

  return (
    <section
      aria-labelledby="platform-bridge-heading"
      className="shell mt-10 sm:mt-12"
    >
      <h2
        id="platform-bridge-heading"
        className="text-sm font-semibold tracking-tight text-[var(--text-2)]"
      >
        The other two networks, with the same resolver
      </h2>
      <ul className="mt-3 grid gap-3.5 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href} className="min-w-0">
            <Link href={link.href} className="bento-card group flex h-full flex-col">
              <span className="flex items-start justify-between gap-2 text-sm font-semibold leading-snug tracking-tight">
                {link.anchor}
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-[var(--text-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
              <span className="pretty mt-1.5 block text-sm leading-relaxed text-[var(--text-2)]">
                {link.note}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

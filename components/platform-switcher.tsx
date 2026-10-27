"use client";

import Link from "next/link";

import { PlatformIcon } from "@/components/platform-icons";
import { cn } from "@/lib/cn";
import { PLATFORM_LIST, PLATFORMS, type Platform } from "@/lib/platforms";

/**
 * Glassmorphism segmented switcher — TikTok Downloader / Instagram Reels /
 * Facebook HD, rendered above the URL input on every downloader page.
 * Plain `<Link prefetch={true}>`: the App Router serves prefetched RSC
 * payloads from cache, so a switch paints the next page with no refetch and
 * no full-document flicker.
 *
 * `data-platform` / `data-platform-from` exist for the GA4 click listener in
 * `components/google-analytics.tsx`, which reports every switch as
 * `platform_switch { from, to }` without making the links client-side.
 */
export function PlatformSwitcher({ active }: { active: Platform }) {
  return (
    <nav aria-label="Choose a downloader platform" className="seg-bar">
      {PLATFORM_LIST.map((id) => {
        const config = PLATFORMS[id];
        const isActive = id === active;
        return (
          <Link
            key={id}
            href={config.path}
            prefetch={true}
            aria-current={isActive ? "page" : undefined}
            data-platform={id}
            data-platform-from={active}
            className={cn("seg-item", isActive && "is-active")}
          >
            <PlatformIcon platform={id} className="size-4 shrink-0" />
            <span className="whitespace-nowrap sm:hidden">{config.shortLabel}</span>
            <span className="hidden whitespace-nowrap sm:inline">{config.switcherLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}

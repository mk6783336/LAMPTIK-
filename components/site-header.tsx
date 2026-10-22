"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/logo";
import { LibraryButton } from "@/components/library";
import { PlatformIcon } from "@/components/platform-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";
import type { Platform } from "@/lib/platforms";

/**
 * One click to every surface: TikTok / Instagram Reels / Facebook / YouTube,
 * plus Guides and the optional Android app. All four platforms are open to
 * every visitor — nothing is gated behind an install.
 *
 * The desktop row appears at `lg` (not `md`): six destinations plus the logo,
 * library, CTA and theme toggle need the full 1152px shell to stay on one
 * line, and the strip below carries the same links on smaller screens.
 */
const NAV = [
  { href: "/", label: "TikTok", short: "TikTok", platform: "tiktok" as Platform },
  {
    href: "/instagram-reels-downloader",
    label: "Instagram",
    short: "Reels",
    platform: "instagram" as Platform,
  },
  {
    href: "/facebook-video-downloader",
    label: "Facebook",
    short: "Facebook",
    platform: "facebook" as Platform,
  },
  {
    href: "/youtube-downloader",
    label: "YouTube",
    short: "YouTube",
    platform: "youtube" as Platform,
  },
  { href: "/guides", label: "Guides", short: "Guides", platform: null },
  { href: "/app-download", label: "📱 App", short: "App", platform: null },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[2147483647] isolate pt-3 sm:pt-4">
      {/* Scrim: fades the page out behind the floating bar so content never
          shows through the gutter above a sticky header. */}
      <div
        aria-hidden="true"
        className="header-scrim pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+0.5rem)]"
      />
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-6">
        <div className="glass overflow-hidden rounded-2xl shadow-[0_24px_60px_-48px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
          <div className="flex h-14 items-center justify-between gap-2 pl-3 pr-2 sm:pl-4 sm:pr-2.5">
            <Logo />

            <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
              {NAV.map((item) => {
                const active = isCurrent(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    aria-current={active ? "page" : undefined}
                    data-accent={item.platform ?? undefined}
                    className={cn(
                      "group relative flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors duration-200",
                      active
                        ? "bg-[var(--field-strong)] text-[var(--text)] shadow-[inset_0_1px_0_0_var(--highlight)]"
                        : "text-[var(--text-2)] hover:bg-[var(--field)] hover:text-[var(--text)]",
                    )}
                  >
                    {item.platform ? (
                      <PlatformIcon
                        platform={item.platform}
                        className={cn(
                          "size-[15px] shrink-0 transition-colors duration-200",
                          active ? "text-[var(--tool-ink)]" : "text-[var(--text-3)]",
                        )}
                      />
                    ) : null}
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <LibraryButton />
              <Link
                href="/#tool"
                className="btn btn-primary hidden h-9 gap-1.5 px-3.5 text-sm font-semibold sm:inline-flex"
              >
                Open downloader
                <ArrowUpRight className="size-3.5" />
              </Link>
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile: platform switchers as one swipeable glass row — every
              destination stays a single tap away. */}
          <nav
            aria-label="Downloader platforms"
            className="nav-strip border-t border-[var(--glass-border)] lg:hidden"
          >
            {NAV.map((item) => {
              const active = isCurrent(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  aria-current={active ? "page" : undefined}
                  data-accent={item.platform ?? undefined}
                  className={cn(
                    // Compact on phones so all six destinations (four platforms,
                    // Guides, App) fit one 390px row without a hidden "scroll for
                    // more" affordance; the row still swipes on 320px screens.
                    "shrink-0 whitespace-nowrap rounded-full px-1.5 py-1.5 text-[12px] transition-colors duration-200 sm:px-2.5 sm:text-sm",
                    active
                      ? item.platform
                        ? "tool-pill px-1.5 py-1.5 sm:px-2.5"
                        : "border border-[var(--glass-border)] bg-[var(--field-strong)] text-[var(--text)]"
                      : "text-[var(--text-2)]",
                  )}
                >
                  {item.short}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

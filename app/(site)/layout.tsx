import type { Metadata, Viewport } from "next";

import { RootDocument } from "@/components/root-document";
import { rootMetadata, rootViewport } from "@/lib/root-metadata";

/**
 * Root layout for every English route: the tool pages, the hub, guides, the
 * app/extension page and the legal pages.
 *
 * `app/(site)` and `app/(i18n)/[lang]` are two root layouts because `<html
 * lang>` can only be set here, and the locale is only known inside the
 * `[lang]` segment. Route groups do not change URLs: every path that existed
 * before this split still resolves to the same address.
 */
export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = rootViewport;

export default function SiteRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <RootDocument lang="en">{children}</RootDocument>;
}

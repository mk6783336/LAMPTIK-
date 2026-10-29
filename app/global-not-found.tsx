import type { Metadata } from "next";

import { NotFoundView } from "@/components/not-found-view";
import { RootDocument } from "@/components/root-document";

/**
 * The 404 for a URL that matches no route at all.
 *
 * With two root layouts, an unmatched path belongs to neither group, so there
 * is no layout to supply `<html>`/`<body>` — Next renders its built-in
 * unstyled 404 unless this file exists (and `experimental.globalNotFound` is
 * on, see next.config.ts). It documents itself through the same RootDocument
 * the two layouts use, so the error page keeps the header, footer, theme boot
 * script and analytics instead of dropping to a bare "This page could not be
 * found".
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <RootDocument lang="en">
      <NotFoundView />
    </RootDocument>
  );
}

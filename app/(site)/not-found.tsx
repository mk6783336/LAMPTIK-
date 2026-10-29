import type { Metadata } from "next";

import { NotFoundView } from "@/components/not-found-view";

/** `notFound()` calls from inside the (site) group land here. */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundView />;
}

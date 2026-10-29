import type { Metadata, Viewport } from "next";

import { RootDocument } from "@/components/root-document";
import { getLanding, isLocaleCode } from "@/lib/i18n";
import { rootMetadata, rootViewport } from "@/lib/root-metadata";

/**
 * Root layout for the four translated landings.
 *
 * The document language and direction come from the landing itself
 * (`lib/i18n/<code>.ts`), so `/ar` ships `lang="ar" dir="rtl"` and the other
 * three ship their own BCP-47 tag. Before this, every page inherited
 * `lang="en"` from the single root layout, which is exactly what the 29 Oct
 * audit flagged as "hreflang and HTML lang mismatch" on these four URLs.
 *
 * `dynamicParams = false` on the page keeps this from acting as a catch-all:
 * an unknown first segment still returns a 404, and an unknown `lang` here
 * falls back to English rather than rendering a document with no language.
 */
export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = rootViewport;

export default async function LocaleRootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const copy = isLocaleCode(lang) ? getLanding(lang) : null;

  return (
    <RootDocument lang={copy?.htmlLang ?? "en"} dir={copy?.dir ?? "ltr"}>
      {children}
    </RootDocument>
  );
}

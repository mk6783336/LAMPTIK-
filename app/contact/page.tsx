import type { Metadata } from "next";
import Link from "next/link";

import { AmbientBackground } from "@/components/ambient-background";
import { ContactForm } from "@/components/contact-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact & DMCA",
  description:
    "Contact LAMP TIK at support@lamptik.online — general support, privacy questions, and a clear DMCA copyright takedown process for rights holders.",
  alternates: { canonical: "/contact" },
  openGraph: {
    images: ["/opengraph-image"],
    title: `Contact & DMCA · ${siteConfig.name}`,
    description:
      "Reach the LAMP TIK team for support and submit DMCA takedown notices at support@lamptik.online.",
    url: "/contact",
    type: "website",
  },
};

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteConfig.name,
        url: siteUrl,
        email: "support@lamptik.online",
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: siteConfig.name,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en",
      },
      {
    "@type": "ContactPage",
    name: "Contact LAMP TIK",
    url: `${siteUrl}/contact`,
    dateModified: "2026-10-19",
    mainEntity: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <AmbientBackground />

      <div className="flex min-h-dvh flex-col">
        <SiteHeader />

        <main className="flex-1">
          <article className="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:px-6 sm:pt-16">
            <nav aria-label="Breadcrumb" className="micro text-[var(--text-3)]">
              <Link href="/" className="hover:text-[var(--text-2)]">
                Home
              </Link>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span>Contact</span>
            </nav>

            <h1 className="mt-4 text-[2rem] font-semibold leading-tight tracking-headline sm:text-[2.6rem]">
              Contact &amp; DMCA
            </h1>
            <p className="mt-3 text-[13.5px] text-[var(--text-3)]">
              Last updated: October 19, 2026
            </p>

            <div className="mt-8 space-y-9 text-[14.5px] leading-relaxed text-[var(--text-2)]">
              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Get in touch
                </h2>
                <p className="mt-2">
                  For support, bug reports, privacy questions, or business
                  inquiries, email{" "}
                  <a
                    href="mailto:support@lamptik.online"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    support@lamptik.online
                  </a>{" "}
                  or use the form below. We aim to reply within 2 business
                  days. If a video isn&apos;t resolving, include the exact link
                  and what error you saw — that alone usually tells us what
                  went wrong.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
                  Contact form
                </h2>
                <ContactForm />
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Copyright &amp; DMCA takedown requests
                </h2>
                <p className="mt-2">
                  LAMP TIK respects intellectual property rights and complies
                  with the Digital Millennium Copyright Act. We do not host,
                  store, or claim rights over creator content — the tool simply
                  resolves public streams. If you believe material accessible
                  through this service infringes your copyright, contact us at{" "}
                  <a
                    href="mailto:support@lamptik.online?subject=DMCA%20Takedown%20Notice"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    support@lamptik.online
                  </a>{" "}
                  with the subject line &ldquo;DMCA Takedown Notice&rdquo; and
                  include all of the following:
                </p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "A physical or electronic signature of the copyright owner or an authorized agent.",
                    "Identification of the copyrighted work you claim has been infringed.",
                    "The exact TikTok URL(s) and the specific LAMP TIK request link(s) at issue.",
                    "Your contact information: name, email, mailing address, and phone number.",
                    "A good-faith statement that the disputed use is not authorized by you, your agent, or the law.",
                    "A statement, under penalty of perjury, that the notice is accurate and you are the rights holder or authorized to act.",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">
                  Valid notices are reviewed promptly — typically actioned
                  within 48 hours by blocking the affected URL(s) from the
                  tool. Please note that knowingly submitting a fraudulent
                  notice may carry legal consequences.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Before you write
                </h2>
                <p className="mt-2">
                  Many questions are answered instantly in our{" "}
                  <Link
                    href="/guides"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    guides
                  </Link>{" "}
                  — especially the troubleshooting ones on broken short links
                  and unavailable videos. For how we handle your data, see the{" "}
                  <Link
                    href="/privacy"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    privacy policy
                  </Link>
                  ; for the rules of using the service, see our{" "}
                  <Link
                    href="/terms"
                    className="text-[var(--accent-text)] underline underline-offset-4"
                  >
                    terms
                  </Link>
                  .
                </p>
              </section>
            </div>
          </article>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

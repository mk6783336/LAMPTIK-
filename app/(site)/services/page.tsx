import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, Chrome, Server, Smartphone, Zap } from "lucide-react";

import { AmbientBackground } from "@/components/ambient-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig, siteUrl } from "@/lib/site";

/**
 * Services page.
 *
 * This is the one page on the site whose job is not a download — it converts a
 * visitor into a paying client. That is also why it carries **no ad slots**: a
 * page asking for a build contract while an Adsterra banner offers a competitor
 * downloader two rows below reads as a hobby, not a business.
 *
 * Everything claimed here is true of the codebase that hosts it: this site is
 * a Next.js 15 App Router app, the resolver is a Python service reached over a
 * Cloudflare tunnel, and the same repository ships a Manifest V3 extension and
 * a signed Android client. No invented client counts, testimonials or prices —
 * the quote is per project and stated in writing before any code is written.
 */

export const metadata: Metadata = {
  title: "Web & App Build Services — Next.js, APIs, Android",
  description:
    "Custom Next.js web apps, media and downloader tools, Chrome extensions and Android apps — built by the developer behind LampTik. Fixed quote after a brief.",
  alternates: { canonical: "/services" },
  keywords: [
    "hire next.js developer",
    "custom web app development",
    "chrome extension developer",
    "android app developer",
    "media downloader development",
    "api development services",
  ],
  openGraph: {
    images: ["/opengraph-image"],
    title: `Build services · ${siteConfig.name}`,
    description:
      "Web apps, media tools, Chrome extensions and Android clients — built by the developer behind LampTik.",
    url: "/services",
    type: "website",
  },
};

const OFFERINGS = [
  {
    icon: Zap,
    title: "Next.js web apps",
    body: "App Router, TypeScript strict, server rendering where it helps and static output where it is faster. Deployed to Vercel with the environment, analytics and security headers already decided — not left as a TODO for you.",
    points: ["Marketing site or full product", "Auth, dashboards, payments", "Core Web Vitals kept green"],
  },
  {
    icon: Server,
    title: "Media & downloader tools",
    body: "The hardest part of a downloader is not the button, it is everything behind it: short-link resolution, signature handling, transcoding, and an upstream that changes behaviour without warning. This is the stack running the site you are on.",
    points: ["Stream resolution & fallbacks", "MP4 / M4A / MP3 pipelines", "Cloud bridges that survive IP blocks"],
  },
  {
    icon: Chrome,
    title: "Chrome extensions (MV3)",
    body: "Manifest V3 extensions with a service worker, content scripts and a popup that stay inside current Web Store policy — including the parts most extensions fail on review.",
    points: ["MV3 service-worker architecture", "Store-policy review pass", "Update & publish pipeline"],
  },
  {
    icon: Smartphone,
    title: "Android apps",
    body: "Native clients signed and shipped outside the Play Store when the app store rules would reject the category, with a CI build that produces the APK on every release.",
    points: ["Native Android UI", "Signed release builds in CI", "Direct APK distribution"],
  },
] as const;

const STEPS = [
  {
    title: "Brief",
    body: "One call or a few emails. What the thing does, who uses it, what an unhappy user looks like, and what \u201cdone\u201d means. If I am not the right fit I say so at this stage.",
  },
  {
    title: "Fixed quote",
    body: "Scope, price and dates in writing before any code. No hourly drift, no surprise invoice when the estimate was wrong — that risk is mine, not yours.",
  },
  {
    title: "Build in slices",
    body: "You get a working URL every week, not a status report. Anything that turns out to be impossible shows up early, while it is still cheap to change.",
  },
  {
    title: "Launch & handover",
    body: "Repository, deploy configuration and a written runbook of what each service does and how to restart it. No lock-in, no private framework only I can edit.",
  },
] as const;

const FIT_YES = [
  "You need a working tool, not a deck.",
  "You have a clear outcome: people download, sign up, buy, or upload.",
  "You are happy to see it in weekly increments and steer early.",
  "You want the source and the deploy access at the end.",
];

const FIT_NO = [
  "Content farms, doorway pages or mass-generated location pages.",
  "Clones of a trademarked brand, or an app that scrapes behind a login.",
  "Bypassing DRM, paywalls or region locks.",
  "Anything that needs a traffic bot or a fake engagement panel.",
];

export default function ServicesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${siteUrl}/services#service`,
        name: "Web and app build services",
        url: `${siteUrl}/services`,
        serviceType: [
          "Next.js web application development",
          "Media and downloader tool development",
          "Chrome extension development",
          "Android application development",
          "API and backend integration",
        ],
        description:
          "Custom Next.js web applications, media and downloader tools, Manifest V3 Chrome extensions and native Android clients, built by the developer behind LampTik.",
        provider: { "@id": `${siteUrl}/#organization` },
        areaServed: { "@type": "Place", name: "Worldwide" },
        availableChannel: {
          "@type": "ServiceChannel",
          serviceUrl: `${siteUrl}/contact`,
        },
      },
      {
        "@type": "OfferCatalog",
        name: "Build services",
        itemListElement: OFFERINGS.map((offering) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: offering.title,
            description: offering.body,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/services#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Services", item: `${siteUrl}/services` },
        ],
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
          <section className="shell pb-6 pt-12 sm:pt-16">
            <div className="mx-auto max-w-3xl">
              <nav aria-label="Breadcrumb" className="micro flex items-center gap-2 text-[var(--text-3)]">
                <Link href="/" className="hover:text-[var(--text-2)]">
                  Home
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-[var(--text-2)]">Services</span>
              </nav>

              <p className="micro mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--field)] px-2.5 py-1 text-[var(--text-2)]">
                <Zap className="size-3 text-[var(--accent-text)]" />
                Available for new builds
              </p>

              <h1 className="balance mt-5 text-4xl font-semibold leading-[1.05] tracking-headline sm:text-6xl">
                Web tools, built to ship.
              </h1>

              <p className="pretty mt-5 max-w-2xl text-base leading-relaxed text-[var(--text-2)] sm:text-lg">
                I build the kind of software this site runs on — Next.js apps, media
                pipelines, Chrome extensions and Android clients — and I hand it over
                with the source, the deploy access and a runbook. Built by Shahid Zaib,
                the developer behind LampTik.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/contact" className="btn btn-primary h-11 gap-2 px-5 text-sm font-semibold">
                  Start a project
                  <ArrowUpRight className="size-4" />
                </Link>
                <Link href="/#tool" className="btn btn-secondary h-11 px-5 text-sm font-medium">
                  See what I built
                </Link>
              </div>

              <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--line)] pt-6 sm:grid-cols-4">
                {[
                  ["Working stack", "Next.js 15"],
                  ["Ships with", "Source & CI"],
                  ["Quoted", "Per project"],
                  ["Time zones", "Any"],
                ].map(([term, value]) => (
                  <div key={term} className="min-w-0">
                    <dt className="micro text-[var(--text-3)]">{term}</dt>
                    <dd className="mt-1 text-sm font-medium text-[var(--text)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="shell pb-4 pt-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What I build</h2>
              <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                Four kinds of work, all of them things this repository already proves I can
                ship — not a list of everything a web agency might attempt.
              </p>
            </div>

            <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
              {OFFERINGS.map((offering) => (
                <article key={offering.title} className="panel flex flex-col p-5">
                  <offering.icon className="size-5 text-[var(--accent-text)]" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-semibold text-[var(--text)]">{offering.title}</h3>
                  <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                    {offering.body}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {offering.points.map((point) => (
                      <li key={point} className="flex gap-2 text-sm text-[var(--text-2)]">
                        <Check className="mt-0.5 size-4 shrink-0 text-[var(--ok)]" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="shell pt-14">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
              <ol className="mt-7 space-y-6">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="micro mt-1 shrink-0 tabular-nums text-[var(--text-3)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-[var(--text)]">{step.title}</h3>
                      <p className="pretty mt-1.5 text-sm leading-relaxed text-[var(--text-2)]">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="shell pt-14">
            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
              <div className="panel p-5">
                <h2 className="text-base font-semibold text-[var(--text)]">A good fit if…</h2>
                <ul className="mt-3 space-y-2.5">
                  {FIT_YES.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-[var(--text-2)]">
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--ok)]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel p-5">
                <h2 className="text-base font-semibold text-[var(--text)]">Not a fit if…</h2>
                <ul className="mt-3 space-y-2.5">
                  {FIT_NO.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-[var(--text-3)]">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--text-3)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="shell py-14">
            <div className="panel relative mx-auto max-w-3xl overflow-hidden p-6 sm:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full opacity-70"
                style={{
                  background: "radial-gradient(closest-side, var(--mesh-b), transparent 72%)",
                }}
              />
              <div className="relative">
                <h2 className="balance text-2xl font-semibold tracking-tight sm:text-3xl">
                  Tell me what you need built.
                </h2>
                <p className="pretty mt-2 max-w-lg text-sm leading-relaxed text-[var(--text-2)]">
                  A short brief is enough to get a fixed quote back — what it does, who uses
                  it, and your deadline. If the scope is unclear I will ask rather than guess
                  at a number.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link href="/contact" className="btn btn-primary h-11 gap-2 px-5 text-sm font-semibold">
                    Send a brief
                    <ArrowUpRight className="size-4" />
                  </Link>
                  <a
                    href="mailto:support@lamptik.online?subject=Project%20brief"
                    className="btn btn-secondary h-11 px-5 text-sm font-medium"
                  >
                    support@lamptik.online
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

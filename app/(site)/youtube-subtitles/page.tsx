import type { Metadata } from "next";

import { AdSlot } from "@/components/ads/AdSlot";
import { AmbientBackground } from "@/components/ambient-background";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import {
  breadcrumbNode,
  faqPageNode,
  howToNode,
  JsonLd,
  webApplicationNode,
} from "@/components/seo/JsonLd";
import { ToolBridge } from "@/components/seo/tool-bridge";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { YouTubeSubtitlesTool } from "@/components/youtube-subtitles-tool";
import { pageAlternates, siteUrl } from "@/lib/site";

/**
 * /youtube-subtitles — captions and transcripts as a file.
 *
 * Why this page exists: "youtube subtitles downloader" and "youtube transcript
 * downloader" are a different intent from "youtube video downloader" — the
 * visitor wants the text, or a sidecar file for an editor, and the video pages
 * cannot serve that. It is built on the same Innertube player response the
 * resolver already makes (see lib/youtube-captions.ts) rather than on a
 * transcription model, so it only ever offers captions YouTube actually has.
 *
 * The claim it deliberately does not make: nothing here transcribes audio.
 */

/** 57 chars, keyword first. */
const TITLE = "YouTube Subtitles & Transcript Downloader — SRT, VTT, TXT";
const SOCIAL_TITLE = "YouTube Subtitles Downloader — every caption track as SRT, VTT or TXT";
const DESCRIPTION =
  "Download a YouTube video's subtitles as SRT, VTT or plain text — every caption track YouTube publishes, manual or auto-generated. Free, no account, no app.";

const FAQS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "How do I download subtitles from a YouTube video?",
    answer:
      "Paste the video link above and the page lists the caption tracks that video really has. Pick a language and a format: SRT keeps cue numbers and comma decimal timings, VTT is the WEBVTT file browsers and HTML5 players load, and TXT drops the timings and leaves the spoken text. Each download goes straight to your browser's download manager — nothing is stored on this site.",
  },
  {
    question: "Are auto-generated captions good enough to publish?",
    answer:
      "For a rough transcript, search or note-taking, usually yes. For anything published under your name, no: YouTube's speech recognition guesses names, numbers and punctuation, and it writes [Music] for instrumental stretches. Every track is labelled auto-generated in the list, so a machine transcript is never presented as the creator's own subtitles. Read it through, then fix the parts that matter.",
  },
  {
    question: "Does it work for any language?",
    answer:
      "It covers every track YouTube publishes for the video, not a fixed list — a Japanese video with only Japanese captions returns Japanese, and an English video with twenty translated tracks returns all twenty. Manual tracks are listed before auto-generated ones for the same language, so the creator's own file is the first thing you can pick.",
  },
  {
    question: "Why does the page say this video has no captions?",
    answer:
      "Because YouTube's player response contains no caption tracks for it. That happens when the uploader never added subtitles and YouTube's speech recognition had nothing usable to work with — music-only videos, silent footage or very short clips. The page says so instead of generating a transcript from the audio, because an invented transcript would be a worse answer than none.",
  },
  {
    question: "Can I get the transcript without timestamps?",
    answer:
      "Yes — choose TXT. It returns one spoken line per row with the cue numbering and timings removed, which is what most people want for a blog quote, a summary or a search. If you need the timings later, SRT and VTT keep them, and both open in Premiere, Final Cut, DaVinci Resolve and CapCut.",
  },
  {
    question: "Can I reuse someone else's subtitles?",
    answer:
      "Subtitles are a creative work with the same copyright as the video they sit on. Downloading them for accessibility, study, translation or personal notes is the ordinary use; republishing a full transcript of someone else's video as your own content is not, and YouTube's own reuse rules apply on top of copyright. When in doubt, ask the creator — most are happy to be quoted with credit.",
  },
];

const STEPS: ReadonlyArray<readonly [string, string]> = [
  [
    "Paste the video link",
    "A watch link, a youtu.be short link or a /shorts/ URL. The page reads the player response and lists the caption tracks it finds.",
  ],
  [
    "Pick the language",
    "Manual tracks come first, auto-generated ones are labelled. If a video has twenty translations, all twenty appear.",
  ],
  [
    "Save SRT, VTT or TXT",
    "The file is built on the server and handed to your browser. Filenames follow the video title and the language code.",
  ],
];

const FORMATS: ReadonlyArray<readonly [string, string, string]> = [
  ["SRT", "SubRip (.srt)", "Cue numbers, comma timings. The default for Premiere, Final Cut, Resolve and CapCut."],
  ["VTT", "WebVTT (.vtt)", "Dot timings and a WEBVTT header. What an HTML5 <track> element and most web players load."],
  ["TXT", "Plain text (.txt)", "No timings, no numbering — just the spoken lines, ready to quote or summarise."],
];

const RELATED = [
  { href: "/youtube-downloader", label: "YouTube video downloader (MP4 1080p)" },
  { href: "/youtube-shorts-downloader", label: "YouTube Shorts downloader" },
  { href: "/instagram-reels-audio", label: "Instagram Reels audio (M4A)" },
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "youtube subtitles downloader",
    "youtube transcript downloader",
    "download youtube captions srt",
    "youtube subtitles srt",
    "youtube vtt download",
    "youtube auto-generated captions download",
    "youtube transcript text",
  ],
  alternates: pageAlternates("/youtube-subtitles"),
  openGraph: {
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    url: `${siteUrl}/youtube-subtitles`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
  },
};

export default function YouTubeSubtitlesPage() {
  const pageUrl = `${siteUrl}/youtube-subtitles`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      webApplicationNode({
        id: `${pageUrl}/#app`,
        name: "LAMP TIK YouTube Subtitles Downloader",
        url: pageUrl,
        description: DESCRIPTION,
        features: [
          "Every caption track YouTube publishes for a video",
          "SRT, WebVTT (VTT) and plain-text TXT output",
          "Manual and auto-generated tracks, clearly labelled",
          "Timings preserved for editors",
          "Free, no account, no app and no install",
        ],
      }),
      howToNode({
        id: `${pageUrl}/#howto`,
        name: "How to download YouTube subtitles as SRT, VTT or TXT",
        description:
          "Read a video's caption tracks and save the one you need as a subtitle file or a plain transcript.",
        steps: STEPS.map(([title, body]) => ({ title, body })),
        url: pageUrl,
        anchor: "how-it-works",
      }),
      faqPageNode(`${pageUrl}/#faq`, [...FAQS], pageUrl),
      breadcrumbNode(`${pageUrl}/#breadcrumb`, [
        { name: "Home", url: siteUrl },
        { name: "Tools", url: `${siteUrl}/tools` },
        { name: "YouTube subtitles", url: pageUrl },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="relative min-h-dvh overflow-x-clip">
        <AmbientBackground />
        <SiteHeader />

        <main id="main">
          <section className="section-pad">
            <div className="shell">
              <Breadcrumb
                trail={[
                  { name: "Home", href: "/" },
                  { name: "Tools", href: "/tools" },
                  { name: "YouTube subtitles" },
                ]}
              />

              <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
                <div className="min-w-0">
                  <p className="eyebrow">
                    <span aria-hidden="true" className="eyebrow-dot" />
                    Subtitles &amp; transcripts
                  </p>
                  <h1 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                    YouTube subtitles,{" "}
                    <span className="text-[var(--accent-text)]">as the file your editor opens.</span>
                  </h1>
                  <p className="pretty mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
                    Paste a video link and this page lists the caption tracks YouTube actually
                    has for it — the creator&apos;s own subtitles and the auto-generated ones,
                    each labelled. Save the language you need as SRT, VTT or plain text. No
                    account, no app, and no invented transcript when a video has no captions.
                  </p>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {[
                      "SRT · VTT · TXT",
                      "every published language",
                      "auto tracks labelled",
                      "no account",
                    ].map((chip) => (
                      <li key={chip} className="tool-pill">
                        {chip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="min-w-0">
                  <YouTubeSubtitlesTool />
                </div>
              </div>

              <div className="mt-10">
                <AdSlot slot="under-tool" format="leaderboard" label="Advertisement" />
              </div>
            </div>
          </section>

          <section id="how-it-works" className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <h2 className="balance text-3xl font-semibold leading-tight tracking-headline">
                Three taps, then the text is yours.
              </h2>
              <ol className="mt-8 grid gap-3.5 sm:grid-cols-3">
                {STEPS.map(([title, body], index) => (
                  <li key={title} className="bento-card flex flex-col">
                    <span className="font-mono text-xs tabular-nums text-[var(--text-3)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-3 text-base font-semibold tracking-tight">{title}</h3>
                    <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">{body}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-10 grid gap-3.5 sm:grid-cols-3">
                {FORMATS.map(([name, file, body]) => (
                  <div key={name} className="bento-card">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-base font-semibold tracking-tight">{name}</h3>
                      <span className="font-mono text-xs text-[var(--text-3)]">{file}</span>
                    </div>
                    <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="balance text-3xl font-semibold leading-tight tracking-headline">
                  Manual subtitles and auto captions are not the same file.
                </h2>
                <p className="pretty mt-4 text-sm leading-relaxed text-[var(--text-2)]">
                  A manual track is written or corrected by a person: names spelled right,
                  punctuation in place, music marked where it matters. An auto-generated
                  track is YouTube&apos;s speech recognition working from the audio stream, and it
                  guesses — homophones, brand names and numbers are its weakest points. Both
                  are downloadable here, but they are never mixed together in one list: the
                  manual track for a language always sits above the machine one, and every
                  machine track carries an auto-generated label.
                </p>
                <p className="pretty mt-3 text-sm leading-relaxed text-[var(--text-2)]">
                  Timings survive the conversion in both SRT and VTT, so a file you download
                  here lines up in an editor without retiming. Auto tracks arrive as many short
                  cues rather than sentences; repeated lines are removed so a transcript reads
                  like speech instead of a stutter, and the cue boundaries are left exactly
                  where YouTube set them.
                </p>
              </div>
              <div>
                <h2 className="balance text-3xl font-semibold leading-tight tracking-headline">
                  What a transcript cannot be.
                </h2>
                <p className="pretty mt-4 text-sm leading-relaxed text-[var(--text-2)]">
                  No captions on the video means no transcript on this page. That is not a
                  limitation to work around with an audio model: a generated transcript would
                  read plausibly and be wrong in exactly the places people quote. Music videos,
                  silent footage, very short clips and videos whose uploader disabled
                  contributions all commonly have no track at all.
                </p>
                <p className="pretty mt-3 text-sm leading-relaxed text-[var(--text-2)]">
                  Two more edges are worth knowing before you rely on a file. Region-restricted
                  and private videos cannot be read from a server at all, so the page says the
                  video is unavailable rather than pretending the link was wrong. And the
                  caption URLs YouTube hands out expire after a few hours — this page resolves
                  a fresh one per download instead of storing a link that will be dead by the
                  time somebody clicks it.
                </p>
              </div>
            </div>
          </section>

          <section id="faq" className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <h2 className="balance text-3xl font-semibold leading-tight tracking-headline">
                Questions about subtitles and transcripts.
              </h2>
              <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
                {FAQS.map((faq) => (
                  <div key={faq.question} className="bento-card">
                    <h3 className="text-base font-semibold leading-snug tracking-tight">
                      {faq.question}
                    </h3>
                    <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <ToolBridge heading="More YouTube tools on this site" links={RELATED} />
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

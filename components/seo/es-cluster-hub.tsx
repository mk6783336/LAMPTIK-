import Link from "next/link";
import { Glyph } from "@/components/glyph";

/**
 * The Spanish cluster, as a section on `/es`.
 *
 * `/es` used to be a TikTok landing with one bridge strip: the three Spanish
 * tool pages existed, but the only link to the X page was a label in a row of
 * seven, and the Reels-audio page was reachable only from that same row. A
 * cluster Google can read has a hub that names each member, says what it does,
 * and points at it with the wording that member is written for.
 *
 * So each card's anchor is the query its destination answers, and no two
 * anchors are the same sentence:
 *
 *   facebook  → "sin marca de agua"  (the query the page carries in its H1)
 *   twitter   → "en MP4"             (the format query)
 *   reels     → "audio … en MP3"     (the audio-extraction query)
 *
 * The bodies are factual on purpose: the Reels card says Instagram publishes no
 * standalone audio track, because a hub that promises a one-click MP3 would be
 * sending readers to a page that refuses to promise it.
 */
const CLUSTER: ReadonlyArray<{ href: string; anchor: string; body: string }> = [
  {
    href: "/es/facebook-video-downloader",
    anchor: "Descargar videos de Facebook sin marca de agua",
    body: "Publicaciones, Watch, Reels y enlaces fb.watch, en HD y con el audio original. Sin iniciar sesión y sin recodificar el archivo.",
  },
  {
    href: "/es/twitter-video-downloader",
    anchor: "Descargar videos de Twitter (X) en MP4",
    body: "El video o el GIF de cualquier publicación de x.com o twitter.com, en su resolución original, eligiendo entre las calidades que publicó X.",
  },
  {
    href: "/es/instagram-reels-audio",
    anchor: "Descargar audio de Reels de Instagram en MP3",
    body: "Guarda el Reel con su sonido original y extrae el MP3 en tu propio dispositivo: Instagram no publica pistas de audio sueltas.",
  },
];

export function EsClusterHub() {
  return (
    <section className="section-pad border-t border-[var(--line)]">
      <div className="shell">
        <p className="eyebrow">
          <span aria-hidden="true" className="eyebrow-dot" />
          Las tres descargas en español
        </p>
        <h2 className="balance mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-headline">
          Facebook, X y el audio de Reels, cada uno con su propia página.
        </h2>
        <p className="pretty mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-2)]">
          Esta es la página de TikTok en español; las otras tres redes tienen su
          propio descargador, escrito para lo que cada una publica de verdad. Elige
          la que necesites:
        </p>

        <ul className="mt-8 grid gap-3.5 sm:grid-cols-3">
          {CLUSTER.map((tool) => (
            <li key={tool.href} className="min-w-0">
              <Link href={tool.href} className="bento-card group flex h-full flex-col">
                <span className="flex items-start justify-between gap-2 text-base font-semibold leading-snug tracking-tight">
                  {tool.anchor}
                  <Glyph name="arrow-up-right" className="mt-0.5 size-4 shrink-0 text-[var(--text-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
                <span className="pretty mt-2 block text-sm leading-relaxed text-[var(--text-2)]">
                  {tool.body}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

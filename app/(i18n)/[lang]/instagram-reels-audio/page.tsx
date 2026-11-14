import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { AdSlot } from "@/components/ads/AdSlot";
import { AmbientBackground } from "@/components/ambient-background";
import { Downloader } from "@/components/downloader";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteUrl } from "@/lib/site";

/**
 * `/es/instagram-reels-audio` — the Spanish twin of the Reel-audio page.
 *
 * The English page has the single best piece of evidence on the whole site:
 * two Search Console queries (`descargar reel sin marca de agua` at 10,
 * `descargar reels sin marca de agua` at 9) in the Spanish cluster, and a
 * separate English page earning impressions for "reels audio". This route puts
 * both in one Spanish document instead of asking a Spanish reader to land on an
 * English page.
 *
 * It keeps the English page's honesty: Instagram publishes no audio-only
 * stream, so the page saves the Reel with its audio intact and names the two
 * real routes to a reusable sound. It never promises a one-click MP3.
 *
 * Same resolver as the English page (`Downloader platform="instagram"`), and
 * `dynamicParams = false` so every other locale 404s for real.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: "es" }];
}

const PATH = "/es/instagram-reels-audio";
const EN_PATH = "/instagram-reels-audio";

const TITLE = "Audio de Reels de Instagram — descargar el sonido original";
const DESCRIPTION =
  "Descarga el audio de un Reel de Instagram: guarda el MP4 con su sonido original, sin iniciar sesión ni marca de agua, y extrae el MP3 en tu propio dispositivo.";

const CHIPS = ["Sonido original intacto", "Sin iniciar sesión", "Sin MP3 falso"];

const STEPS: ReadonlyArray<readonly [string, string]> = [
  [
    "Copia el enlace del Reel",
    "Abre el Reel en Instagram, pulsa Compartir → Copiar enlace y pégalo arriba. Los Reels públicos, las publicaciones con video e IGTV se resuelven sin cuenta; los carruseles de solo fotos no, porque no llevan pista de audio.",
  ],
  [
    "Guarda el Reel y separa el MP3",
    "El archivo que recibes es el Reel completo: MP4 con su audio AAC original, no un video mudo ni una recodificación. Para reutilizar el sonido dentro de Instagram, pulsa Usar audio en la publicación original. Para quedarte un MP3, extráelo en tu propio dispositivo, por ejemplo con VLC (Medio, Convertir/Guardar, MP3) o con ffmpeg.",
  ],
];

const FAQS: ReadonlyArray<readonly [string, string]> = [
  [
    "¿Se puede descargar el audio de un Reel como MP3?",
    "No directamente, y conviene decirlo claro: Instagram mezcla la música dentro del video y no publica ninguna pista de audio suelta. Lo que sí funciona es guardar el Reel con su sonido original y extraer el MP3 de ese MP4 en tu dispositivo. Cualquier web que prometa un MP3 en un clic está re-codificando el sonido o grabando el altavoz.",
  ],
  [
    "¿El audio descargado es el original?",
    "Sí. Se entrega la pista AAC que sirve Instagram dentro del MP4, sin volver a comprimir. Convertirla después a MP3 añade una segunda generación con pérdida, que es aceptable para escuchar pero no para volver a editar.",
  ],
  [
    "¿Necesito cuenta de Instagram?",
    "No. Las publicaciones públicas se resuelven sin sesión. Las cuentas privadas no se pueden descargar por diseño, y una herramienta que lo ofrezca está usando la sesión de otra persona.",
  ],
  [
    "¿Funciona con fotos y carruseles?",
    "Los videos dentro de un carrusel se descargan como MP4 con su audio. Las publicaciones que solo tienen fotos no traen pista de sonido, así que la herramienta lo dice en lugar de entregar un archivo vacío.",
  ],
  [
    "¿Se guardan mis enlaces o mis audios?",
    "No. El enlace se procesa en memoria y se descarta, y la descarga va del CDN de Instagram a tu dispositivo. Sin historial, sin copia en el servidor y sin cuenta que crear.",
  ],
];

const OTHER_TOOLS: ReadonlyArray<readonly [string, string, string]> = [
  [
    "/es/instagram-reels-downloader",
    "Descargar Reels de Instagram",
    "El MP4 completo en 1080 × 1920, sin marca de agua.",
  ],
  ["/es", "Descargar videos de TikTok", "Sin marca de agua, en MP4 y con el audio original."],
  [
    "/es/twitter-video-downloader",
    "Descargar videos de Twitter (X)",
    "Publicaciones y GIF de x.com en MP4, sin cuenta.",
  ],
  [
    "/es/facebook-video-downloader",
    "Descargar videos de Facebook",
    "Publicaciones, Watch, Reels y enlaces fb.watch.",
  ],
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "descargar audio de reels de instagram",
    "audio de reels instagram mp3",
    "descargar sonido de un reel",
    "sacar audio de un video de instagram",
    "descargar reel sin marca de agua",
    "descargar reels sin marca de agua",
    "instagram reels audio en español",
  ],
  alternates: {
    canonical: PATH,
    languages: {
      en: EN_PATH,
      es: PATH,
      "x-default": EN_PATH,
    },
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}${PATH}`,
    siteName: "LAMP TIK",
    title: TITLE,
    description: DESCRIPTION,
    locale: "es_ES",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
  other: { "content-language": "es" },
};

export default function InstagramReelsAudioEsPage() {
  const pageUrl = `${siteUrl}${PATH}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${pageUrl}/#app`,
        name: "Descargar el audio de un Reel de Instagram",
        url: pageUrl,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Cualquier navegador",
        inLanguage: "es",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: DESCRIPTION,
      },
      {
        "@type": "HowTo",
        "@id": `${pageUrl}/#howto`,
        name: "Cómo descargar el audio de un Reel de Instagram",
        description: DESCRIPTION,
        step: STEPS.map(([name, text], index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name,
          text,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}/#faq`,
        mainEntity: FAQS.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}/#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Audio de Reels", item: pageUrl },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div
        className="relative min-h-dvh overflow-x-clip"
        lang="es"
        data-platform-theme="instagram"
      >
        <AmbientBackground />
        <SiteHeader />

        <main id="main">
          <section className="section-pad">
            <div className="shell">
              <Breadcrumb
                trail={[{ name: "Inicio", href: "/es" }, { name: "Audio de Reels" }]}
              />

              <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
                <div className="min-w-0">
                  <p className="eyebrow">
                    <span aria-hidden="true" className="eyebrow-dot" />
                    Instagram Reels · audio · sin cuenta
                  </p>
                  <h1 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                    Descarga el audio de un Reel,{" "}
                    <span className="text-[var(--accent-text)]">
                      tal como se publicó.
                    </span>
                  </h1>
                  <p className="pretty mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
                    Instagram no publica el audio de un Reel como archivo aparte: la
                    música va mezclada dentro del video. Así que esta página hace lo
                    que sí es real: guarda el Reel con su sonido intacto y te explica
                    las dos formas honestas de quedarte con un MP3.
                  </p>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {CHIPS.map((chip) => (
                      <li key={chip} className="tool-pill">
                        {chip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="min-w-0">
                  <Downloader platform="instagram" />
                </div>
              </div>

              <div className="mt-10">
                <AdSlot slot="under-tool" format="leaderboard" label="Publicidad" />
              </div>
            </div>
          </section>

          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <h2 className="balance text-3xl font-semibold leading-tight tracking-headline">
                Dos pasos, y el sonido es el original.
              </h2>
              <ol className="mt-8 grid gap-3.5 sm:grid-cols-2">
                {STEPS.map(([title, body], index) => (
                  <li key={title} className="bento-card flex flex-col">
                    <span className="font-mono text-xs tabular-nums text-[var(--text-3)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-3 text-base font-semibold tracking-tight">{title}</h3>
                    <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                      {body}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="pretty mt-6 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-4 font-mono text-xs leading-relaxed text-[var(--text-2)]">
                ffmpeg -i reel.mp4 -vn -c:a libmp3lame -q:a 2 sonido.mp3
              </p>
            </div>
          </section>

          <section id="faq" className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <h2 className="balance text-3xl font-semibold leading-tight tracking-headline">
                Preguntas sobre el audio de Reels.
              </h2>
              <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
                {FAQS.map(([question, answer]) => (
                  <div key={question} className="bento-card">
                    <h3 className="text-base font-semibold leading-snug tracking-tight">
                      {question}
                    </h3>
                    <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
                      {answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-dot" />
                Más herramientas en español
              </p>
              <h2 className="balance mt-4 text-3xl font-semibold leading-tight tracking-headline">
                La misma página, para las otras redes.
              </h2>
              <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
                {OTHER_TOOLS.map(([href, title, note]) => (
                  <Link key={href} href={href} className="bento-card group flex items-start gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold tracking-tight">{title}</span>
                        <ArrowUpRight className="size-4 shrink-0 text-[var(--text-3)]" />
                      </span>
                      <span className="pretty mt-1.5 block text-sm leading-relaxed text-[var(--text-2)]">
                        {note}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

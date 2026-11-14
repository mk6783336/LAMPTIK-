import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { AmbientBackground } from "@/components/ambient-background";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TwitterDownloader } from "@/components/twitter-downloader";
import { siteUrl } from "@/lib/site";

/**
 * `/es/twitter-video-downloader` — the Spanish twin of the X / Twitter page.
 *
 * Why a dedicated route instead of a fourth entry in `PLATFORM_LANDINGS`: the
 * registry assumes every locale carries every platform, and X is not a
 * `Platform` at all — it has no audio track and returns a rendition list, which
 * is why the English page mounts `TwitterDownloader` rather than the shared
 * `Downloader`. Adding a Spanish page for it must not force eleven other
 * locales to ship copy they do not have, so this route carries its own.
 *
 * `dynamicParams = false` with a single static param keeps `/fr/…`, `/de/…`
 * and the rest at a real 404 instead of a soft one.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: "es" }];
}

const PATH = "/es/twitter-video-downloader";
const EN_PATH = "/twitter-video-downloader";

const TITLE = "Descargar videos de Twitter (X) en MP4 — gratis y sin cuenta";
const DESCRIPTION =
  "Descarga videos y GIF de X (Twitter) en MP4 en su resolución original desde el navegador: sin iniciar sesión, sin app y sin marca de agua. Elige la calidad que publicó el autor.";

const CHIPS = ["x.com y twitter.com", "en su resolución original", "GIF como MP4", "sin cuenta"];

const STEPS: ReadonlyArray<readonly [string, string]> = [
  [
    "Copia el enlace de la publicación",
    "Abre la publicación en x.com o en la app y pulsa Compartir → Copiar enlace. La dirección contiene /status/ seguido del identificador de la publicación; el perfil o la búsqueda no sirven como enlace.",
  ],
  [
    "Pégalo en el cuadro de arriba",
    "El servidor lee la publicación, no el HTML de la página, así que funciona igual en el móvil y en el ordenador, y no hace falta tener cuenta en X.",
  ],
  [
    "Elige la calidad y guarda",
    "Se listan todas las versiones MP4 que publicó X, de mayor a menor. Pulsa la que quieras y la descarga la pasa al gestor de descargas del navegador, sin recodificar nada.",
  ],
];

const FAQS: ReadonlyArray<readonly [string, string]> = [
  [
    "¿Se descarga sin marca de agua?",
    "Sí, porque X nunca añade marca de agua a los MP4 que sirve. Aquí no hay nada que recortar ni difuminar: se entrega el mismo archivo que reproduce su reproductor, con la resolución y el bitrate originales.",
  ],
  [
    "¿Necesito cuenta de X o de Twitter?",
    "No. Las publicaciones públicas se resuelven sin sesión: no se pide usuario, contraseña ni cookies. Las cuentas protegidas no se pueden descargar, y ninguna herramienta que diga lo contrario está siendo honesta.",
  ],
  [
    "¿Qué calidad puedo obtener?",
    "La que X haya publicado para esa publicación, en su resolución original. Los clips cortos a veces solo existen en 480p o 720p, y en ese caso esos son los botones que aparecen, sin etiquetar un 720p como HD.",
  ],
  [
    "¿Los GIF se descargan como GIF?",
    "No: X convierte los GIF en MP4 en bucle antes de guardarlos, así que recibes un MP4 que se repite y no tiene sonido. Convertirlo a .gif de verdad multiplicaría el tamaño por diez y perdería calidad.",
  ],
  [
    "¿Funciona en iPhone y en Android?",
    "Sí. Todo ocurre en el navegador. En iPhone el archivo queda en Archivos → En mi iPhone → Descargas y desde ahí lo pasas a Fotos con Compartir → Guardar video; en Android aparece en Descargas.",
  ],
  [
    "¿Se guardan mis enlaces o los videos?",
    "No. El enlace se procesa en memoria y se descarta, y la descarga va del CDN de X directamente a tu dispositivo. No hay historial, ni copia en el servidor, ni cuenta que crear.",
  ],
];

const OTHER_TOOLS: ReadonlyArray<readonly [string, string, string]> = [
  [
    "/es",
    "Descargar videos de TikTok",
    "Sin marca de agua, en HD y con el audio original.",
  ],
  [
    "/es/facebook-video-downloader",
    "Descargar videos de Facebook",
    "Publicaciones, Watch, Reels y enlaces fb.watch.",
  ],
  [
    "/es/instagram-reels-downloader",
    "Descargar Reels de Instagram",
    "El MP4 original con su audio, sin iniciar sesión.",
  ],
  [
    "/es/instagram-reels-audio",
    "Descargar el audio de un Reel",
    "El sonido original dentro del MP4, y cómo sacar el MP3.",
  ],
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "descargar videos de twitter",
    "descargar video de x",
    "bajar videos de twitter en mp4",
    "descargar gif de twitter",
    "twitter video downloader español",
    "descargar video twitter sin cuenta",
    "x video downloader español",
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

export default function TwitterVideoDownloaderEsPage() {
  const pageUrl = `${siteUrl}${PATH}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${pageUrl}/#app`,
        name: "Descargador de videos de Twitter (X)",
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
        name: "Cómo descargar un video de Twitter (X)",
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
          { "@type": "ListItem", position: 2, name: "Twitter / X", item: pageUrl },
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
      <div className="relative min-h-dvh overflow-x-clip" lang="es">
        <AmbientBackground />
        <SiteHeader />

        <main id="main">
          <section className="section-pad">
            <div className="shell">
              <Breadcrumb
                trail={[
                  { name: "Inicio", href: "/es" },
                  { name: "Twitter / X" },
                ]}
              />

              <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
                <div className="min-w-0">
                  <p className="eyebrow">
                    <span aria-hidden="true" className="eyebrow-dot" />
                    Twitter / X · MP4 · sin cuenta
                  </p>
                  <h1 className="balance mt-4 text-4xl font-semibold leading-tight tracking-headline">
                    Descarga videos de Twitter (X),{" "}
                    <span className="text-[var(--accent-text)]">directo a MP4.</span>
                  </h1>
                  <p className="pretty mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-2)]">
                    Pega el enlace de cualquier publicación de x.com o twitter.com y
                    guarda su video o su GIF en la calidad que publicó X, en su resolución original.
                    Sin marca de agua, sin cuenta y sin instalar nada: el archivo va al
                    gestor de descargas del navegador.
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
                  <TwitterDownloader />
                </div>
              </div>

              <div className="mt-10">
              </div>
            </div>
          </section>

          <section className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <h2 className="balance text-3xl font-semibold leading-tight tracking-headline">
                Tres pasos, ninguna cuenta.
              </h2>
              <ol className="mt-8 grid gap-3.5 sm:grid-cols-3">
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
            </div>
          </section>

          <section id="faq" className="section-pad border-t border-[var(--line)]">
            <div className="shell">
              <h2 className="balance text-3xl font-semibold leading-tight tracking-headline">
                Preguntas sobre las descargas de X.
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
                Las otras redes, con la misma página.
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
              <p className="pretty mt-6 text-xs text-[var(--text-3)]">
                Descarga solo contenido propio o con permiso del autor; los derechos
                siguen siendo suyos.
              </p>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

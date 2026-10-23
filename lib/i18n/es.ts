import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Spanish landing page (`/es`).
 *
 * Written in Spain-neutral Spanish so it reads naturally in Madrid, Mexico
 * and Miami alike: "descargar" (not "bajar"), "vídeo" alongside "video" where
 * the search demand uses it, and no regionalisms that would look foreign to
 * either audience.
 */
export const es: LandingCopy = {
  code: "es",
  htmlLang: "es",
  dir: "ltr",
  title: "Descargar videos de TikTok sin marca de agua — HD",
  description:
    "Descarga videos de TikTok sin marca de agua, Reels de Instagram, videos de Facebook y YouTube en MP4 HD o MP3. Gratis, sin app y sin registrarte.",
  keywords: [
    "descargar videos de tiktok sin marca de agua",
    "descargar reels de instagram",
    "descargar videos de facebook",
    "youtube a mp3",
    "descargar video tiktok hd",
    "descargar videos sin marca de agua",
  ],
  eyebrow: "Gratis · Sin marca de agua · Sin instalar nada",
  h1Lead: "Descarga videos de TikTok",
  h1Accent: "sin marca de agua, en HD.",
  lede:
    "Pega el enlace y guarda el archivo original en MP4 HD o MP3. También funciona con Reels de Instagram, videos de Facebook y YouTube.",
  chips: ["TikTok, Reels, Facebook y YouTube", "MP4 1080p y MP3", "Sin cuenta ni app"],
  tool: {
    heading: "Pega el enlace y descarga",
    note:
      "El botón de descarga aparece en cuanto el servidor verifica el archivo original. Nada se guarda en nuestros servidores.",
  },
  facts: [
    ["Precio", "Gratis"],
    ["Cuenta", "No hace falta"],
    ["Calidad máxima", "1080p HD"],
    ["Formatos", "MP4 y MP3"],
  ],
  stepsHeading: "Cómo descargar un video en tres pasos",
  steps: [
    {
      title: "Copia el enlace del video",
      body:
        "En TikTok toca Compartir → Copiar enlace. En Instagram, Facebook o YouTube usa el mismo menú Compartir. Los enlaces cortos como vt.tiktok.com o youtu.be también funcionan.",
    },
    {
      title: "Pégalo en el cuadro de arriba",
      body:
        "El cuadro lee el enlace del portapapeles con un solo toque. La plataforma se detecta sola, así que no tienes que elegir nada antes de pegar.",
    },
    {
      title: "Elige MP4 HD o MP3 y guarda",
      body:
        "Pulsa Descargar HD MP4 para el video completo o Descargar MP3 para el audio original. El archivo se guarda con su título real en tu galería o carpeta de Descargas.",
    },
  ],
  faqHeading: "Preguntas frecuentes",
  faqs: [
    {
      question: "¿Cómo descargo un video de TikTok sin marca de agua?",
      answer:
        "Copia el enlace del video en TikTok, pégalo arriba y pulsa Descargar HD MP4. Solicitamos la versión original que TikTok guarda en su CDN en lugar de la copia con el logotipo que genera el menú Compartir, así que el archivo llega limpio y sin recortes.",
    },
    {
      question: "¿Se guardan mis enlaces o mis videos?",
      answer:
        "No. El enlace se procesa en memoria para resolver el archivo y se descarta; no creamos historial, no guardamos copias del video y no necesitamos ninguna cuenta. La descarga va del CDN directamente a tu dispositivo.",
    },
    {
      question: "¿Funciona en iPhone y en Android desde el navegador?",
      answer:
        "Sí. Funciona en Safari en iPhone y iPad, en Chrome en Android y en cualquier navegador de escritorio. En iPhone el archivo se guarda en la app Archivos; desde ahí puedes moverlo a Fotos.",
    },
    {
      question: "¿Tengo que instalar una app o registrarme?",
      answer:
        "No. Todo ocurre en el navegador y no hay registro, límite de descargas, versión de pago ni app que instalar.",
    },
  ],
  cta: {
    heading: "Guarda tu próximo video en HD.",
    body:
      "Sin cuenta, sin app y sin almacenamiento: solo el archivo original, en tu dispositivo.",
    button: "Abrir el descargador",
  },
  otherToolsHeading: "Más herramientas por plataforma",
  footerNote:
    "Esta página está en español; las herramientas enlazadas abajo están en inglés y funcionan igual para todos los países.",
};

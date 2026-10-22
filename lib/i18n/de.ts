import type { LandingCopy } from "@/lib/i18n/types";

/**
 * German landing page (Germany, Austria, Switzerland).
 *
 * Written for "Sie" and for the queries this market actually types:
 * "TikTok Video Downloader ohne Wasserzeichen" first, with the Instagram,
 * Facebook and YouTube variants as secondary intents.
 */
export const de: LandingCopy = {
  code: "de",
  htmlLang: "de",
  dir: "ltr",
  title: "TikTok Downloader ohne Wasserzeichen – HD & MP3",
  description:
    "TikTok, Instagram Reels, Facebook und YouTube in HD herunterladen – ohne Wasserzeichen, ohne App und ohne Anmeldung. Kostenlos, schnell und direkt im Browser.",
  keywords: [
    "TikTok Video Downloader ohne Wasserzeichen",
    "TikTok Video herunterladen",
    "Instagram Reels herunterladen",
    "Facebook Video downloaden",
    "YouTube zu MP3",
    "TikTok MP3 konvertieren",
  ],
  eyebrow: "Kostenlos · Ohne Wasserzeichen · Ohne App",
  h1Lead: "Videos speichern.",
  h1Accent: "Ganz ohne Wasserzeichen.",
  lede:
    "Link einfügen, Qualität wählen, speichern – TikTok, Instagram Reels, Facebook und YouTube in Sekunden auf Ihrem Gerät.",
  chips: ["Full HD 1080p", "MP3-Audio", "Keine Anmeldung"],
  tool: {
    heading: "Video-Link einfügen",
    note: "Funktioniert in jedem Browser – auch auf iPhone und Android.",
  },
  facts: [
    ["Preis", "Kostenlos"],
    ["Anmeldung", "Nicht nötig"],
    ["Qualität", "Bis 1080p"],
    ["Audio", "MP3 & M4A"],
  ],
  stepsHeading: "So funktioniert es",
  steps: [
    {
      title: "Link kopieren",
      body:
        "Öffnen Sie das Video in TikTok, Instagram, Facebook oder YouTube und wählen Sie Teilen → Link kopieren. Auch Kurzlinks wie vt.tiktok.com oder fb.watch funktionieren.",
    },
    {
      title: "In das Feld einfügen",
      body:
        "Fügen Sie den Link oben ein. Die Plattform wird automatisch erkannt, damit Sie nichts auswählen müssen – das Feld akzeptiert jeden unterstützten Link.",
    },
    {
      title: "In HD oder als MP3 speichern",
      body:
        "Tippen Sie auf Download HD MP4, SD MP4 oder MP3. Die Originaldatei wird direkt auf Ihr Gerät gespeichert – ohne Logo und ohne Neukodierung.",
    },
  ],
  faqHeading: "Häufige Fragen",
  faqs: [
    {
      question: "Ist der Downloader wirklich kostenlos?",
      answer:
        "Ja. Alle Downloads in HD, SD und MP3 sind kostenlos und unbegrenzt. Es gibt kein Abo, keine Anmeldung und keine versteckten Kosten – die Seite finanziert sich über Werbung.",
    },
    {
      question: "Bekomme ich die Videos ohne Wasserzeichen?",
      answer:
        "Ja. Wir laden die Originaldatei vom CDN der Plattform, nicht die Version mit eingebranntem Logo, die beim Teilen entsteht. Bei TikTok bedeutet das: play statt wmplay.",
    },
    {
      question: "Funktioniert das auf iPhone und Android ohne App?",
      answer:
        "Ja. Die Seite läuft in Safari, Chrome und Firefox. Auf dem iPhone wählen Sie nach dem Download Teilen → In Dateien sichern; auf Android landet die Datei direkt im Download-Ordner.",
    },
    {
      question: "Werden meine Links oder Videos gespeichert?",
      answer:
        "Nein. Links werden nur zur Auflösung verarbeitet und nach wenigen Minuten aus dem Zwischenspeicher entfernt. Es gibt kein Konto, keine Download-Historie auf dem Server und keine Weitergabe an Dritte.",
    },
  ],
  cta: {
    heading: "Bereit für Ihren ersten Download?",
    body:
      "Fügen Sie einen Link ein und speichern Sie das Video in wenigen Sekunden – ohne Wasserzeichen, ohne App.",
    button: "Downloader öffnen",
  },
  otherToolsHeading: "Weitere Downloader",
  footerNote:
    "Diese Seite ist auf Deutsch, die Werkzeug-Oberfläche selbst bleibt auf Englisch.",
};

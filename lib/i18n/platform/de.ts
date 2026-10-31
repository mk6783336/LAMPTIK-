import type { LandingCopy } from "@/lib/i18n/types";

/**
 * German platform landings (`/de/instagram-reels-downloader` and siblings).
 *
 * Written for the German query, not translated from the English: "herunterladen"
 * rather than "downloaden" where the search demand uses it, and the formal
 * address avoided entirely because a utility tool reads better in the neutral
 * imperative ("Link einfügen, fertig").
 */
export const de: Record<"instagram" | "youtube" | "facebook", LandingCopy> = {
  instagram: {
    code: "de",
    htmlLang: "de",
    dir: "ltr",
    title: "Instagram Reels herunterladen in HD — ohne Wasserzeichen",
    description:
      "Instagram Reels in Originalqualität als MP4 speichern: 1080p, mit Ton, ohne Wasserzeichen und ohne Login. Kostenlos im Browser auf Handy und PC.",
    keywords: [
      "instagram reels herunterladen",
      "instagram video herunterladen",
      "reels speichern",
      "reels ohne wasserzeichen",
      "instagram reels download",
      "reels in hd speichern",
    ],
    eyebrow: "Instagram Reels · kostenlos · ohne Konto",
    h1Lead: "Instagram Reels herunterladen",
    h1Accent: "in HD und ohne Wasserzeichen.",
    lede:
      "Link einfügen und das MP4 speichern, das Instagram selbst ausliefert — mit synchronem Ton. Akzeptiert /reel/, /reels/, /p/, /tv/ und instagr.am-Links, ohne Konto und ohne App.",
    chips: ["Originalqualität", "Ton inklusive", "Ohne Login"],
    tool: {
      heading: "Reel-Link einfügen",
      note: "Instagram wird automatisch erkannt — auch TikTok, Facebook und YouTube.",
    },
    facts: [
      ["Preis", "Kostenlos"],
      ["Konto", "Nicht nötig"],
      ["Qualität", "1080 × 1920"],
      ["Format", "MP4 mit Ton"],
    ],
    stepsHeading: "Reel in drei Schritten speichern",
    steps: [
      {
        title: "Link kopieren",
        body: "Im Reel auf die drei Punkte tippen und „Link kopieren“ wählen. Auch die Adresse aus der Browserzeile funktioniert. Nicht den Speichern-Knopf der App nutzen: Diese Kopie trägt Wasserzeichen und eingeblendete Bedienelemente.",
      },
      {
        title: "Link oben einfügen",
        body: "Der Server liest den öffentlichen Beitrag, prüft die angebotenen Videoversionen und nimmt das progressive MP4 mit der höchsten Bitrate — dort stecken Bild und Ton bereits in einer Datei.",
      },
      {
        title: "MP4 speichern",
        body: "Auf „HD MP4 herunterladen“ tippen. Die Datei landet unter Downloads, auf dem iPhone in der Dateien-App; von dort über Teilen → Video sichern in die Fotos-App. Die Auflösung ist die des Originals.",
      },
    ],
    faqHeading: "Häufige Fragen",
    faqs: [
      {
        question: "Hat das gespeicherte Reel ein Wasserzeichen?",
        answer:
          "Nein. Angefragt wird die Datei, die Instagram seinem eigenen Player liefert — nicht die Kopie aus dem Teilen-Menü. Da im Original keine Ebene liegt, muss nichts zugeschnitten oder überdeckt werden.",
      },
      {
        question: "Brauche ich ein Instagram-Konto?",
        answer:
          "Nein. Öffentliche Beiträge werden ohne Sitzung aufgelöst: kein Benutzername, kein Passwort, keine Cookies. Private Konten lassen sich nicht herunterladen, und wer das anbietet, nutzt die Sitzung einer anderen Person.",
      },
      {
        question: "Was tun, wenn der Download scheitert?",
        answer:
          "Zuerst prüfen, ob das Video in Instagram auch ohne Login abspielt. Läuft es dort und hier nicht, eine Minute warten und erneut versuchen — Instagram begrenzt anonyme Anfragen bei hoher Last. Gelöschte oder private Beiträge haben keine öffentliche Datei.",
      },
      {
        question: "Funktionieren Fotos und Karussells?",
        answer:
          "Videos innerhalb eines Karussells werden als MP4 gespeichert. Beiträge mit ausschließlich Fotos enthalten kein Video; die Seite sagt das, statt eine leere Datei auszuliefern.",
      },
    ],
    cta: {
      heading: "Das nächste Reel in Originalqualität sichern",
      body: "Ohne Konto, ohne App und ohne Wasserzeichen — nur die Datei des Urhebers.",
      button: "Zum Downloader",
    },
    otherToolsHeading: "Weitere Werkzeuge nach Plattform",
    footerNote: "Diese Seite ist auf Deutsch; die Werkzeuge funktionieren in jedem Land gleich.",
  },

  youtube: {
    code: "de",
    htmlLang: "de",
    dir: "ltr",
    title: "YouTube Videos herunterladen — MP4 in HD oder MP3",
    description:
      "YouTube-Link einfügen und das Video als MP4 bis 1080p oder nur den Ton als MP3 speichern. Für watch-, Shorts- und youtu.be-Links, ohne App und ohne Konto.",
    keywords: [
      "youtube video herunterladen",
      "youtube zu mp3",
      "youtube videos downloaden",
      "youtube shorts herunterladen",
      "musik von youtube herunterladen",
      "youtube video in hd speichern",
    ],
    eyebrow: "YouTube · MP4 und MP3 · ohne Installation",
    h1Lead: "YouTube-Videos herunterladen",
    h1Accent: "als MP4 in HD oder nur der Ton.",
    lede:
      "Link einfügen und die Auflösung wählen, die es wirklich gibt: 1080p wenn vorhanden, sonst 720p, oder MP3 aus der Originaltonspur. Funktioniert mit watch-, Shorts- und youtu.be-Links im Browser.",
    chips: ["MP4 1080p", "MP3 original", "Shorts und youtu.be"],
    tool: {
      heading: "Video-Link einfügen",
      note: "YouTube wird automatisch erkannt — auch TikTok, Instagram und Facebook.",
    },
    facts: [
      ["Preis", "Kostenlos"],
      ["Konto", "Nicht nötig"],
      ["Qualität", "1080p / 720p"],
      ["Formate", "MP4 und MP3"],
    ],
    stepsHeading: "YouTube-Video in drei Schritten speichern",
    steps: [
      {
        title: "Video-Link kopieren",
        body: "In der App auf Teilen → Link kopieren, am Rechner die Adresse aus der Browserzeile. youtu.be-, Shorts- und Playlist-Links werden unverändert akzeptiert, ohne manuelles Aufräumen.",
      },
      {
        title: "Verfügbare Qualität prüfen",
        body: "Der Server fragt die vorhandenen Versionen ab und zeigt, was tatsächlich existiert. Es wird kein 4K erfunden und kein 720p hochskaliert, um es HD zu nennen.",
      },
      {
        title: "MP4 oder MP3 wählen",
        body: "Das vollständige Video mit Bild und Ton laden oder nur die Tonspur als MP3. Die Datei wird mit dem Videotitel gespeichert, nicht mit einem generischen Namen.",
      },
    ],
    faqHeading: "Häufige Fragen",
    faqs: [
      {
        question: "Geht 1080p?",
        answer:
          "Ja, sofern YouTube diese Auflösung für das Video anbietet. Die Seite zeigt die verfügbaren Stufen vor dem Download, damit keine Datei mit weniger Pixeln ankommt als erwartet.",
      },
      {
        question: "Wie wird daraus eine MP3?",
        answer:
          "Link einfügen und die Audiooption wählen. Die von YouTube veröffentlichte Tonspur wird einmalig nach MP3 umgewandelt; der Player wird nicht mitgeschnitten und der Ton nicht neu zusammengesetzt. Die Qualität bleibt die des Originals.",
      },
      {
        question: "Funktionieren Shorts und youtu.be?",
        answer:
          "Beides. Shorts werden wie jedes hochformatige Video aufgelöst, kurze youtu.be-Links serverseitig auf die vollständige Adresse erweitert.",
      },
      {
        question: "Ganze Playlists?",
        answer:
          "Eine Playlist ist eine Liste, keine Datei. Die Seite öffnet die Liste und führt Video für Video durch denselben Downloader; hunderte Dateien auf einmal sind der schnellste Weg, gedrosselt zu werden.",
      },
    ],
    cta: {
      heading: "Video oder nur den Ton sichern",
      body: "Die Qualität wählen, die wirklich existiert — ohne Installation.",
      button: "Zum Downloader",
    },
    otherToolsHeading: "Weitere Werkzeuge nach Plattform",
    footerNote: "Nur eigenes Material oder Inhalte mit Erlaubnis speichern; die Rechte bleiben beim Urheber.",
  },

  facebook: {
    code: "de",
    htmlLang: "de",
    dir: "ltr",
    title: "Facebook Videos herunterladen in HD — ohne App",
    description:
      "Facebook-Videos in HD im Browser speichern: Seitenposts, Watch, Reels und fb.watch-Links. Ohne Installation, ohne Konto und ohne Wasserzeichen.",
    keywords: [
      "facebook video herunterladen",
      "facebook videos speichern",
      "fb video download",
      "facebook reels herunterladen",
      "fb.watch herunterladen",
      "facebook video ohne app",
    ],
    eyebrow: "Facebook · HD · ohne Installation",
    h1Lead: "Facebook-Videos herunterladen",
    h1Accent: "in HD, ohne App.",
    lede:
      "Link einfügen und das MP4 mit Ton speichern. Seitenposts, Watch-Videos, Reels und kurze fb.watch-Links funktionieren; die Kurzlinks werden serverseitig aufgelöst, bevor die Datei gesucht wird.",
    chips: ["HD zuerst", "fb.watch inklusive", "Lange Videos"],
    tool: {
      heading: "Video-Link einfügen",
      note: "Facebook wird automatisch erkannt — auch TikTok, Instagram und YouTube.",
    },
    facts: [
      ["Preis", "Kostenlos"],
      ["Konto", "Nicht nötig"],
      ["Qualität", "HD oder echte SD"],
      ["Limit", "Keine Größenbegrenzung"],
    ],
    stepsHeading: "Facebook-Video in drei Schritten speichern",
    steps: [
      {
        title: "Link kopieren",
        body: "Unter dem Video auf Teilen → Link kopieren. Beitrags-URL, /watch/, /reel/ und die Kurzform fb.watch/ werden akzeptiert. Private Videos und geschlossene Gruppen haben keine öffentliche Datei.",
      },
      {
        title: "Weiterleitung auflösen lassen",
        body: "fb.watch enthält keine Video-ID, sondern springt zum eigentlichen Beitrag. Der Server folgt der ganzen Kette bis zur kanonischen URL und prüft erst dann, ob die Datei Bild und Ton enthält.",
      },
      {
        title: "HD wählen und speichern",
        body: "Gibt es eine HD-Variante, wird sie geliefert; sonst die beste SD, und das Ergebnispanel sagt, welche kam. Lange Watch-Videos werden gestreamt, deshalb lädt auch eine Datei über 1 GB wie ein kurzer Clip.",
      },
    ],
    faqHeading: "Häufige Fragen",
    faqs: [
      {
        question: "Muss ich etwas installieren?",
        answer:
          "Nein. Alles läuft im Browser auf iPhone, Android, Windows und Mac: kein APK, keine Erweiterung, keine Berechtigungen. Genau darin unterscheidet sich die Seite von Angeboten, die erst eine Installation verlangen.",
      },
      {
        question: "Funktionieren fb.watch-Links?",
        answer:
          "Ja. Es ist ein Kurzlink, nicht die Videoadresse, deshalb wird die Weiterleitungskette serverseitig verfolgt. Darum funktioniert hier ein Link, den andere Werkzeuge als ungültig bezeichnen.",
      },
      {
        question: "Warum kommt manchmal SD statt HD?",
        answer:
          "Weil Facebook für dieses Video keine HD-Variante veröffentlicht hat. HD wird zuerst angefragt, dann die beste SD genommen — und das Panel nennt die tatsächlich gelieferte Stufe statt 360p als HD zu etikettieren.",
      },
      {
        question: "Gehen private oder Gruppen-Videos?",
        answer:
          "Nein. Sie brauchen eine Sitzung mit Sehberechtigung, und diese Seite fragt nie nach Facebook-Zugangsdaten. Öffentliche Seitenposts, öffentliche Watch-Videos und Reels funktionieren.",
      },
    ],
    cta: {
      heading: "Das Video sichern, bevor es verschwindet",
      body: "Ohne Konto, ohne Installation und ohne Größenlimit.",
      button: "Zum Downloader",
    },
    otherToolsHeading: "Weitere Werkzeuge nach Plattform",
    footerNote: "Private Videos und geschlossene Gruppen bleiben bewusst außen vor: Es gibt keine öffentliche Datei.",
  },
};

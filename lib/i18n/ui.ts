import type { LocaleCode } from "@/lib/i18n/types";

/**
 * The interactive tool's chrome, in each locale.
 *
 * The landings, steps, FAQ and footer were translated, but the thing people
 * actually touch — the URL field, the Paste button, the Download CTA and the
 * result panel's buttons — stayed English on every /[lang] page. That reads as
 * a partially translated site, and it is the part a non-English visitor must
 * understand to convert at all.
 *
 * Scope on purpose: this is the *control* language (labels and buttons). Long
 * prose lives in `lib/i18n/<code>.ts`, and the theater's status microcopy
 * ("Download Started in Your Browser!") stays English for now — it changes on
 * every build and would otherwise need a translation for each variant.
 *
 * Every locale is a total entry: adding a code to `LOCALE_CODES` without a
 * `DownloaderCopy` is a compile error, not a page where one button reverts to
 * English.
 */
export interface DownloaderCopy {
  /** Input placeholder — the one line every visitor reads before typing. */
  placeholder: string;
  inputLabel: string;
  paste: string;
  pasteHint: string;
  /** Desired desktop CTA ("Download Without Watermark"). */
  submit: string;
  /** The same CTA where it must fit a phone-width button. */
  submitShort: string;
  analyzing: string;
  /** Status line under the field, before anything is typed. */
  idleHint: string;
  /** "Server-side · nothing stored" — the trust line under the field. */
  privacy: string;
  sample: string;
  ready: string;
  resolving: string;
  streamReady: string;
  downloadHd: string;
  downloadVideo: string;
  downloadAudio: string;
  another: string;
  sponsored: string;
  modalTitle: string;
  modalBody: string;
  modalCta: string;
  modalClose: string;
}

/** English defaults — the platform pages pass no locale and get exactly what they had. */
export const ENGLISH_DOWNLOADER_COPY: DownloaderCopy = {
  placeholder: "Paste a TikTok, Instagram, Facebook or YouTube link",
  inputLabel: "Video link",
  paste: "Paste",
  pasteHint: "Paste video link from clipboard",
  submit: "Download Without Watermark",
  submitShort: "Download",
  analyzing: "Analyzing stream…",
  idleHint: "Paste a link to start",
  privacy: "Server-side · nothing stored",
  sample: "Try a sample",
  ready: "Ready",
  resolving: "Resolving",
  streamReady: "Stream ready",
  downloadHd: "Download HD Video",
  downloadVideo: "Download Video",
  downloadAudio: "Download Audio",
  another: "Download Another Video",
  sponsored: "Sponsored",
  modalTitle: "Your download has started!",
  modalBody:
    "Your file is in your browser's Downloads tray. This short sponsor break keeps LAMP TIK free.",
  modalCta: "Download Another Video",
  modalClose: "Not now — keep this video",
};

export const DOWNLOADER_COPY: Record<LocaleCode, DownloaderCopy> = {
  es: {
    placeholder: "Pega el enlace del vídeo aquí",
    inputLabel: "Enlace del vídeo",
    paste: "Pegar",
    pasteHint: "Pegar el enlace desde el portapapeles",
    submit: "Descargar sin marca de agua",
    submitShort: "Descargar",
    analyzing: "Analizando el vídeo…",
    idleHint: "Pega un enlace para empezar",
    privacy: "En el servidor · nada guardado",
    sample: "Probar un ejemplo",
    ready: "Listo",
    resolving: "Resolviendo",
    streamReady: "Stream listo",
    downloadHd: "Descargar vídeo HD",
    downloadVideo: "Descargar vídeo",
    downloadAudio: "Descargar audio",
    another: "Descargar otro vídeo",
    sponsored: "Patrocinado",
    modalTitle: "¡Tu descarga ha comenzado!",
    modalBody:
      "Tu archivo ya está en la carpeta de descargas del navegador. Este breve patrocinio mantiene LAMP TIK gratis.",
    modalCta: "Descargar otro vídeo",
    modalClose: "Ahora no — seguir con este vídeo",
  },
  ar: {
    placeholder: "الصق رابط الفيديو هنا",
    inputLabel: "رابط الفيديو",
    paste: "لصق",
    pasteHint: "لصق رابط الفيديو من الحافظة",
    submit: "تنزيل بدون علامة مائية",
    submitShort: "تنزيل",
    analyzing: "جارٍ تحليل الفيديو…",
    idleHint: "الصق رابطًا للبدء",
    privacy: "على الخادم · لا شيء محفوظ",
    sample: "جرّب رابطًا تجريبيًا",
    ready: "جاهز",
    resolving: "جارٍ التحضير",
    streamReady: "البث جاهز",
    downloadHd: "تنزيل الفيديو HD",
    downloadVideo: "تنزيل الفيديو",
    downloadAudio: "تنزيل الصوت",
    another: "تنزيل فيديو آخر",
    sponsored: "إعلان مدفوع",
    modalTitle: "بدأ التنزيل!",
    modalBody:
      "ملفك الآن في مجلد التنزيلات في متصفحك. هذا الفاصل القصير يبقي LAMP TIK مجانيًا.",
    modalCta: "تنزيل فيديو آخر",
    modalClose: "ليس الآن — أبقِ هذا الفيديو",
  },
  de: {
    placeholder: "Video-Link hier einfügen",
    inputLabel: "Video-Link",
    paste: "Einfügen",
    pasteHint: "Video-Link aus der Zwischenablage einfügen",
    submit: "Ohne Wasserzeichen herunterladen",
    submitShort: "Laden",
    analyzing: "Stream wird analysiert…",
    idleHint: "Link einfügen, um zu starten",
    privacy: "Serverseitig · nichts gespeichert",
    sample: "Beispiel testen",
    ready: "Bereit",
    resolving: "Wird aufgelöst",
    streamReady: "Stream bereit",
    downloadHd: "HD-Video laden",
    downloadVideo: "Video laden",
    downloadAudio: "Audio laden",
    another: "Weiteres Video laden",
    sponsored: "Anzeige",
    modalTitle: "Dein Download läuft!",
    modalBody:
      "Deine Datei liegt bereits im Download-Ordner deines Browsers. Diese kurze Werbepause hält LAMP TIK kostenlos.",
    modalCta: "Weiteres Video laden",
    modalClose: "Nicht jetzt – dieses Video behalten",
  },
  pt: {
    placeholder: "Cole o link do vídeo aqui",
    inputLabel: "Link do vídeo",
    paste: "Colar",
    pasteHint: "Colar o link do vídeo da área de transferência",
    submit: "Baixar sem marca d'água",
    submitShort: "Baixar",
    analyzing: "Analisando o vídeo…",
    idleHint: "Cole um link para começar",
    privacy: "No servidor · nada armazenado",
    sample: "Testar um exemplo",
    ready: "Pronto",
    resolving: "Resolvendo",
    streamReady: "Stream pronto",
    downloadHd: "Baixar vídeo HD",
    downloadVideo: "Baixar vídeo",
    downloadAudio: "Baixar áudio",
    another: "Baixar outro vídeo",
    sponsored: "Patrocinado",
    modalTitle: "Seu download começou!",
    modalBody:
      "Seu arquivo já está na pasta de downloads do navegador. Este breve patrocínio mantém o LAMP TIK gratuito.",
    modalCta: "Baixar outro vídeo",
    modalClose: "Agora não — manter este vídeo",
  },
  id: {
    placeholder: "Tempel tautan video di sini",
    inputLabel: "Tautan video",
    paste: "Tempel",
    pasteHint: "Tempel tautan video dari papan klip",
    submit: "Unduh tanpa watermark",
    submitShort: "Unduh",
    analyzing: "Menganalisis video…",
    idleHint: "Tempel tautan untuk mulai",
    privacy: "Di server · tidak disimpan",
    sample: "Coba contoh",
    ready: "Siap",
    resolving: "Memproses",
    streamReady: "Stream siap",
    downloadHd: "Unduh video HD",
    downloadVideo: "Unduh video",
    downloadAudio: "Unduh audio",
    another: "Unduh video lain",
    sponsored: "Bersponsor",
    modalTitle: "Unduhan dimulai!",
    modalBody:
      "File Anda sudah ada di folder unduhan browser. Jeda sponsor singkat ini menjaga LAMP TIK tetap gratis.",
    modalCta: "Unduh video lain",
    modalClose: "Nanti saja — simpan video ini",
  },
  hi: {
    placeholder: "वीडियो लिंक यहाँ पेस्ट करें",
    inputLabel: "वीडियो लिंक",
    paste: "पेस्ट",
    pasteHint: "क्लिपबोर्ड से वीडियो लिंक पेस्ट करें",
    submit: "बिना वॉटरमार्क डाउनलोड करें",
    submitShort: "डाउनलोड",
    analyzing: "वीडियो जाँचा जा रहा है…",
    idleHint: "शुरू करने के लिए लिंक पेस्ट करें",
    privacy: "सर्वर पर · कुछ भी सेव नहीं",
    sample: "नमूना आज़माएँ",
    ready: "तैयार",
    resolving: "तैयार हो रहा है",
    streamReady: "स्ट्रीम तैयार",
    downloadHd: "HD वीडियो डाउनलोड करें",
    downloadVideo: "वीडियो डाउनलोड करें",
    downloadAudio: "ऑडियो डाउनलोड करें",
    another: "दूसरा वीडियो डाउनलोड करें",
    sponsored: "प्रायोजित",
    modalTitle: "डाउनलोड शुरू हो गया!",
    modalBody:
      "आपकी फ़ाइल ब्राउज़र के डाउनलोड फ़ोल्डर में है। यह छोटा विज्ञापन LAMP TIK को मुफ़्त रखता है।",
    modalCta: "दूसरा वीडियो डाउनलोड करें",
    modalClose: "अभी नहीं — यह वीडियो रखें",
  },
  ur: {
    placeholder: "ویڈیو کا لنک یہاں پیسٹ کریں",
    inputLabel: "ویڈیو لنک",
    paste: "پیسٹ",
    pasteHint: "کلپ بورڈ سے ویڈیو لنک پیسٹ کریں",
    submit: "بغیر واٹر مارک ڈاؤن لوڈ کریں",
    submitShort: "ڈاؤن لوڈ",
    analyzing: "ویڈیو دیکھی جا رہی ہے…",
    idleHint: "شروع کرنے کے لیے لنک پیسٹ کریں",
    privacy: "سرور پر · کچھ محفوظ نہیں",
    sample: "نمونہ آزمائیں",
    ready: "تیار",
    resolving: "تیار ہو رہا ہے",
    streamReady: "اسٹریم تیار",
    downloadHd: "HD ویڈیو ڈاؤن لوڈ کریں",
    downloadVideo: "ویڈیو ڈاؤن لوڈ کریں",
    downloadAudio: "آواز ڈاؤن لوڈ کریں",
    another: "دوسری ویڈیو ڈاؤن لوڈ کریں",
    sponsored: "اشتہار",
    modalTitle: "ڈاؤن لوڈ شروع ہو گیا!",
    modalBody:
      "آپ کی فائل براؤزر کے ڈاؤن لوڈز میں ہے۔ یہ مختصر اشتہار LAMP TIK کو مفت رکھتا ہے۔",
    modalCta: "دوسری ویڈیو ڈاؤن لوڈ کریں",
    modalClose: "ابھی نہیں — یہ ویڈیو رکھیں",
  },
  vi: {
    placeholder: "Dán liên kết video vào đây",
    inputLabel: "Liên kết video",
    paste: "Dán",
    pasteHint: "Dán liên kết video từ bộ nhớ tạm",
    submit: "Tải video không logo",
    submitShort: "Tải xuống",
    analyzing: "Đang phân tích video…",
    idleHint: "Dán liên kết để bắt đầu",
    privacy: "Xử lý trên máy chủ · không lưu gì",
    sample: "Thử một ví dụ",
    ready: "Sẵn sàng",
    resolving: "Đang xử lý",
    streamReady: "Luồng đã sẵn sàng",
    downloadHd: "Tải video HD",
    downloadVideo: "Tải video",
    downloadAudio: "Tải âm thanh",
    another: "Tải video khác",
    sponsored: "Tài trợ",
    modalTitle: "Đã bắt đầu tải!",
    modalBody:
      "Tệp của bạn đã nằm trong thư mục tải xuống của trình duyệt. Khoảng nghỉ tài trợ ngắn này giúp LAMP TIK miễn phí.",
    modalCta: "Tải video khác",
    modalClose: "Để sau — giữ video này",
  },
  th: {
    placeholder: "วางลิงก์วิดีโอที่นี่",
    inputLabel: "ลิงก์วิดีโอ",
    paste: "วาง",
    pasteHint: "วางลิงก์วิดีโอจากคลิปบอร์ด",
    submit: "ดาวน์โหลดแบบไม่มีลายน้ำ",
    submitShort: "ดาวน์โหลด",
    analyzing: "กำลังวิเคราะห์วิดีโอ…",
    idleHint: "วางลิงก์เพื่อเริ่ม",
    privacy: "ทำงานบนเซิร์ฟเวอร์ · ไม่มีการเก็บ",
    sample: "ลองตัวอย่าง",
    ready: "พร้อม",
    resolving: "กำลังเตรียม",
    streamReady: "สตรีมพร้อม",
    downloadHd: "ดาวน์โหลดวิดีโอ HD",
    downloadVideo: "ดาวน์โหลดวิดีโอ",
    downloadAudio: "ดาวน์โหลดเสียง",
    another: "ดาวน์โหลดวิดีโออื่น",
    sponsored: "โฆษณา",
    modalTitle: "เริ่มดาวน์โหลดแล้ว!",
    modalBody:
      "ไฟล์ของคุณอยู่ในโฟลเดอร์ดาวน์โหลดของเบราว์เซอร์แล้ว ช่วงโฆษณาสั้น ๆ นี้ช่วยให้ LAMP TIK ฟรี",
    modalCta: "ดาวน์โหลดวิดีโออื่น",
    modalClose: "ไว้ก่อน — เก็บวิดีโอนี้",
  },
  tl: {
    placeholder: "I-paste ang link ng video dito",
    inputLabel: "Link ng video",
    paste: "I-paste",
    pasteHint: "I-paste ang link ng video mula sa clipboard",
    submit: "I-download na walang watermark",
    submitShort: "I-download",
    analyzing: "Sinusuri ang video…",
    idleHint: "Mag-paste ng link para magsimula",
    privacy: "Sa server · walang naka-save",
    sample: "Subukan ang halimbawa",
    ready: "Handa",
    resolving: "Inihahanda",
    streamReady: "Handa ang stream",
    downloadHd: "I-download ang HD video",
    downloadVideo: "I-download ang video",
    downloadAudio: "I-download ang audio",
    another: "I-download ang ibang video",
    sponsored: "May sponsor",
    modalTitle: "Nagsimula na ang download!",
    modalBody:
      "Nasa download folder na ng browser ang file mo. Ang maikling sponsor break na ito ang nagpapanatiling libre ang LAMP TIK.",
    modalCta: "I-download ang ibang video",
    modalClose: "Mamaya na — itago ang video na ito",
  },
  tr: {
    placeholder: "Video bağlantısını buraya yapıştırın",
    inputLabel: "Video bağlantısı",
    paste: "Yapıştır",
    pasteHint: "Video bağlantısını panodan yapıştır",
    submit: "Filigransız indir",
    submitShort: "İndir",
    analyzing: "Video çözümleniyor…",
    idleHint: "Başlamak için bir bağlantı yapıştırın",
    privacy: "Sunucuda işlenir · hiçbir şey saklanmaz",
    sample: "Örneği dene",
    ready: "Hazır",
    resolving: "Çözümleniyor",
    streamReady: "Akış hazır",
    downloadHd: "HD videoyu indir",
    downloadVideo: "Videoyu indir",
    downloadAudio: "Sesi indir",
    another: "Başka video indir",
    sponsored: "Sponsorlu",
    modalTitle: "İndirme başladı!",
    modalBody:
      "Dosyanız artık tarayıcınızın indirilenler klasöründe. Bu kısa sponsor arası LAMP TIK'i ücretsiz tutuyor.",
    modalCta: "Başka video indir",
    modalClose: "Şimdi değil — bu videoyu koru",
  },
  fr: {
    placeholder: "Collez le lien de la vidéo ici",
    inputLabel: "Lien de la vidéo",
    paste: "Coller",
    pasteHint: "Coller le lien de la vidéo depuis le presse-papiers",
    submit: "Télécharger sans filigrane",
    submitShort: "Télécharger",
    analyzing: "Analyse de la vidéo…",
    idleHint: "Collez un lien pour commencer",
    privacy: "Côté serveur · rien n'est conservé",
    sample: "Essayer un exemple",
    ready: "Prêt",
    resolving: "Résolution",
    streamReady: "Flux prêt",
    downloadHd: "Télécharger la vidéo HD",
    downloadVideo: "Télécharger la vidéo",
    downloadAudio: "Télécharger l'audio",
    another: "Télécharger une autre vidéo",
    sponsored: "Sponsorisé",
    modalTitle: "Votre téléchargement a démarré !",
    modalBody:
      "Votre fichier est déjà dans le dossier de téléchargements du navigateur. Cette courte pause sponsor garde LAMP TIK gratuit.",
    modalCta: "Télécharger une autre vidéo",
    modalClose: "Pas maintenant — garder cette vidéo",
  },
};

/** Copy for a route's locale; English when it is not a localized page. */
export function downloaderCopy(locale?: string | null): DownloaderCopy {
  if (!locale) return ENGLISH_DOWNLOADER_COPY;
  return DOWNLOADER_COPY[locale as LocaleCode] ?? ENGLISH_DOWNLOADER_COPY;
}

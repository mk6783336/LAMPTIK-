import type { LocaleCode } from "@/lib/i18n/types";

/**
 * The footer in each locale.
 *
 * The footer is the last screen on every localized page, and it used to be the
 * one part of the site that stayed English: a Hindi reader got a translated
 * hero, steps, FAQ and tool cards, then a closing panel and seven column
 * headings in a language they had not chosen. These strings fix that.
 *
 * Group and link ids are explicit so a locale missing a translation is a type
 * error rather than a lone English word among translated ones. Link
 * *destinations* are not localized: sub-tools, guides and the legal pages exist
 * only in English, so translating their labels while the target stays English
 * would promise more than the site delivers. The language names themselves are
 * endonyms and live in `language-labels.ts`.
 */
export type FooterGroupId =
  | "downloaders"
  | "subTools"
  | "languages"
  | "product"
  | "company"
  | "guides"
  | "legal";

export type FooterLinkId =
  // Downloaders
  | "tiktok"
  | "instagram"
  | "facebook"
  | "youtube"
  // Sub-tools
  | "allTools"
  | "tiktokMp3"
  | "tiktokPhotos"
  | "youtubeMp3"
  | "youtubePlaylist"
  | "tiktokStory"
  | "instagramStory"
  | "reelsAudio"
  | "facebookReels"
  | "youtubeShorts"
  // Product
  | "guides"
  | "howItWorks"
  | "faq"
  | "apiStatus"
  // Company
  | "services"
  | "about"
  | "apps"
  | "contact"
  // Guides
  | "guideNoWatermark"
  | "guideTiktokMp3"
  | "guideShortLinks"
  | "guideIgReelsHd"
  | "guideLongFb"
  | "guideSafety"
  // Legal
  | "privacy"
  | "terms";

export interface FooterCopy {
  cta: { heading: string; body: string; button: string };
  /** The paragraph beside the logo. */
  tagline: string;
  /** Status pill under the tagline. */
  status: string;
  groups: Record<FooterGroupId, string>;
  links: Record<FooterLinkId, string>;
  /** `{year}` is replaced at render time so the copyright never goes stale. */
  copyright: string;
  legalNote: string;
}

export const FOOTER_COPY: Record<LocaleCode, FooterCopy> = {
  es: {
    cta: {
      heading: "Guarda tu próximo vídeo en HD.",
      body: "Pega un enlace y obtén la transmisión original. Sin cuenta, sin app y sin guardar nada.",
      button: "Abrir el descargador",
    },
    tagline:
      "Descargas HD sin marca de agua de TikTok, Instagram, Facebook y YouTube. Pega un enlace y obtén la transmisión original. Sin cuenta y sin rastrear tus descargas.",
    status: "Todo funcionando",
    groups: {
      downloaders: "Descargadores",
      subTools: "Herramientas",
      languages: "Idiomas",
      product: "Producto",
      company: "Empresa",
      guides: "Guías",
      legal: "Legal",
    },
    links: {
      tiktok: "TikTok sin marca",
      instagram: "Reels de Instagram",
      facebook: "Facebook HD",
      youtube: "YouTube HD",
      allTools: "Las 15 herramientas",
      tiktokMp3: "TikTok a MP3",
      tiktokPhotos: "Fotos de TikTok",
      youtubeMp3: "YouTube a MP3",
      youtubePlaylist: "Playlist de YouTube",
      tiktokStory: "Historias de TikTok",
      instagramStory: "Historias de Instagram",
      reelsAudio: "Audio de Reels",
      facebookReels: "Reels de Facebook",
      youtubeShorts: "Shorts de YouTube",
      guides: "Guías",
      howItWorks: "Cómo funciona",
      faq: "Preguntas frecuentes",
      apiStatus: "Estado de la API",
      services: "Servicios web",
      about: "Acerca de",
      apps: "App y extensión",
      contact: "Contacto y DMCA",
      guideNoWatermark: "Sin marca de agua",
      guideTiktokMp3: "Guía TikTok a MP3",
      guideShortLinks: "Enlaces cortos",
      guideIgReelsHd: "Reels en HD",
      guideLongFb: "Vídeos largos de FB",
      guideSafety: "Seguridad",
      privacy: "Privacidad",
      terms: "Términos",
    },
    copyright:
      "© {year} LAMP TIK. Sin relación con TikTok, ByteDance, Instagram, Facebook ni Meta.",
    legalNote: "Descarga solo contenido que tengas derecho a usar.",
  },

  ar: {
    cta: {
      heading: "احفظ فيديوك القادم بجودة HD.",
      body: "الصق رابطًا واحصل على البث الأصلي. بدون حساب وبدون تطبيق وبدون تخزين أي ملف.",
      button: "افتح أداة التنزيل",
    },
    tagline:
      "تنزيلات HD بدون علامة مائية من تيك توك وإنستغرام وفيسبوك ويوتيوب. الصق رابطًا واحصل على البث الأصلي. بدون حساب وبدون تتبّع لتنزيلاتك.",
    status: "كل الأنظمة تعمل",
    groups: {
      downloaders: "أدوات التنزيل",
      subTools: "أدوات أخرى",
      languages: "اللغات",
      product: "المنتج",
      company: "الشركة",
      guides: "أدلة",
      legal: "قانوني",
    },
    links: {
      tiktok: "تيك توك بدون علامة",
      instagram: "ريلز إنستغرام",
      facebook: "فيسبوك HD",
      youtube: "يوتيوب HD",
      allTools: "كل الأدوات",
      tiktokMp3: "تيك توك إلى MP3",
      tiktokPhotos: "صور تيك توك",
      youtubeMp3: "يوتيوب إلى MP3",
      youtubePlaylist: "قائمة تشغيل يوتيوب",
      tiktokStory: "ستوري تيك توك",
      instagramStory: "ستوري إنستغرام",
      reelsAudio: "صوت الريلز",
      facebookReels: "ريلز فيسبوك",
      youtubeShorts: "شورتس يوتيوب",
      guides: "أدلة",
      howItWorks: "كيف يعمل",
      faq: "الأسئلة الشائعة",
      apiStatus: "حالة الواجهة",
      services: "خدمات الويب",
      about: "من نحن",
      apps: "التطبيق والإضافة",
      contact: "اتصال وDMCA",
      guideNoWatermark: "بدون علامة مائية",
      guideTiktokMp3: "دليل تيك توك إلى MP3",
      guideShortLinks: "الروابط القصيرة",
      guideIgReelsHd: "ريلز بجودة HD",
      guideLongFb: "فيديوهات فيسبوك الطويلة",
      guideSafety: "الأمان",
      privacy: "الخصوصية",
      terms: "الشروط",
    },
    copyright:
      "© {year} LAMP TIK. لا علاقة له بـ TikTok أو ByteDance أو Instagram أو Facebook أو Meta.",
    legalNote: "نزّل فقط المحتوى الذي يحق لك استخدامه.",
  },

  de: {
    cta: {
      heading: "Speichere dein nächstes Video in HD.",
      body: "Link einfügen und den Originalstream erhalten. Kein Konto, keine App, nichts gespeichert.",
      button: "Downloader öffnen",
    },
    tagline:
      "Wasserzeichenfreie HD-Downloads von TikTok, Instagram, Facebook und YouTube. Link einfügen, Originalstream bekommen. Kein Konto, kein Tracking deiner Downloads.",
    status: "Alle Systeme laufen",
    groups: {
      downloaders: "Downloader",
      subTools: "Werkzeuge",
      languages: "Sprachen",
      product: "Produkt",
      company: "Unternehmen",
      guides: "Anleitungen",
      legal: "Rechtliches",
    },
    links: {
      tiktok: "TikTok ohne Logo",
      instagram: "Instagram Reels",
      facebook: "Facebook HD",
      youtube: "YouTube HD",
      allTools: "Alle 15 Werkzeuge",
      tiktokMp3: "TikTok zu MP3",
      tiktokPhotos: "TikTok-Fotos",
      youtubeMp3: "YouTube zu MP3",
      youtubePlaylist: "YouTube-Playlist",
      tiktokStory: "TikTok-Story",
      instagramStory: "Instagram-Story",
      reelsAudio: "Reels-Audio",
      facebookReels: "Facebook Reels",
      youtubeShorts: "YouTube Shorts",
      guides: "Anleitungen",
      howItWorks: "So funktioniert es",
      faq: "FAQ",
      apiStatus: "API-Status",
      services: "Web-Aufträge",
      about: "Über uns",
      apps: "App & Extension",
      contact: "Kontakt & DMCA",
      guideNoWatermark: "Ohne Wasserzeichen",
      guideTiktokMp3: "TikTok zu MP3: Anleitung",
      guideShortLinks: "Kurzlinks",
      guideIgReelsHd: "Reels in HD",
      guideLongFb: "Lange FB-Videos",
      guideSafety: "Sicherheit",
      privacy: "Datenschutz",
      terms: "Nutzungsbedingungen",
    },
    copyright:
      "© {year} LAMP TIK. Nicht mit TikTok, ByteDance, Instagram, Facebook oder Meta verbunden.",
    legalNote: "Lade nur Inhalte herunter, die du verwenden darfst.",
  },

  pt: {
    cta: {
      heading: "Salve seu próximo vídeo em HD.",
      body: "Cole um link e receba o stream original. Sem conta, sem app e nada armazenado.",
      button: "Abrir o baixador",
    },
    tagline:
      "Downloads em HD sem marca d'água do TikTok, Instagram, Facebook e YouTube. Cole um link e receba o stream original. Sem conta e sem rastrear seus downloads.",
    status: "Tudo funcionando",
    groups: {
      downloaders: "Baixadores",
      subTools: "Ferramentas",
      languages: "Idiomas",
      product: "Produto",
      company: "Empresa",
      guides: "Guias",
      legal: "Legal",
    },
    links: {
      tiktok: "TikTok sem marca",
      instagram: "Reels do Instagram",
      facebook: "Facebook HD",
      youtube: "YouTube HD",
      allTools: "As 15 ferramentas",
      tiktokMp3: "TikTok para MP3",
      tiktokPhotos: "Fotos do TikTok",
      youtubeMp3: "YouTube para MP3",
      youtubePlaylist: "Playlist do YouTube",
      tiktokStory: "Stories do TikTok",
      instagramStory: "Stories do Instagram",
      reelsAudio: "Áudio dos Reels",
      facebookReels: "Reels do Facebook",
      youtubeShorts: "Shorts do YouTube",
      guides: "Guias",
      howItWorks: "Como funciona",
      faq: "Perguntas frequentes",
      apiStatus: "Status da API",
      services: "Serviços web",
      about: "Sobre",
      apps: "App e extensão",
      contact: "Contato e DMCA",
      guideNoWatermark: "Sem marca d'água",
      guideTiktokMp3: "Guia TikTok para MP3",
      guideShortLinks: "Links curtos",
      guideIgReelsHd: "Reels em HD",
      guideLongFb: "Vídeos longos do FB",
      guideSafety: "Segurança",
      privacy: "Privacidade",
      terms: "Termos",
    },
    copyright: "© {year} LAMP TIK. Sem vínculo com TikTok, ByteDance, Instagram, Facebook ou Meta.",
    legalNote: "Baixe apenas conteúdo que você tem direito de usar.",
  },

  id: {
    cta: {
      heading: "Simpan video berikutnya dalam HD.",
      body: "Tempel tautan dan dapatkan stream aslinya. Tanpa akun, tanpa aplikasi, tidak ada yang disimpan.",
      button: "Buka pengunduh",
    },
    tagline:
      "Unduhan HD tanpa watermark dari TikTok, Instagram, Facebook, dan YouTube. Tempel tautan, dapatkan stream aslinya. Tanpa akun dan tanpa melacak unduhan Anda.",
    status: "Semua sistem normal",
    groups: {
      downloaders: "Pengunduh",
      subTools: "Alat lain",
      languages: "Bahasa",
      product: "Produk",
      company: "Perusahaan",
      guides: "Panduan",
      legal: "Legal",
    },
    links: {
      tiktok: "TikTok tanpa watermark",
      instagram: "Reels Instagram",
      facebook: "Facebook HD",
      youtube: "YouTube HD",
      allTools: "Semua 15 alat",
      tiktokMp3: "TikTok ke MP3",
      tiktokPhotos: "Foto TikTok",
      youtubeMp3: "YouTube ke MP3",
      youtubePlaylist: "Playlist YouTube",
      tiktokStory: "Story TikTok",
      instagramStory: "Story Instagram",
      reelsAudio: "Audio Reels",
      facebookReels: "Reels Facebook",
      youtubeShorts: "Shorts YouTube",
      guides: "Panduan",
      howItWorks: "Cara kerja",
      faq: "Pertanyaan umum",
      apiStatus: "Status API",
      services: "Jasa web",
      about: "Tentang",
      apps: "Aplikasi & ekstensi",
      contact: "Kontak & DMCA",
      guideNoWatermark: "Tanpa watermark",
      guideTiktokMp3: "Panduan TikTok ke MP3",
      guideShortLinks: "Tautan pendek",
      guideIgReelsHd: "Reels HD",
      guideLongFb: "Video FB panjang",
      guideSafety: "Keamanan",
      privacy: "Privasi",
      terms: "Ketentuan",
    },
    copyright:
      "© {year} LAMP TIK. Tidak berafiliasi dengan TikTok, ByteDance, Instagram, Facebook, atau Meta.",
    legalNote: "Unduh hanya konten yang berhak Anda gunakan.",
  },

  hi: {
    cta: {
      heading: "अगला वीडियो HD में सेव करें।",
      body: "लिंक पेस्ट करें और ओरिजिनल स्ट्रीम पाएँ। कोई अकाउंट नहीं, कोई ऐप नहीं, कुछ सेव नहीं होता।",
      button: "डाउनलोडर खोलें",
    },
    tagline:
      "TikTok, Instagram, Facebook और YouTube से बिना वॉटरमार्क HD डाउनलोड। लिंक पेस्ट करें और ओरिजिनल स्ट्रीम पाएँ। कोई अकाउंट नहीं और आपके डाउनलोड ट्रैक नहीं होते।",
    status: "सभी सिस्टम चालू",
    groups: {
      downloaders: "डाउनलोडर",
      subTools: "दूसरे टूल्स",
      languages: "भाषाएँ",
      product: "प्रोडक्ट",
      company: "कंपनी",
      guides: "गाइड",
      legal: "कानूनी",
    },
    links: {
      tiktok: "TikTok बिना वॉटरमार्क",
      instagram: "Instagram Reels",
      facebook: "Facebook HD",
      youtube: "YouTube HD",
      allTools: "सभी 15 टूल्स",
      tiktokMp3: "TikTok से MP3",
      tiktokPhotos: "TikTok फ़ोटो",
      youtubeMp3: "YouTube से MP3",
      youtubePlaylist: "YouTube प्लेलिस्ट",
      tiktokStory: "TikTok स्टोरी",
      instagramStory: "Instagram स्टोरी",
      reelsAudio: "Reels ऑडियो",
      facebookReels: "Facebook Reels",
      youtubeShorts: "YouTube Shorts",
      guides: "गाइड",
      howItWorks: "कैसे काम करता है",
      faq: "सामान्य सवाल",
      apiStatus: "API स्थिति",
      services: "वेब सेवाएँ",
      about: "हमारे बारे में",
      apps: "ऐप और एक्सटेंशन",
      contact: "संपर्क और DMCA",
      guideNoWatermark: "बिना वॉटरमार्क",
      guideTiktokMp3: "TikTok से MP3 गाइड",
      guideShortLinks: "शॉर्ट लिंक",
      guideIgReelsHd: "Reels HD",
      guideLongFb: "लंबे FB वीडियो",
      guideSafety: "सुरक्षा",
      privacy: "प्राइवेसी",
      terms: "शर्तें",
    },
    copyright:
      "© {year} LAMP TIK. TikTok, ByteDance, Instagram, Facebook या Meta से कोई संबंध नहीं।",
    legalNote: "सिर्फ़ वही कॉन्टेंट डाउनलोड करें जिसे इस्तेमाल करने का हक़ आपके पास है।",
  },

  vi: {
    cta: {
      heading: "Lưu video tiếp theo ở chất lượng HD.",
      body: "Dán liên kết và nhận luồng gốc. Không tài khoản, không ứng dụng, không lưu gì.",
      button: "Mở trình tải",
    },
    tagline:
      "Tải HD không logo từ TikTok, Instagram, Facebook và YouTube. Dán liên kết và nhận luồng gốc. Không tài khoản, không theo dõi lượt tải của bạn.",
    status: "Mọi hệ thống bình thường",
    groups: {
      downloaders: "Trình tải",
      subTools: "Công cụ khác",
      languages: "Ngôn ngữ",
      product: "Sản phẩm",
      company: "Công ty",
      guides: "Hướng dẫn",
      legal: "Pháp lý",
    },
    links: {
      tiktok: "TikTok không logo",
      instagram: "Reels Instagram",
      facebook: "Facebook HD",
      youtube: "YouTube HD",
      allTools: "Tất cả 15 công cụ",
      tiktokMp3: "TikTok sang MP3",
      tiktokPhotos: "Ảnh TikTok",
      youtubeMp3: "YouTube sang MP3",
      youtubePlaylist: "Danh sách phát YouTube",
      tiktokStory: "Tin TikTok",
      instagramStory: "Tin Instagram",
      reelsAudio: "Âm thanh Reels",
      facebookReels: "Reels Facebook",
      youtubeShorts: "Shorts YouTube",
      guides: "Hướng dẫn",
      howItWorks: "Cách hoạt động",
      faq: "Câu hỏi thường gặp",
      apiStatus: "Trạng thái API",
      services: "Dịch vụ web",
      about: "Giới thiệu",
      apps: "Ứng dụng & tiện ích",
      contact: "Liên hệ & DMCA",
      guideNoWatermark: "Không logo",
      guideTiktokMp3: "Hướng dẫn TikTok sang MP3",
      guideShortLinks: "Link rút gọn",
      guideIgReelsHd: "Reels HD",
      guideLongFb: "Video FB dài",
      guideSafety: "An toàn",
      privacy: "Quyền riêng tư",
      terms: "Điều khoản",
    },
    copyright:
      "© {year} LAMP TIK. Không liên kết với TikTok, ByteDance, Instagram, Facebook hay Meta.",
    legalNote: "Chỉ tải nội dung bạn có quyền sử dụng.",
  },

  th: {
    cta: {
      heading: "บันทึกวิดีโอถัดไปเป็น HD",
      body: "วางลิงก์แล้วรับไฟล์ต้นฉบับ ไม่ต้องมีบัญชี ไม่ต้องติดตั้งแอป และไม่มีการเก็บไฟล์",
      button: "เปิดตัวดาวน์โหลด",
    },
    tagline:
      "ดาวน์โหลด HD ไม่มีลายน้ำจาก TikTok, Instagram, Facebook และ YouTube วางลิงก์แล้วรับไฟล์ต้นฉบับ ไม่ต้องมีบัญชี และไม่ติดตามการดาวน์โหลดของคุณ",
    status: "ระบบทำงานปกติ",
    groups: {
      downloaders: "ตัวดาวน์โหลด",
      subTools: "เครื่องมืออื่น",
      languages: "ภาษา",
      product: "ผลิตภัณฑ์",
      company: "บริษัท",
      guides: "คู่มือ",
      legal: "กฎหมาย",
    },
    links: {
      tiktok: "TikTok ไม่มีลายน้ำ",
      instagram: "Reels Instagram",
      facebook: "Facebook HD",
      youtube: "YouTube HD",
      allTools: "เครื่องมือทั้ง 15",
      tiktokMp3: "TikTok เป็น MP3",
      tiktokPhotos: "รูปภาพ TikTok",
      youtubeMp3: "YouTube เป็น MP3",
      youtubePlaylist: "เพลย์ลิสต์ YouTube",
      tiktokStory: "สตอรี่ TikTok",
      instagramStory: "สตอรี่ Instagram",
      reelsAudio: "เสียง Reels",
      facebookReels: "Reels Facebook",
      youtubeShorts: "Shorts YouTube",
      guides: "คู่มือ",
      howItWorks: "วิธีการทำงาน",
      faq: "คำถามที่พบบ่อย",
      apiStatus: "สถานะ API",
      services: "บริการเว็บ",
      about: "เกี่ยวกับเรา",
      apps: "แอปและส่วนขยาย",
      contact: "ติดต่อและ DMCA",
      guideNoWatermark: "ไม่มีลายน้ำ",
      guideTiktokMp3: "คู่มือ TikTok เป็น MP3",
      guideShortLinks: "ลิงก์สั้น",
      guideIgReelsHd: "Reels HD",
      guideLongFb: "วิดีโอ FB ยาว",
      guideSafety: "ความปลอดภัย",
      privacy: "ความเป็นส่วนตัว",
      terms: "ข้อกำหนด",
    },
    copyright: "© {year} LAMP TIK ไม่เกี่ยวข้องกับ TikTok, ByteDance, Instagram, Facebook หรือ Meta",
    legalNote: "ดาวน์โหลดเฉพาะเนื้อหาที่คุณมีสิทธิ์ใช้",
  },

  tl: {
    cta: {
      heading: "I-save ang susunod na video sa HD.",
      body: "I-paste ang link at kunin ang orihinal na stream. Walang account, walang app, walang naitatago.",
      button: "Buksan ang downloader",
    },
    tagline:
      "HD na download na walang watermark mula sa TikTok, Instagram, Facebook at YouTube. I-paste ang link at kunin ang orihinal na stream. Walang account at walang pagsubaybay sa download mo.",
    status: "Maayos ang lahat",
    groups: {
      downloaders: "Mga downloader",
      subTools: "Iba pang tool",
      languages: "Mga wika",
      product: "Produkto",
      company: "Kumpanya",
      guides: "Gabay",
      legal: "Legal",
    },
    links: {
      tiktok: "TikTok walang watermark",
      instagram: "Instagram Reels",
      facebook: "Facebook HD",
      youtube: "YouTube HD",
      allTools: "Lahat ng 15 tool",
      tiktokMp3: "TikTok to MP3",
      tiktokPhotos: "TikTok Photos",
      youtubeMp3: "YouTube to MP3",
      youtubePlaylist: "YouTube Playlist",
      tiktokStory: "TikTok Story",
      instagramStory: "Instagram Story",
      reelsAudio: "Reels Audio",
      facebookReels: "Facebook Reels",
      youtubeShorts: "YouTube Shorts",
      guides: "Gabay",
      howItWorks: "Paano gumagana",
      faq: "Mga tanong",
      apiStatus: "API status",
      services: "Serbisyo sa web",
      about: "Tungkol",
      apps: "App at extension",
      contact: "Kontak at DMCA",
      guideNoWatermark: "Walang watermark",
      guideTiktokMp3: "Gabay: TikTok to MP3",
      guideShortLinks: "Short links",
      guideIgReelsHd: "Reels HD",
      guideLongFb: "Mahabang FB video",
      guideSafety: "Kaligtasan",
      privacy: "Privacy",
      terms: "Mga tuntunin",
    },
    copyright:
      "© {year} LAMP TIK. Walang kaugnayan sa TikTok, ByteDance, Instagram, Facebook, o Meta.",
    legalNote: "I-download lamang ang content na may karapatan kang gamitin.",
  },
};

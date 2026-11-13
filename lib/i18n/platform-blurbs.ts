import type { LocaleCode } from "@/lib/i18n/types";
import type { Platform } from "@/lib/platforms";

/**
 * The four tool descriptions in each locale's own words.
 *
 * These are the one-line blurbs under the "more tools" cards on every localized
 * page. The English originals live on `PLATFORMS` and stay there for the English
 * site; this map is what a German or Hindi reader gets instead of a sentence in
 * a language they did not come for. `TOOLS_HUB_CARD` at the end of the file is
 * the fourth card in the same grid, written per language too.
 *
 * Written per locale rather than translated word-for-word: the German blurb
 * names `vt-/vm-Kurzlinks`, the Vietnamese one keeps "không logo" (what people
 * actually search) instead of a literal "watermark", and the Arabic one spells
 * out "أكثر من 1 غيغابايت" because a bare "1GB+" reads as a code inside Arabic
 * prose. Brand names — TikTok, Instagram, Facebook, YouTube, IGTV, Shorts,
 * fb.watch — never translate.
 */
export const PLATFORM_BLURBS: Record<LocaleCode, Record<Platform, string>> = {
  es: {
    tiktok:
      "Vídeos de TikTok sin marca de agua en MP4 HD y el audio original en MP3 — también desde enlaces cortos vt/vm.",
    instagram:
      "Reels, vídeos de publicaciones e IGTV en calidad real — sin marca de agua y sin iniciar sesión.",
    facebook:
      "Vídeos largos de Watch (más de 1 GB), subidas de páginas y enlaces fb.watch resueltos al instante.",
    youtube:
      "MP4 en MP4, Shorts y audio MP3 desde cualquier enlace watch o youtu.be — gratis y sin app.",
  },
  ar: {
    tiktok:
      "فيديوهات تيك توك بدون علامة مائية بجودة MP4 HD والصوت الأصلي MP3 — حتى من روابط vt/vm القصيرة.",
    instagram:
      "ريلز وفيديوهات المنشورات وIGTV بجودة الأصلية — بدون علامة مائية وبدون تسجيل دخول.",
    facebook:
      "فيديوهات Watch الطويلة (أكثر من 1 غيغابايت) ورفعات الصفحات وروابط fb.watch تُفتح فورًا.",
    youtube:
      "MP4 بجودة MP4 وShorts وصوت MP3 من أي رابط watch أو youtu.be — مجانًا وبدون تطبيق.",
  },
  de: {
    tiktok:
      "TikTok-Videos ohne Wasserzeichen als HD-MP4 und der Originalton als MP3 — auch aus vt-/vm-Kurzlinks.",
    instagram:
      "Reels, Video-Posts und IGTV in voller MP4-Qualität — ohne Wasserzeichen, ohne Login.",
    facebook:
      "Lange Watch-Videos (über 1 GB), Seiten-Uploads und fb.watch-Links, die sofort aufgelöst werden.",
    youtube:
      "MP4 in MP4, Shorts und MP3-Audio aus jedem watch- oder youtu.be-Link — kostenlos, ohne App.",
  },
  pt: {
    tiktok:
      "Vídeos do TikTok sem marca d'água em MP4 HD e o áudio original em MP3 — inclusive links curtos vt/vm.",
    instagram:
      "Reels, vídeos de posts e IGTV na qualidade original — sem marca d'água e sem login.",
    facebook:
      "Vídeos longos do Watch (1 GB ou mais), uploads de páginas e links fb.watch resolvidos na hora.",
    youtube:
      "MP4 em MP4, Shorts e áudio MP3 de qualquer link watch ou youtu.be — grátis e sem app.",
  },
  id: {
    tiktok:
      "Video TikTok tanpa watermark dalam MP4 HD dan audio asli MP3 — termasuk tautan pendek vt/vm.",
    instagram:
      "Reels, video postingan, dan IGTV dengan kualitas asli MP4 — tanpa watermark, tanpa login.",
    facebook:
      "Video Watch panjang (1 GB lebih), unggahan halaman, dan tautan fb.watch yang langsung dibuka.",
    youtube:
      "MP4 atau 720p, Shorts, dan audio MP3 dari tautan watch atau youtu.be — gratis, tanpa aplikasi.",
  },
  hi: {
    tiktok:
      "TikTok वीडियो बिना वॉटरमार्क HD MP4 में और ओरिजिनल साउंड MP3 में — vt/vm शॉर्ट लिंक से भी।",
    instagram:
      "Reels, पोस्ट वीडियो और IGTV असली MP4 क्वालिटी में — बिना वॉटरमार्क, बिना लॉगिन।",
    facebook:
      "लंबे Watch वीडियो (1 GB से ज़्यादा), पेज अपलोड और fb.watch लिंक तुरंत खुलते हैं।",
    youtube:
      "किसी भी watch या youtu.be लिंक से MP4, Shorts और MP3 ऑडियो — मुफ़्त, बिना ऐप।",
  },
  vi: {
    tiktok:
      "Video TikTok không logo dạng MP4 HD và âm thanh gốc MP3 — kể cả link rút gọn vt/vm.",
    instagram:
      "Reels, video bài đăng và IGTV đúng chất lượng MP4 — không logo, không cần đăng nhập.",
    facebook:
      "Video Watch dài (trên 1 GB), video từ trang và link fb.watch được mở ngay.",
    youtube:
      "MP4 hoặc 720p, Shorts và âm thanh MP3 từ mọi link watch hay youtu.be — miễn phí, không cần app.",
  },
  th: {
    tiktok:
      "วิดีโอ TikTok ไม่มีลายน้ำเป็น MP4 HD พร้อมเสียงต้นฉบับ MP3 รวมถึงลิงก์สั้น vt/vm",
    instagram:
      "Reels วิดีโอโพสต์ และ IGTV คุณภาพเดิม MP4 ไม่มีลายน้ำ ไม่ต้องล็อกอิน",
    facebook:
      "วิดีโอ Watch ยาว ๆ (เกิน 1 GB) วิดีโอจากเพจ และลิงก์ fb.watch ที่เปิดทันที",
    youtube:
      "MP4 หรือ 720p, Shorts และเสียง MP3 จากลิงก์ watch หรือ youtu.be ฟรี ไม่ต้องติดตั้งแอป",
  },
  tl: {
    tiktok:
      "TikTok video na walang watermark sa MP4 HD at ang orihinal na tunog sa MP3 — pati na ang vt/vm short links.",
    instagram:
      "Reels, video ng post, at IGTV sa tunay na MP4 — walang watermark, walang login.",
    facebook:
      "Mahahabang Watch video (1 GB pataas), upload ng page, at fb.watch link na agad bumubukas.",
    youtube:
      "MP4 sa MP4, Shorts, at MP3 audio mula sa anumang watch o youtu.be link — libre, walang app.",
  },
  tr: {
    tiktok:
      "TikTok videoları filigransız HD MP4 ve orijinal ses MP3 olarak — vt/vm kısa bağlantıları dahil.",
    instagram:
      "Reels, gönderi videoları ve IGTV gerçek MP4 kalitede — filigransız, giriş yapmadan.",
    facebook:
      "Uzun Watch videoları (1 GB üzeri), sayfa yüklemeleri ve fb.watch bağlantıları anında açılır.",
    youtube:
      "Her watch veya youtu.be bağlantısından MP4, Shorts ve MP3 ses — ücretsiz, uygulamasız.",
  },
  fr: {
    tiktok:
      "Vidéos TikTok sans filigrane en MP4 HD et le son d'origine en MP3 — liens courts vt/vm compris.",
    instagram:
      "Reels, vidéos de publications et IGTV en vraie qualité MP4 — sans filigrane, sans connexion.",
    facebook:
      "Vidéos Watch longues (plus de 1 Go), uploads de pages et liens fb.watch ouverts instantanément.",
    youtube:
      "MP4 en MP4, Shorts et audio MP3 depuis n'importe quel lien watch ou youtu.be — gratuit, sans application.",
  },
  ur: {
    tiktok:
      "ٹک ٹاک ویڈیوز بغیر واٹر مارک HD MP4 میں اور اصل آواز MP3 میں — vt/vm چھوٹے لنک بھی۔",
    instagram:
      "ریلز، پوسٹ ویڈیوز اور IGTV اصل MP4 کوالٹی میں — بغیر واٹر مارک، بغیر لاگ اِن۔",
    facebook:
      "Watch کی لمبی ویڈیوز (1 GB سے زیادہ)، پیج اپلوڈز اور fb.watch لنک فوراً کھلتے ہیں۔",
    youtube:
      "کسی بھی watch یا youtu.be لنک سے MP4، Shorts اور MP3 آواز — مفت، بغیر ایپ۔",
  },
};

/**
 * The fourth card in the "more tools" grid: the /tools hub.
 *
 * It takes the slot of the card for the page the reader is already on — a
 * platform page used to link to itself — so the grid stays four cards deep and
 * every card goes somewhere new.
 */
export const TOOLS_HUB_CARD: Record<LocaleCode, { label: string; blurb: string }> = {
  es: {
    label: "Todas las herramientas",
    blurb: "El índice completo: por formato, por red y por idioma, en una sola página.",
  },
  ar: {
    label: "كل الأدوات",
    blurb: "الفهرس الكامل: تنزيل حسب الصيغة أو الشبكة أو اللغة في صفحة واحدة.",
  },
  de: {
    label: "Alle Werkzeuge",
    blurb: "Der komplette Index: Downloads nach Format, Netzwerk und Sprache auf einer Seite.",
  },
  pt: {
    label: "Todas as ferramentas",
    blurb: "O índice completo: downloads por formato, por rede e por idioma numa só página.",
  },
  id: {
    label: "Semua alat",
    blurb: "Indeks lengkap: unduhan menurut format, jaringan, dan bahasa dalam satu halaman.",
  },
  hi: {
    label: "सभी टूल्स",
    blurb: "पूरा इंडेक्स: फ़ॉर्मैट, प्लेटफ़ॉर्म और भाषा के हिसाब से डाउनलोड, एक ही पेज पर।",
  },
  vi: {
    label: "Tất cả công cụ",
    blurb: "Danh mục đầy đủ: tải theo định dạng, nền tảng và ngôn ngữ trong một trang.",
  },
  th: {
    label: "เครื่องมือทั้งหมด",
    blurb: "รวมทุกเครื่องมือ แยกตามไฟล์ แพลตฟอร์ม และภาษา ไว้ในหน้าเดียว",
  },
  tl: {
    label: "Lahat ng tool",
    blurb: "Ang buong listahan: download ayon sa format, platform, at wika sa isang pahina.",
  },
  tr: {
    label: "Tüm araçlar",
    blurb: "Tam dizin: biçime, platforma ve dile göre indirmeler tek sayfada.",
  },
  fr: {
    label: "Tous les outils",
    blurb: "L'index complet : téléchargements par format, par réseau et par langue sur une seule page.",
  },
  ur: {
    label: "تمام ٹولز",
    blurb: "مکمل فہرست: فارمیٹ، پلیٹ فارم اور زبان کے حساب سے ڈاؤن لوڈ، ایک ہی صفحے پر۔",
  },
};

/** The blurb for one tool, in the reader's language. */
export function platformBlurb(code: LocaleCode, platform: Platform): string {
  return PLATFORM_BLURBS[code][platform];
}

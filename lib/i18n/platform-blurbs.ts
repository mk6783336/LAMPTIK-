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
      "Reels, vídeos de publicaciones e IGTV en 1080p real — sin marca de agua y sin iniciar sesión.",
    facebook:
      "Vídeos largos de Watch (más de 1 GB), subidas de páginas y enlaces fb.watch resueltos al instante.",
    youtube:
      "MP4 en 1080p o 720p, Shorts y audio MP3 desde cualquier enlace watch o youtu.be — gratis y sin app.",
  },
  ar: {
    tiktok:
      "فيديوهات تيك توك بدون علامة مائية بجودة MP4 HD والصوت الأصلي MP3 — حتى من روابط vt/vm القصيرة.",
    instagram:
      "ريلز وفيديوهات المنشورات وIGTV بجودة 1080p الأصلية — بدون علامة مائية وبدون تسجيل دخول.",
    facebook:
      "فيديوهات Watch الطويلة (أكثر من 1 غيغابايت) ورفعات الصفحات وروابط fb.watch تُفتح فورًا.",
    youtube:
      "MP4 بجودة 1080p أو 720p وShorts وصوت MP3 من أي رابط watch أو youtu.be — مجانًا وبدون تطبيق.",
  },
  de: {
    tiktok:
      "TikTok-Videos ohne Wasserzeichen als HD-MP4 und der Originalton als MP3 — auch aus vt-/vm-Kurzlinks.",
    instagram:
      "Reels, Video-Posts und IGTV in voller 1080p-Qualität — ohne Wasserzeichen, ohne Login.",
    facebook:
      "Lange Watch-Videos (über 1 GB), Seiten-Uploads und fb.watch-Links, die sofort aufgelöst werden.",
    youtube:
      "MP4 in 1080p oder 720p, Shorts und MP3-Audio aus jedem watch- oder youtu.be-Link — kostenlos, ohne App.",
  },
  pt: {
    tiktok:
      "Vídeos do TikTok sem marca d'água em MP4 HD e o áudio original em MP3 — inclusive links curtos vt/vm.",
    instagram:
      "Reels, vídeos de posts e IGTV na qualidade original 1080p — sem marca d'água e sem login.",
    facebook:
      "Vídeos longos do Watch (1 GB ou mais), uploads de páginas e links fb.watch resolvidos na hora.",
    youtube:
      "MP4 em 1080p ou 720p, Shorts e áudio MP3 de qualquer link watch ou youtu.be — grátis e sem app.",
  },
  id: {
    tiktok:
      "Video TikTok tanpa watermark dalam MP4 HD dan audio asli MP3 — termasuk tautan pendek vt/vm.",
    instagram:
      "Reels, video postingan, dan IGTV dengan kualitas asli 1080p — tanpa watermark, tanpa login.",
    facebook:
      "Video Watch panjang (1 GB lebih), unggahan halaman, dan tautan fb.watch yang langsung dibuka.",
    youtube:
      "MP4 1080p atau 720p, Shorts, dan audio MP3 dari tautan watch atau youtu.be — gratis, tanpa aplikasi.",
  },
  hi: {
    tiktok:
      "TikTok वीडियो बिना वॉटरमार्क HD MP4 में और ओरिजिनल साउंड MP3 में — vt/vm शॉर्ट लिंक से भी।",
    instagram:
      "Reels, पोस्ट वीडियो और IGTV असली 1080p क्वालिटी में — बिना वॉटरमार्क, बिना लॉगिन।",
    facebook:
      "लंबे Watch वीडियो (1 GB से ज़्यादा), पेज अपलोड और fb.watch लिंक तुरंत खुलते हैं।",
    youtube:
      "किसी भी watch या youtu.be लिंक से 1080p/720p MP4, Shorts और MP3 ऑडियो — मुफ़्त, बिना ऐप।",
  },
  vi: {
    tiktok:
      "Video TikTok không logo dạng MP4 HD và âm thanh gốc MP3 — kể cả link rút gọn vt/vm.",
    instagram:
      "Reels, video bài đăng và IGTV đúng chất lượng 1080p — không logo, không cần đăng nhập.",
    facebook:
      "Video Watch dài (trên 1 GB), video từ trang và link fb.watch được mở ngay.",
    youtube:
      "MP4 1080p hoặc 720p, Shorts và âm thanh MP3 từ mọi link watch hay youtu.be — miễn phí, không cần app.",
  },
  th: {
    tiktok:
      "วิดีโอ TikTok ไม่มีลายน้ำเป็น MP4 HD พร้อมเสียงต้นฉบับ MP3 รวมถึงลิงก์สั้น vt/vm",
    instagram:
      "Reels วิดีโอโพสต์ และ IGTV คุณภาพเดิม 1080p ไม่มีลายน้ำ ไม่ต้องล็อกอิน",
    facebook:
      "วิดีโอ Watch ยาว ๆ (เกิน 1 GB) วิดีโอจากเพจ และลิงก์ fb.watch ที่เปิดทันที",
    youtube:
      "MP4 1080p หรือ 720p, Shorts และเสียง MP3 จากลิงก์ watch หรือ youtu.be ฟรี ไม่ต้องติดตั้งแอป",
  },
  tl: {
    tiktok:
      "TikTok video na walang watermark sa MP4 HD at ang orihinal na tunog sa MP3 — pati na ang vt/vm short links.",
    instagram:
      "Reels, video ng post, at IGTV sa tunay na 1080p — walang watermark, walang login.",
    facebook:
      "Mahahabang Watch video (1 GB pataas), upload ng page, at fb.watch link na agad bumubukas.",
    youtube:
      "MP4 sa 1080p o 720p, Shorts, at MP3 audio mula sa anumang watch o youtu.be link — libre, walang app.",
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
};

/** The blurb for one tool, in the reader's language. */
export function platformBlurb(code: LocaleCode, platform: Platform): string {
  return PLATFORM_BLURBS[code][platform];
}

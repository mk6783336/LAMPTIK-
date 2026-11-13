import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Turkish landing page — Türkiye.
 *
 * Written in native Turkish for the query people actually type —
 * "tiktok filigransız video indir" rather than a word-for-word rendering of
 * "without watermark" — and kept in the second-person singular ("yapıştırın"
 * is the polite plural imperative, "indir" the plain one): Turkish tool sites
 * address the reader with the polite plural, so that is what the steps use,
 * while the headline stays imperative and short.
 *
 * Turkish is agglutinative: "videolarınızı" carries "your videos" in one word,
 * so sentences here are shorter than their English equivalents.
 */
export const tr: LandingCopy = {
  code: "tr",
  htmlLang: "tr",
  dir: "ltr",
  title: "TikTok Filigransız Video İndir — HD MP4 ve MP3",
  description:
    "TikTok, Instagram Reels, Facebook ve YouTube videolarını filigransız HD olarak indirin. MP4 ve MP3, uygulama yok, üyelik yok, tamamen ücretsiz.",
  keywords: [
    "tiktok filigransız video indir",
    "tiktok video indir hd",
    "tiktok mp3 indir",
    "instagram reels video indir",
    "facebook video indir",
    "youtube video mp4 indir",
  ],
  eyebrow: "Ücretsiz · Filigransız · Uygulamasız",
  h1Lead: "Videoları kaydedin.",
  h1Accent: "Filigransız, tam HD.",
  lede:
    "Bağlantıyı yapıştırın, kaliteyi seçin, indirin — TikTok, Instagram Reels, Facebook ve YouTube videoları saniyeler içinde telefonunuzda.",
  chips: ["MP4", "MP3 ses", "Üyelik yok"],
  tool: {
    heading: "Video bağlantısını yapıştırın",
    note: "Her tarayıcıda çalışır — iPhone ve Android dahil.",
  },
  facts: [
    ["Ücret", "Ücretsiz"],
    ["Üyelik", "Gerekmez"],
    ["Kalite", "MP4"],
    ["Ses", "MP3 ve M4A"],
  ],
  stepsHeading: "Üç adımda nasıl indirilir",
  steps: [
    {
      title: "Bağlantıyı kopyalayın",
      body: "Videoyu TikTok, Instagram, Facebook veya YouTube'da açın, Paylaş → Bağlantıyı kopyala yolunu izleyin. Tarayıcının adres çubuğundaki adres de olur; vt.tiktok.com ve fb.watch gibi kısa bağlantılar da desteklenir.",
    },
    {
      title: "Yukarıdaki alana yapıştırın",
      body: "Platform otomatik algılanır, seçim yapmanız gerekmez. Sunucu videonun orijinal akışını platformun CDN'inden ister — uygulamanın üzerine logo bastığı paylaşım kopyasını değil — ve size dosyayı sunmadan önce gerçekten video olduğunu doğrular.",
    },
    {
      title: "HD veya MP3 olarak kaydedin",
      body: "HD MP4, SD MP4 ya da MP3 düğmesine dokunun. Dosya yeniden kodlanmadan, özgün adıyla telefonunuzun İndirilenler klasörüne iner; iPhone'da Dosyalar uygulamasına kaydetmek için paylaş menüsünü kullanabilirsiniz.",
    },
  ],
  faqHeading: "Sık sorulan sorular",
  faqs: [
    {
      question: "İndirmek gerçekten ücretsiz mi?",
      answer:
        "Evet. HD, SD ve MP3 indirmelerinin tamamı ücretsiz ve sınırsız. Abonelik, üyelik ya da gizli ücret yok; site reklamlarla ayakta kalıyor.",
    },
    {
      question: "Videolar filigransız mı geliyor?",
      answer:
        "Evet. Platformun CDN'inden orijinal dosyayı alıyoruz, paylaşırken üzerine logo basılan kopyayı değil. TikTok'ta bu, wmplay yerine play akışı anlamına gelir; görüntü kırpılmaz ve yeniden kodlanmaz.",
    },
    {
      question: "Uygulama olmadan iPhone ve Android'de çalışır mı?",
      answer:
        "Evet. Site Safari, Chrome ve Firefox içinde çalışır. iPhone'da indirdikten sonra Paylaş → Dosyalara Kaydet diyebilirsiniz; Android'de dosya doğrudan İndirilenler klasörüne düşer.",
    },
    {
      question: "Bağlantılarım veya videolarım saklanıyor mu?",
      answer:
        "Hayır. Bağlantılar yalnızca çözümleme sırasında işlenir ve birkaç dakika içinde önbellekten silinir. Sunucuda hesap, indirme geçmişi ya da dosya kopyası tutulmaz.",
    },
  ],
  cta: {
    heading: "İlk videonuzu indirmeye hazır mısınız?",
    body: "Bağlantıyı yapıştırın, videoyu saniyeler içinde kaydedin — filigransız ve uygulamasız.",
    button: "İndiriciyi aç",
  },
  otherToolsHeading: "Diğer indiriciler",
  footerNote: "Bu sayfa Türkçe; indirme aracının arayüzü İngilizce kalır.",
};

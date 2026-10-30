import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Indonesian landing page — the largest single market in this niche.
 *
 * Third-party estimates put Indonesia at ~16% of the traffic for both Snaptik
 * and SSSTik, ahead of every other country. Those incumbents rank there mostly
 * with English pages, so an Indonesian page targets a query cluster
 * («unduh video tiktok tanpa watermark») that the giants answer only by
 * accident. That is the whole reason this locale exists: not "translate the
 * site", but "own the language the biggest audience actually searches in".
 *
 * Written as natural Indonesian rather than word-for-word translation. Both
 * "unduh" and "download" are used here because Indonesian speakers type both —
 * the copy prefers "unduh" and keeps "download" in the keyword list. Brand
 * names stay in Latin script, which is how they are typed locally.
 */
export const id: LandingCopy = {
  code: "id",
  htmlLang: "id",
  dir: "ltr",
  title: "Unduh Video TikTok Tanpa Watermark HD 1080p",
  description:
    "Unduh video TikTok, Instagram Reels, Facebook, dan YouTube tanpa watermark dalam kualitas HD 1080p. Gratis, tanpa aplikasi, tanpa mendaftar.",
  keywords: [
    "unduh video tiktok tanpa watermark",
    "download video tiktok tanpa watermark",
    "cara download video tiktok",
    "simpan video tiktok hd",
    "tiktok ke mp3",
    "download reels instagram",
    "unduh video facebook",
    "download video youtube",
    "downloader tiktok tanpa logo",
  ],
  eyebrow: "Gratis · Tanpa aplikasi · Tanpa watermark",
  h1Lead: "Unduh video apa saja.",
  h1Accent: "Kualitas HD penuh.",
  lede:
    "Tempel tautan dan simpan berkas aslinya dalam hitungan detik — tanpa watermark, tanpa akun, langsung dari browser ponsel Android atau iPhone. Tidak ada aplikasi yang perlu dipasang dan tidak ada iklan yang menghalangi tombol unduh.",
  chips: ["HD 1080p", "Tanpa watermark", "Suara MP3"],
  tool: {
    heading: "Alat unduh",
    note: "Tempel tautan TikTok, Instagram, Facebook, atau YouTube di atas.",
  },
  facts: [
    ["Harga", "Gratis sepenuhnya"],
    ["Akun", "Tidak diperlukan"],
    ["Kualitas", "1080p HD"],
    ["Platform", "TikTok, Instagram, Facebook"],
  ],
  stepsHeading: "Cara mengunduh dalam tiga langkah",
  steps: [
    {
      title: "Salin tautan videonya",
      body: "Di aplikasi TikTok, Instagram, Facebook, atau YouTube, ketuk Bagikan lalu Salin tautan. Tautan pendek seperti vt.tiktok.com, vm.tiktok.com, dan fb.watch juga bisa langsung ditempel — tidak perlu membukanya di browser dulu.",
    },
    {
      title: "Tempel tautan di alat ini",
      body: "Situs mendeteksi platformnya otomatis, mengikuti pengalihan tautan pendek, lalu meminta versi sumber asli dari server platform — bukan versi bagikan yang sudah ditempeli logo. Berkasnya diperiksa dulu untuk memastikan itu benar-benar video sebelum tombol unduh muncul.",
    },
    {
      title: "Pilih kualitas, lalu simpan",
      body: "Ketuk Unduh MP4 HD, MP4 SD, atau MP3. Berkas tersimpan dengan nama aslinya di folder Unduhan, jadi galeri tetap rapi dan mudah dicari lagi nanti. Di iPhone, berkasnya masuk ke aplikasi Files dan bisa dipindahkan ke Photos lewat menu Bagikan.",
    },
  ],
  faqHeading: "Pertanyaan yang sering diajukan",
  faqs: [
    {
      question: "Apakah benar-benar gratis?",
      answer:
        "Ya, semua unduhan gratis dan tanpa batas — HD maupun MP3 — tanpa langganan, tanpa kartu bank, dan tanpa batas jumlah. Situs ini dibiayai iklan, bukan langganan, jadi tidak ada tagihan yang muncul di kemudian hari.",
    },
    {
      question: "Apakah saya harus memasang aplikasi?",
      answer:
        "Tidak. Alat ini berjalan langsung di browser Android, iPhone, dan komputer. Tidak ada aplikasi yang harus dipasang, tidak ada profil yang harus dipercaya, dan tidak ada akun yang harus dibuat — cukup satu kolom tempel.",
    },
    {
      question: "Kenapa videonya bisa tanpa watermark?",
      answer:
        "Kami meminta versi sumber yang bersih langsung dari server platform, bukan versi yang sudah ditempeli logo oleh aplikasi. Karena itu gambarnya tidak perlu dipotong atau dikaburkan, dan videonya tetap utuh sampai ke tepi bingkai.",
    },
    {
      question: "Apakah tautan dan video saya disimpan di server kalian?",
      answer:
        "Tidak. Kami tidak menyimpan berkas maupun riwayat tautan. Unduhan berjalan dari server platform langsung ke perangkat Anda, dan satu-satunya salinan ada di penyimpanan ponsel atau komputer Anda sendiri.",
    },
    {
      question: "Bisa mengunduh video dari akun privat atau konten berbayar?",
      answer:
        "Tidak. Hanya video publik yang bisa diunduh. Video akun privat, konten berbayar, dan siaran langsung tidak dapat diambil — itu batasan dari platformnya, bukan kekurangan alat ini. Menghormati batas itu juga yang membuat situs ini tetap bisa dipakai.",
    },
    {
      question: "Bagaimana kalau saya hanya butuh suaranya?",
      answer:
        "Pilih opsi MP3. Jika yang tersedia hanya M4A, berkas itu tetap audio asli dari platformnya, jadi kualitasnya justru lebih baik daripada hasil konversi ulang. Cocok untuk musik latar, sound yang sedang tren, atau merekam suara asli sebelum videonya dihapus.",
    },
  ],
  cta: {
    heading: "Mulai unduh sekarang",
    body: "Tempel tautan pertama dan simpan salinan bersih berkualitas tinggi — tanpa mendaftar dan tanpa menunggu.",
    button: "Kembali ke alat",
  },
  otherToolsHeading: "Alat lain dalam bahasa Inggris",
  footerNote: "Halaman ini berbahasa Indonesia; alat per platform tersedia dalam bahasa Inggris.",
};

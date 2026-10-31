import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Indonesian platform landings.
 *
 * Indonesia is the largest market in this category, and the incumbents answer
 * it mostly with English pages. "Unduh" is the term Indonesian users search
 * for; "download" appears alongside it in keywords because both are typed.
 */
export const id: Record<"instagram" | "youtube" | "facebook", LandingCopy> = {
  instagram: {
    code: "id",
    htmlLang: "id",
    dir: "ltr",
    title: "Unduh Reels Instagram HD — Tanpa Watermark",
    description:
      "Unduh Reels Instagram kualitas asli 1080p lengkap dengan audio, tanpa watermark dan tanpa login. Gratis lewat browser di HP maupun komputer.",
    keywords: [
      "unduh reels instagram",
      "download video instagram",
      "simpan reels ke galeri",
      "reels tanpa watermark",
      "unduh reels hd",
      "cara download reels instagram",
    ],
    eyebrow: "Instagram Reels · gratis · tanpa akun",
    h1Lead: "Unduh Reels Instagram",
    h1Accent: "HD tanpa watermark.",
    lede:
      "Tempel tautan Reel dan simpan MP4 yang dikirim Instagram sendiri, lengkap dengan audionya. Mendukung tautan /reel/, /reels/, /p/, /tv/, dan instagr.am, tanpa akun dan tanpa aplikasi.",
    chips: ["Kualitas asli", "Audio ikut tersimpan", "Tanpa login"],
    tool: {
      heading: "Tempel tautan Reel",
      note: "Instagram dikenali otomatis — TikTok, Facebook, dan YouTube juga bisa.",
    },
    facts: [
      ["Harga", "Gratis"],
      ["Akun", "Tidak perlu"],
      ["Kualitas", "1080 × 1920"],
      ["Format", "MP4 dengan audio"],
    ],
    stepsHeading: "Cara mengunduh Reel dalam tiga langkah",
    steps: [
      {
        title: "Salin tautan Reel",
        body: "Di Reel, ketuk tiga titik lalu pilih Salin tautan. Alamat di address bar browser juga bisa dipakai. Jangan pakai tombol simpan milik aplikasi: salinan itu membawa watermark dan tampilan antarmuka.",
      },
      {
        title: "Tempel di kolom di atas",
        body: "Server membuka postingan publik, memeriksa versi video yang tersedia, lalu mengambil MP4 progresif dengan bitrate tertinggi — gambar dan suara sudah menyatu di satu berkas.",
      },
      {
        title: "Simpan MP4",
        body: "Ketuk Unduh HD MP4. Di Android berkas masuk ke folder Download; di iPhone tersimpan di Files, lalu dipindah ke Photos lewat Bagikan → Simpan Video. Resolusinya tetap seperti aslinya.",
      },
    ],
    faqHeading: "Pertanyaan umum",
    faqs: [
      {
        question: "Apakah hasilnya masih ada watermark?",
        answer:
          "Tidak. Yang diminta adalah berkas yang Instagram kirim ke pemutarnya sendiri, bukan salinan dari menu bagikan. Karena aslinya tidak punya lapisan apa pun, tidak ada yang perlu dipotong atau ditutup.",
      },
      {
        question: "Perlu akun Instagram?",
        answer:
          "Tidak. Postingan publik diproses tanpa sesi: tanpa nama pengguna, kata sandi, atau cookie. Akun privat memang tidak bisa diunduh, dan situs yang mengaku bisa memakai sesi orang lain.",
      },
      {
        question: "Bagaimana kalau unduhan gagal?",
        answer:
          "Pastikan dulu video bisa diputar di Instagram tanpa login. Kalau di sana bisa tapi di sini gagal, tunggu satu menit lalu coba lagi — Instagram membatasi permintaan anonim saat trafik tinggi. Postingan yang dihapus atau privat tidak punya berkas publik.",
      },
      {
        question: "Apakah foto dan carousel didukung?",
        answer:
          "Video di dalam carousel diunduh sebagai MP4. Postingan yang hanya berisi foto tidak punya video, dan halaman ini menjelaskannya alih-alih memberi berkas kosong.",
      },
    ],
    cta: {
      heading: "Simpan Reel berikutnya dalam kualitas asli",
      body: "Tanpa akun, tanpa aplikasi, dan tanpa watermark — hanya berkas dari pembuatnya.",
      button: "Buka pengunduh",
    },
    otherToolsHeading: "Alat lain per platform",
    footerNote: "Halaman ini berbahasa Indonesia dan bekerja sama di semua negara.",
  },

  youtube: {
    code: "id",
    htmlLang: "id",
    dir: "ltr",
    title: "Unduh Video YouTube MP4 HD atau MP3",
    description:
      "Tempel tautan YouTube lalu unduh videonya sebagai MP4 hingga 1080p atau ambil audionya saja sebagai MP3. Mendukung watch, Shorts, youtu.be, dan playlist.",
    keywords: [
      "unduh video youtube",
      "download video youtube",
      "youtube ke mp3",
      "unduh lagu dari youtube",
      "unduh youtube hd",
      "download shorts youtube",
    ],
    eyebrow: "YouTube · MP4 dan MP3 · tanpa instal",
    h1Lead: "Unduh video YouTube",
    h1Accent: "MP4 HD atau audionya saja.",
    lede:
      "Tempel tautan dan pilih kualitas yang benar-benar tersedia: 1080p bila ada, 720p bila tidak, atau MP3 dari audio aslinya. Semua lewat browser, tanpa aplikasi.",
    chips: ["MP4 1080p", "MP3 asli", "Shorts dan youtu.be"],
    tool: {
      heading: "Tempel tautan video",
      note: "YouTube dikenali otomatis — TikTok, Instagram, dan Facebook juga bisa.",
    },
    facts: [
      ["Harga", "Gratis"],
      ["Akun", "Tidak perlu"],
      ["Kualitas", "1080p / 720p"],
      ["Format", "MP4 dan MP3"],
    ],
    stepsHeading: "Cara mengunduh video YouTube dalam tiga langkah",
    steps: [
      {
        title: "Salin tautan video",
        body: "Di aplikasi ketuk Bagikan → Salin tautan; di komputer salin alamat dari address bar. Tautan youtu.be, Shorts, dan tautan dengan parameter playlist diterima apa adanya.",
      },
      {
        title: "Periksa kualitas sebenarnya",
        body: "Server menanyakan versi yang tersedia dan menampilkan yang memang ada. Kami tidak mengarang 4K yang tidak ada atau memperbesar 720p lalu menyebutnya HD.",
      },
      {
        title: "Pilih MP4 atau MP3",
        body: "Unduh video lengkap dengan gambar dan suara, atau ambil hanya trek audionya sebagai MP3. Berkas disimpan dengan judul video, bukan nama generik.",
      },
    ],
    faqHeading: "Pertanyaan umum",
    faqs: [
      {
        question: "Bisa 1080p?",
        answer:
          "Bisa, selama YouTube menyediakan resolusi itu untuk video tersebut. Halaman ini menampilkan pilihan yang ada sebelum mengunduh, jadi hasilnya tidak lebih kecil dari yang diharapkan.",
      },
      {
        question: "Bagaimana mengubahnya jadi MP3?",
        answer:
          "Tempel tautan lalu pilih opsi audio. Trek yang diterbitkan YouTube dikonversi sekali ke MP3; pemutar tidak direkam dan suara tidak disusun ulang. Kualitasnya mengikuti aslinya.",
      },
      {
        question: "Shorts dan youtu.be bisa?",
        answer:
          "Keduanya bisa. Shorts diproses seperti video vertikal biasa, dan tautan pendek youtu.be diperluas di server.",
      },
      {
        question: "Bisakah seluruh playlist?",
        answer:
          "Playlist adalah daftar, bukan berkas. Halaman ini membuka daftarnya dan Anda mengunduh satu per satu dengan pengunduh yang sama; ratusan sekaligus adalah cara tercepat untuk dibatasi.",
      },
    ],
    cta: {
      heading: "Simpan videonya atau audionya saja",
      body: "Pilih kualitas yang benar-benar ada, tanpa memasang apa pun.",
      button: "Buka pengunduh",
    },
    otherToolsHeading: "Alat lain per platform",
    footerNote: "Unduh hanya milik Anda atau yang sudah diizinkan; hak cipta tetap milik pembuatnya.",
  },

  facebook: {
    code: "id",
    htmlLang: "id",
    dir: "ltr",
    title: "Unduh Video Facebook HD — Tanpa Aplikasi",
    description:
      "Unduh video Facebook kualitas HD lewat browser: postingan halaman, Watch, Reels, dan tautan fb.watch. Tanpa instal, tanpa akun, dan tanpa watermark.",
    keywords: [
      "unduh video facebook",
      "download video facebook",
      "simpan video facebook",
      "unduh reels facebook",
      "fb.watch download",
      "video facebook tanpa aplikasi",
    ],
    eyebrow: "Facebook · HD · tanpa instal",
    h1Lead: "Unduh video Facebook",
    h1Accent: "HD, tanpa aplikasi.",
    lede:
      "Tempel tautan dan simpan MP4 beserta audionya. Postingan halaman, video Watch, Reels, dan tautan pendek fb.watch semuanya didukung; tautan pendek diperluas di server sebelum berkas dicari.",
    chips: ["HD lebih dulu", "fb.watch didukung", "Video panjang"],
    tool: {
      heading: "Tempel tautan video",
      note: "Facebook dikenali otomatis — TikTok, Instagram, dan YouTube juga bisa.",
    },
    facts: [
      ["Harga", "Gratis"],
      ["Akun", "Tidak perlu"],
      ["Kualitas", "HD atau SD nyata"],
      ["Batas", "Tanpa batas ukuran"],
    ],
    stepsHeading: "Cara mengunduh video Facebook dalam tiga langkah",
    steps: [
      {
        title: "Salin tautan video",
        body: "Ketuk Bagikan di bawah video lalu pilih Salin tautan. URL postingan, /watch/, /reel/, dan bentuk pendek fb.watch/ diterima. Video privat dan grup tertutup tidak punya berkas publik.",
      },
      {
        title: "Biarkan server mengikuti pengalihan",
        body: "fb.watch tidak memuat ID video; itu penyingkat yang melompat ke postingan asli. Server mengikuti seluruh rangkaian pengalihan sampai URL kanonis, baru kemudian memeriksa gambar dan suara.",
      },
      {
        title: "Pilih HD lalu simpan",
        body: "Kalau Facebook menyediakan versi HD, itu yang dikirim; kalau tidak, SD terbaik, dan panel hasil menyebutkan mana yang diterima. Video Watch yang panjang dialirkan tanpa buffer di server, jadi berkas 1 GB pun terunduh seperti klip pendek.",
      },
    ],
    faqHeading: "Pertanyaan umum",
    faqs: [
      {
        question: "Harus memasang aplikasi atau ekstensi?",
        answer:
          "Tidak. Semuanya berjalan di browser, di iPhone, Android, Windows, atau Mac: tanpa APK, tanpa ekstensi, tanpa izin. Inilah bedanya dengan situs yang meminta pemasangan sebelum menampilkan berkas.",
      },
      {
        question: "Tautan fb.watch berfungsi?",
        answer:
          "Ya. Itu penyingkat, bukan alamat video, jadi rangkaian pengalihan diikuti di server sampai postingan asli ditemukan. Karena itu tautan yang disebut tidak valid oleh alat lain tetap bekerja di sini.",
      },
      {
        question: "Kenapa kadang turun sebagai SD?",
        answer:
          "Karena Facebook tidak menerbitkan versi HD untuk video itu. Kami meminta HD lebih dulu lalu memakai SD terbaik, dan panel menyebutkan apa yang dikirim alih-alih menyebut 360p sebagai HD.",
      },
      {
        question: "Bisa video privat atau grup?",
        answer:
          "Tidak. Video itu butuh sesi dengan izin menonton, dan alat ini tidak pernah meminta kredensial Facebook. Yang bisa adalah postingan halaman publik, Watch publik, dan Reels publik.",
      },
    ],
    cta: {
      heading: "Simpan videonya sebelum hilang",
      body: "Tanpa akun, tanpa instal, dan tanpa batas ukuran.",
      button: "Buka pengunduh",
    },
    otherToolsHeading: "Alat lain per platform",
    footerNote: "Video privat dan grup tertutup sengaja tidak didukung: tidak ada berkas publik untuk diunduh.",
  },
};

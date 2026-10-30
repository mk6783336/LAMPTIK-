import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Tagalog (Filipino) landing page — the Philippines.
 *
 * The Philippines is consistently a top-five country for this category. The
 * copy is written the way Filipinos actually write about this task — Tagalog
 * sentence structure with the English loanwords everyone uses ("i-download",
 * "link", "watermark") — rather than purist Tagalog, which would read as
 * stilted and would not match the query. `code` and `htmlLang` are both `tl`
 * so the hreflang cluster stays self-consistent.
 */
export const tl: LandingCopy = {
  code: "tl",
  htmlLang: "tl",
  dir: "ltr",
  title: "I-download ang TikTok Video na Walang Watermark HD",
  description:
    "I-download ang video mula sa TikTok, Instagram Reels, Facebook at YouTube nang walang watermark sa HD 1080p. Libre, walang app, walang sign-up.",
  keywords: [
    "paano mag download ng video sa tiktok",
    "tiktok video download without watermark",
    "i-download ang video sa tiktok",
    "tiktok video walang watermark",
    "tiktok to mp3",
    "download reels instagram",
    "download video facebook",
    "download youtube video hd",
  ],
  eyebrow: "Libre · Walang app · Walang watermark",
  h1Lead: "I-download ang kahit anong video.",
  h1Accent: "Buong HD na kalidad.",
  lede:
    "I-paste ang link at i-save ang orihinal na file sa ilang segundo — walang watermark, walang account, direkta sa browser ng Android o iPhone. Walang app na i-install at walang sign-up.",
  chips: ["HD 1080p", "Walang watermark", "MP3 na audio"],
  tool: {
    heading: "Download tool",
    note: "I-paste ang link ng TikTok, Instagram, Facebook o YouTube sa itaas.",
  },
  facts: [
    ["Presyo", "Libreng-libre"],
    ["Account", "Hindi kailangan"],
    ["Kalidad", "1080p HD"],
    ["Platform", "TikTok, Instagram, Facebook"],
  ],
  stepsHeading: "Tatlong hakbang lang",
  steps: [
    {
      title: "Kopyahin ang link ng video",
      body: "Buksan ang video sa TikTok, Instagram, Facebook o YouTube, i-tap ang Share at piliin ang Copy link. Gumagana rin agad ang maiikling link tulad ng vt.tiktok.com, vm.tiktok.com at fb.watch — hindi na kailangang buksan muna sa browser.",
    },
    {
      title: "I-paste ang link dito",
      body: "Awtomatikong nakikilala ng site ang platform, sinusundan ang redirect ng maiikling link, at hinihingi ang orihinal na source file mula sa server ng platform — hindi ang version na may logo ng app. Sinusuri muna ang file kung tunay na video bago lumabas ang download button.",
    },
    {
      title: "Piliin ang kalidad at i-save",
      body: "I-tap ang Download MP4 HD, MP4 SD o MP3. Naka-save ang file sa Downloads folder gamit ang orihinal na pangalan, kaya malinis ang gallery at madaling hanapin mamaya. Sa iPhone, napupunta ang file sa Files app at maililipat sa Photos gamit ang Share → Save Video.",
    },
  ],
  faqHeading: "Mga madalas itanong",
  faqs: [
    {
      question: "Libre ba talaga ito?",
      answer:
        "Oo, libre at walang limitasyon ang lahat ng download — HD man o MP3 — walang subscription, walang card, walang daily limit. Naka-base sa ads ang site, hindi sa subscription, kaya walang billing na darating mamaya.",
    },
    {
      question: "Kailangan ko bang mag-install ng app?",
      answer:
        "Hindi. Gumagana ang tool direkta sa browser ng Android, iPhone at computer. Walang app, walang profile, walang account — isang paste box lang, kaya tuloy pa rin itong gumagana pagkatapos ng iOS o Android update.",
    },
    {
      question: "Bakit walang watermark ang video?",
      answer:
        "Hinihingi namin sa server ng platform ang malinis na source version, hindi ang version na may logo mula sa app. Kaya hindi kailangang i-crop o i-blur ang larawan at buo ang video hanggang sa gilid ng frame.",
    },
    {
      question: "Naka-save ba sa server ninyo ang link at video ko?",
      answer:
        "Hindi. Wala kaming tinatago na file o history ng link. Direkta mula sa server ng platform papunta sa device mo ang download, at ang kopya lang ay nasa phone o computer mo.",
    },
    {
      question: "Puwede bang i-download ang private o bayad na video?",
      answer:
        "Hindi. Pampublikong video lang. Hindi kayang i-download ang video ng private account, bayad na content at livestream — limitasyon ito ng platform, hindi kakulangan ng tool. Ang pagrespeto sa limitasyong ito ang nagpapanatili sa site na gumagana.",
    },
    {
      question: "Paano kung audio lang ang kailangan ko?",
      answer:
        "Piliin ang MP3. Kung M4A lang ang available, orihinal pa rin iyon mula sa platform, kaya mas mataas ang kalidad kaysa i-convert muli. Ito ang pinakamabilis na paraan para i-save ang trending na tunog bago pa ito ma-delete.",
    },
  ],
  cta: {
    heading: "Simulan ang pag-download",
    body: "I-paste ang unang link at i-save ang malinis na kopya sa mataas na kalidad — walang sign-up, walang paghihintay.",
    button: "Bumalik sa tool",
  },
  otherToolsHeading: "Iba pang tool sa English",
  footerNote: "Tagalog ang page na ito; ang mga tool per platform ay nasa English.",
};

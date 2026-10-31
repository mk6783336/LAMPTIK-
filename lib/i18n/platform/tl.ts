import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Tagalog platform landings.
 *
 * Filipino search queries mix Tagalog and English freely — "i-download ang
 * video sa facebook" sits next to "download facebook video". The copy uses the
 * natural code-mixed register rather than formal Tagalog, because that is what
 * the searcher actually types.
 */
export const tl: Record<"instagram" | "youtube" | "facebook", LandingCopy> = {
  instagram: {
    code: "tl",
    htmlLang: "tl",
    dir: "ltr",
    title: "I-download ang Reels sa Instagram — HD, Walang Watermark",
    description:
      "I-download ang Instagram Reels sa orihinal na 1080p kasama ang audio, walang watermark at walang login. Libre sa browser, gamit ang phone o computer.",
    keywords: [
      "download instagram reels",
      "paano i-download ang reels",
      "download reels walang watermark",
      "save video sa instagram",
      "download instagram video hd",
      "i-download ang reel sa phone",
    ],
    eyebrow: "Instagram Reels · libre · walang account",
    h1Lead: "I-download ang Instagram Reels",
    h1Accent: "HD, walang watermark.",
    lede:
      "I-paste ang link ng Reel at i-save ang mismong MP4 na ipinapadala ng Instagram sa player nito — kasama ang audio, walang account at walang app. Gumagana ang /reel/, /reels/, /p/, /tv/ at instagr.am na link.",
    chips: ["Orihinal na quality", "Kasama ang audio", "Walang login"],
    tool: {
      heading: "I-paste ang link ng Reel",
      note: "Awtomatikong nakikilala ang Instagram — gumagana rin ang TikTok, Facebook at YouTube.",
    },
    facts: [
      ["Presyo", "Libre"],
      ["Account", "Hindi kailangan"],
      ["Resolution", "1080 × 1920"],
      ["Format", "MP4 na may audio"],
    ],
    stepsHeading: "Paano i-download ang Reel sa tatlong hakbang",
    steps: [
      {
        title: "Kopyahin ang link ng Reel",
        body: "Sa Reel, i-tap ang tatlong tuldok at piliin ang Kopyahin ang link. Puwede rin ang address sa browser. Huwag gamitin ang save button ng app: may watermark at nakabahid ang interface ng app sa kopyang iyon.",
      },
      {
        title: "I-paste sa kahon sa itaas",
        body: "Binubuksan ng server ang pampublikong post, tinitingnan ang mga available na bersyon ng video, at kinukuha ang MP4 na progressive na may pinakamataas na bitrate — nakapaloob na ang larawan at tunog sa isang file.",
      },
      {
        title: "I-save ang MP4",
        body: "I-tap ang I-download ang MP4 HD. Sa Android napupunta ang file sa Download folder; sa iPhone sa Files, tapos Share → Save Video para mapunta sa Photos. Hindi nagbabago ang resolution mula sa orihinal.",
      },
    ],
    faqHeading: "Madalas itanong",
    faqs: [
      {
        question: "May watermark pa ba ang file?",
        answer:
          "Wala. Ang kinukuha ay ang file na ipinapadala ng Instagram sa sarili nitong player, hindi ang kopyang galing sa share menu. Walang nakapatong na layer sa orihinal, kaya wala ring dapat putulin o takpan.",
      },
      {
        question: "Kailangan ba ng Instagram account?",
        answer:
          "Hindi. Pinoproseso ang pampublikong post nang walang session: walang username, password o cookie. Hindi kayang i-download ang private account, at ang mga site na nagsasabing kaya ay gumagamit ng session ng iba.",
      },
      {
        question: "Paano kung mabigo ang download?",
        answer:
          "Tingnan muna kung nagpe-play ang video sa Instagram nang walang login. Kung doon gumagana pero dito hindi, maghintay ng isang minuto at subukan muli — nililimitahan ng Instagram ang anonymous na request kapag mataas ang traffic. Walang pampublikong file ang deleted o private na post.",
      },
      {
        question: "Kasama ba ang photo at carousel?",
        answer:
          "Ang video sa loob ng carousel ay nagiging MP4. Walang video ang photo-only na post, at sinasabi ito ng page sa halip na magbigay ng walang laman na file.",
      },
    ],
    cta: {
      heading: "I-save ang susunod na Reel sa orihinal na quality",
      body: "Walang account, walang app at walang watermark — file mismo ng creator.",
      button: "Buksan ang downloader",
    },
    otherToolsHeading: "Mga tool para sa ibang platform",
    footerNote: "Nasa Tagalog ang page na ito at pareho ang ginagawa sa lahat ng bansa.",
  },

  youtube: {
    code: "tl",
    htmlLang: "tl",
    dir: "ltr",
    title: "I-download ang YouTube Video — MP4 HD o MP3",
    description:
      "I-paste ang YouTube link at i-download ang video bilang MP4 hanggang 1080p, o ang audio lang bilang MP3. Gumagana ang watch, Shorts, youtu.be at playlist link.",
    keywords: [
      "download youtube video",
      "paano mag download ng video sa youtube",
      "youtube to mp3",
      "download youtube hd",
      "download youtube shorts",
      "save youtube video sa phone",
    ],
    eyebrow: "YouTube · MP4 at MP3 · walang i-install",
    h1Lead: "I-download ang YouTube video",
    h1Accent: "MP4 HD o audio lang.",
    lede:
      "I-paste ang link at piliin ang quality na talagang available — 1080p kung meron, 720p kung wala, o MP3 mula sa orihinal na audio track. Lahat sa browser, walang app.",
    chips: ["MP4 1080p", "Tunay na MP3", "Shorts at youtu.be"],
    tool: {
      heading: "I-paste ang link ng video",
      note: "Awtomatikong nakikilala ang YouTube — gumagana rin ang TikTok, Instagram at Facebook.",
    },
    facts: [
      ["Presyo", "Libre"],
      ["Account", "Hindi kailangan"],
      ["Quality", "1080p / 720p"],
      ["Format", "MP4 at MP3"],
    ],
    stepsHeading: "Paano i-download ang YouTube video sa tatlong hakbang",
    steps: [
      {
        title: "Kopyahin ang link ng video",
        body: "Sa app, i-tap ang Share → Kopyahin ang link; sa computer, kopyahin ang address sa browser. Tanggap nang buo ang youtu.be, Shorts at mahabang link na may playlist parameter.",
      },
      {
        title: "Tingnan ang totoong quality",
        body: "Tinatanong ng server kung anong bersyon ang available at ipinapakita lang ang meron. Hindi kami gumagawa ng 4K na wala, at hindi namin pinalalaki ang 720p para tawaging HD.",
      },
      {
        title: "Pumili ng MP4 o MP3",
        body: "Kunin ang buong video na may larawan at tunog, o ang audio track lang bilang MP3. Nakapangalan ang file sa video mismo, hindi sa generic na pangalan.",
      },
    ],
    faqHeading: "Madalas itanong",
    faqs: [
      {
        question: "May 1080p ba?",
        answer:
          "Meron, kung ibinibigay ng YouTube ang resolution na iyon para sa video. Nakikita ang mga pagpipilian bago mag-download, kaya hindi mas maliit ang resulta kaysa sa inaasahan.",
      },
      {
        question: "Paano gawing MP3?",
        answer:
          "I-paste ang link at piliin ang audio option. Ang track na inilalabas ng YouTube ay kinokonvert nang isang beses sa MP3; hindi nire-record ang player at hindi ginagawang muli ang tunog. Sumusunod ang quality sa orihinal.",
      },
      {
        question: "Gumagana ba ang Shorts at youtu.be?",
        answer:
          "Pareho. Ang Shorts ay pinoproseso tulad ng normal na vertical video, at ang maikling youtu.be link ay pinalalawak sa server.",
      },
      {
        question: "Puwede ba ang buong playlist?",
        answer:
          "Ang playlist ay listahan, hindi file. Binubuksan ng page ang listahan at isa-isa mong i-download gamit ang parehong tool; ang humingi ng daan-daang sabay ay pinakamabilis na paraan para ma-limitahan.",
      },
    ],
    cta: {
      heading: "I-save ang video o ang audio lang",
      body: "Piliin ang quality na meron, walang kailangang i-install.",
      button: "Buksan ang downloader",
    },
    otherToolsHeading: "Mga tool para sa ibang platform",
    footerNote: "I-download lang ang sarili mong content o ang may pahintulot; sa creator pa rin ang copyright.",
  },

  facebook: {
    code: "tl",
    htmlLang: "tl",
    dir: "ltr",
    title: "I-download ang Facebook Video — HD, Walang App",
    description:
      "I-download ang Facebook video sa HD sa browser: page post, Watch, Reels at fb.watch link. Walang i-install, walang account at walang watermark.",
    keywords: [
      "download facebook video",
      "paano i-download ang video sa facebook",
      "facebook video download hd",
      "download fb watch video",
      "download facebook reels",
      "save facebook video sa phone",
    ],
    eyebrow: "Facebook · HD · walang i-install",
    h1Lead: "I-download ang Facebook video",
    h1Accent: "HD, walang app.",
    lede:
      "I-paste ang link at i-save ang MP4 kasama ang audio. Gumagana ang page post, Watch video, Reels at maikling fb.watch link; ang maikling link ay pinalalawak sa server bago hanapin ang file.",
    chips: ["HD muna", "Suportado ang fb.watch", "Mahahabang video"],
    tool: {
      heading: "I-paste ang link ng video",
      note: "Awtomatikong nakikilala ang Facebook — gumagana rin ang TikTok, Instagram at YouTube.",
    },
    facts: [
      ["Presyo", "Libre"],
      ["Account", "Hindi kailangan"],
      ["Quality", "HD o tunay na SD"],
      ["Limitasyon", "Walang size limit"],
    ],
    stepsHeading: "Paano i-download ang Facebook video sa tatlong hakbang",
    steps: [
      {
        title: "Kopyahin ang link ng video",
        body: "I-tap ang Share sa ilalim ng video at piliin ang Kopyahin ang link. Tanggap ang URL ng post, /watch/, /reel/ at ang maikling fb.watch/. Walang pampublikong file ang private video at closed group.",
      },
      {
        title: "Hayaang sundan ng server ang redirect",
        body: "Walang video ID ang fb.watch; shortcut ito na tumatalon sa totoong post. Sinusundan ng server ang buong redirect chain hanggang sa canonical URL, saka pa lang tinitingnan ang larawan at tunog.",
      },
      {
        title: "Piliin ang HD at i-save",
        body: "Kung may HD na bersyon ang Facebook, iyon ang ipinapadala; kung wala, ang pinakamagandang SD, at sinasabi ng result panel kung alin ang nakuha. Ang mahahabang Watch video ay streaming nang walang buffer sa server, kaya ang 1 GB na file ay parang maikling clip lang.",
      },
    ],
    faqHeading: "Madalas itanong",
    faqs: [
      {
        question: "Kailangan bang mag-install ng app o extension?",
        answer:
          "Hindi. Gumagana lahat sa browser, sa iPhone, Android, Windows o Mac: walang APK, walang extension, walang permission. Ito ang kaibahan sa mga site na nagpapainstall bago ibigay ang file.",
      },
      {
        question: "Gumagana ba ang fb.watch link?",
        answer:
          "Oo. Shortcut iyon, hindi address ng video, kaya sinusundan ang redirect chain sa server hanggang sa totoong post. Kaya gumagana dito ang mga link na sinasabing invalid ng ibang tool.",
      },
      {
        question: "Bakit SD lang minsan?",
        answer:
          "Dahil walang HD na bersyon ang inilabas ng Facebook para sa video na iyon. Hinihingi muna namin ang HD at ginagamit ang pinakamagandang SD, at sinasabi ng panel kung ano ang ipinadala sa halip na tawaging HD ang 360p.",
      },
      {
        question: "Puwede ba ang private o group video?",
        answer:
          "Hindi. Kailangan ng session na may permiso para manood, at hindi kailanman humihingi ng Facebook credentials ang tool na ito. Ang gumagana ay pampublikong page post, pampublikong Watch at pampublikong Reels.",
      },
    ],
    cta: {
      heading: "I-save ang video bago ito mawala",
      body: "Walang account, walang install at walang size limit.",
      button: "Buksan ang downloader",
    },
    otherToolsHeading: "Mga tool para sa ibang platform",
    footerNote: "Sadyang hindi sinusuportahan ang private video at closed group: walang pampublikong file na maida-download.",
  },
};

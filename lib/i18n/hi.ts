import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Hindi landing page — India.
 *
 * India is one of the largest downloader markets by volume, and the phone
 * behaviour is different from the Indonesian page: a very large share of
 * Indian users type Hinglish in Latin script ("tiktok video download kaise
 * kare") rather than Devanagari. The `keywords` array therefore carries both
 * scripts, while the visible copy stays in natural Devanagari Hindi so the
 * page also reads as a real Hindi page rather than a transliterated one.
 *
 * Written as plain conversational Hindi — "बिना वॉटरमार्क" is how the query is
 * actually phrased, not a literal translation of "watermark-free".
 */
export const hi: LandingCopy = {
  code: "hi",
  htmlLang: "hi",
  dir: "ltr",
  title: "TikTok वीडियो बिना वॉटरमार्क डाउनलोड करें HD",
  description:
    "TikTok, Instagram Reels, Facebook और YouTube के वीडियो बिना वॉटरमार्क HD 1080p में डाउनलोड करें। मुफ़्त, बिना ऐप, बिना साइन-अप।",
  keywords: [
    "tiktok video download kaise kare",
    "tiktok video without watermark download",
    "बिना वॉटरमार्क वीडियो डाउनलोड",
    "टिकटॉक वीडियो डाउनलोड",
    "instagram reels video download",
    "video se mp3 kaise banaye",
    "facebook video download hd",
    "youtube video download mp4",
  ],
  eyebrow: "मुफ़्त · बिना ऐप · बिना वॉटरमार्क",
  h1Lead: "कोई भी वीडियो डाउनलोड करें।",
  h1Accent: "पूरी HD क्वालिटी में।",
  lede:
    "लिंक पेस्ट करें और कुछ सेकंड में ओरिजिनल फ़ाइल सेव कर लें — बिना वॉटरमार्क, बिना अकाउंट, सीधे Android या iPhone के ब्राउज़र से। कोई ऐप इंस्टॉल नहीं करना, कोई साइन-अप नहीं।",
  chips: ["HD 1080p", "बिना वॉटरमार्क", "MP3 ऑडियो"],
  tool: {
    heading: "डाउनलोड टूल",
    note: "ऊपर TikTok, Instagram, Facebook या YouTube का लिंक पेस्ट करें।",
  },
  facts: [
    ["कीमत", "पूरी तरह मुफ़्त"],
    ["अकाउंट", "ज़रूरत नहीं"],
    ["क्वालिटी", "1080p HD"],
    ["प्लेटफ़ॉर्म", "TikTok, Instagram, Facebook"],
  ],
  stepsHeading: "तीन स्टेप में वीडियो डाउनलोड करें",
  steps: [
    {
      title: "वीडियो का लिंक कॉपी करें",
      body: "TikTok, Instagram, Facebook या YouTube ऐप में वीडियो खोलें, Share पर टैप करें और Copy link चुनें। vt.tiktok.com, vm.tiktok.com और fb.watch जैसे छोटे लिंक भी सीधे पेस्ट किए जा सकते हैं — पहले ब्राउज़र में खोलने की ज़रूरत नहीं।",
    },
    {
      title: "लिंक इस टूल में पेस्ट करें",
      body: "साइट खुद प्लेटफ़ॉर्म पहचान लेती है, छोटे लिंक का रीडायरेक्ट फ़ॉलो करती है और प्लेटफ़ॉर्म के सर्वर से ओरिजिनल सोर्स वर्ज़न माँगती है — वह वर्ज़न नहीं जिस पर ऐप ने लोगो लगा दिया है। डाउनलोड बटन दिखाने से पहले फ़ाइल जाँची जाती है कि वह सचमुच वीडियो है।",
    },
    {
      title: "क्वालिटी चुनें और सेव करें",
      body: "Download MP4 HD, MP4 SD या MP3 पर टैप करें। फ़ाइल अपने ओरिजिनल नाम के साथ Downloads फ़ोल्डर में सेव होती है, इसलिए गैलरी साफ़ रहती है और बाद में ढूँढना आसान होता है। iPhone पर फ़ाइल Files में जाती है और Share → Save Video से Photos में आ जाती है।",
    },
  ],
  faqHeading: "अक्सर पूछे जाने वाले सवाल",
  faqs: [
    {
      question: "क्या यह सच में मुफ़्त है?",
      answer:
        "हाँ, सभी डाउनलोड मुफ़्त और बिना सीमा के हैं — HD भी और MP3 भी — कोई सब्सक्रिप्शन नहीं, कोई कार्ड नहीं, कोई दैनिक सीमा नहीं। साइट विज्ञापनों से चलती है, सब्सक्रिप्शन से नहीं, इसलिए बाद में कोई बिल नहीं आता।",
    },
    {
      question: "क्या मुझे ऐप इंस्टॉल करना होगा?",
      answer:
        "नहीं। टूल सीधे Android, iPhone और कंप्यूटर के ब्राउज़र में चलता है — कोई ऐप नहीं, कोई प्रोफ़ाइल नहीं, कोई अकाउंट नहीं। बस एक इनपुट बॉक्स, इसलिए iOS या Android अपडेट के बाद भी यह चलता रहता है।",
    },
    {
      question: "वीडियो बिना वॉटरमार्क कैसे मिलता है?",
      answer:
        "हम प्लेटफ़ॉर्म के सर्वर से साफ़ सोर्स वर्ज़न माँगते हैं, उस वर्ज़न की जगह जिस पर ऐप अपना लोगो लगा देता है। इसलिए तस्वीर काटनी या धुँधली करनी नहीं पड़ती और वीडियो किनारे तक पूरा रहता है।",
    },
    {
      question: "क्या मेरे लिंक या वीडियो आपके सर्वर पर सेव होते हैं?",
      answer:
        "नहीं। हम न फ़ाइलें रखते हैं और न लिंक का इतिहास। डाउनलोड प्लेटफ़ॉर्म के सर्वर से सीधे आपके डिवाइस पर होता है, और उसकी एकमात्र कॉपी आपके फ़ोन या कंप्यूटर में रहती है।",
    },
    {
      question: "क्या प्राइवेट या पेड वीडियो डाउनलोड हो सकते हैं?",
      answer:
        "नहीं। सिर्फ़ पब्लिक वीडियो। प्राइवेट अकाउंट के वीडियो, पेड कंटेंट और लाइव स्ट्रीम नहीं डाउनलोड हो सकते — यह प्लेटफ़ॉर्म की सीमा है, टूल की कमी नहीं। इसी सीमा का सम्मान करने से साइट चलती रहती है।",
    },
    {
      question: "अगर सिर्फ़ आवाज़ चाहिए तो क्या करें?",
      answer:
        "MP3 विकल्प चुनें। अगर सिर्फ़ M4A उपलब्ध है तो वह भी प्लेटफ़ॉर्म का ओरिजिनल ऑडियो है, इसलिए उसकी क्वालिटी दोबारा कन्वर्ट करने से बेहतर ही रहती है। रील्स या ट्रेंडिंग साउंड सेव करने के लिए यही सबसे अच्छा तरीका है।",
    },
  ],
  cta: {
    heading: "अभी डाउनलोड शुरू करें",
    body: "पहला लिंक पेस्ट करें और हाई-क्वालिटी साफ़ कॉपी सेव करें — बिना साइन-अप और बिना इंतज़ार।",
    button: "टूल पर वापस जाएँ",
  },
  otherToolsHeading: "अंग्रेज़ी में दूसरे टूल",
  footerNote: "यह पेज हिंदी में है; प्लेटफ़ॉर्म टूल अंग्रेज़ी में उपलब्ध हैं।",
};

import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Urdu landing page — Pakistan.
 *
 * Pakistan is one of the largest short-video markets in the world, and the
 * download query there is typed both in Urdu script ("ٹک ٹاک ویڈیو ڈاؤن لوڈ")
 * and in romanised English ("tiktok video download"). The keywords carry both,
 * because matching only one of them loses half the demand.
 *
 * Written in Urdu rather than translated sentence by sentence: the steps say
 * "لنک کاپی کریں" the way people actually describe it, and the watermark answer
 * explains where the clean file comes from instead of repeating the English
 * marketing line. `dir: "rtl"` matches /ar — the shared landing component is
 * already checked for horizontal overflow at 390px in RTL.
 */
export const ur: LandingCopy = {
  code: "ur",
  htmlLang: "ur",
  dir: "rtl",
  title: "ٹک ٹاک ویڈیو ڈاؤن لوڈر — بغیر واٹر مارک HD MP4",
  description:
    "ٹک ٹاک ویڈیو بغیر واٹر مارک HD MP4 میں ڈاؤن لوڈ کریں یا صرف آواز MP3 میں محفوظ کریں۔ مفت، نہ ایپ، نہ اکاؤنٹ — براؤزر سے سیدھا آپ کے فون پر۔",
  keywords: [
    "tiktok video download",
    "ٹک ٹاک ویڈیو ڈاؤن لوڈ",
    "tiktok video downloader without watermark",
    "بغیر واٹر مارک ویڈیو ڈاؤن لوڈ",
    "tiktok videos download pakistan",
    "ٹک ٹاک آواز MP3",
    "ویڈیو ڈاؤن لوڈر",
    "instagram reel download",
    "facebook video download",
    "youtube video download",
  ],
  eyebrow: "مفت · بغیر واٹر مارک · ایپ کے بغیر",
  h1Lead: "ٹک ٹاک ویڈیو ڈاؤن لوڈ کریں",
  h1Accent: "بغیر واٹر مارک، فل HD۔",
  lede:
    "لنک پیسٹ کریں اور وہی فائل محفوظ کریں جو ٹک ٹاک خود چلاتا ہے — واٹر مارک کے بغیر، اکاؤنٹ بنائے بغیر۔ اینڈرائیڈ، آئی فون اور کمپیوٹر، تینوں پر ایک ہی طرح چلتا ہے۔",
  chips: ["MP4", "بغیر واٹر مارک", "آواز MP3"],
  tool: {
    heading: "ڈاؤن لوڈر",
    note: "ٹک ٹاک، انسٹاگرام، فیس بک یا یوٹیوب کا لنک اوپر پیسٹ کریں",
  },
  facts: [
    ["قیمت", "مکمل مفت"],
    ["اکاؤنٹ", "ضروری نہیں"],
    ["کوالٹی", "MP4"],
    ["فارمیٹ", "MP4 اور MP3"],
  ],
  stepsHeading: "تین مرحلوں میں ڈاؤن لوڈ",
  steps: [
    {
      title: "ویڈیو کا لنک کاپی کریں",
      body: "ٹک ٹاک میں ویڈیو کھولیں، شئیر کے تیر پر ٹیپ کریں اور «Copy link» چنیں۔ vt.tiktok.com اور vm.tiktok.com جیسے چھوٹے لنک بھی ویسے ہی چل جاتے ہیں — پہلے براؤزر میں کھولنے کی ضرورت نہیں۔",
    },
    {
      title: "لنک اوپر پیسٹ کریں",
      body: "سائٹ خود پہچان لیتی ہے کہ لنک کس پلیٹ فارم کا ہے اور اصل ویڈیو فائل پلیٹ فارم کے سرور سے مانگتی ہے — ایپ کے بنائے ہوئے واٹر مارک والے نسخے کی نہیں۔ فائل ملنے سے پہلے یہ بھی جانچ لیا جاتا ہے کہ وہ واقعی ویڈیو ہے۔",
    },
    {
      title: "کوالٹی چنیں اور محفوظ کریں",
      body: "HD MP4، SD MP4 یا MP3 میں سے جو چاہیں ٹیپ کریں۔ فائل اپنے اصل نام کے ساتھ ڈاؤن لوڈز میں چلی جاتی ہے۔ آئی فون پر یہ «Files» میں آتی ہے، وہاں سے شئیر → «Save Video» کے ذریعے Photos میں منتقل کر لیں۔",
    },
  ],
  faqHeading: "عام سوالات",
  faqs: [
    {
      question: "کیا ویڈیو پر ٹک ٹاک کا واٹر مارک آتا ہے؟",
      answer:
        "نہیں۔ ہم وہی فائل مانگتے ہیں جو ٹک ٹاک اپنے پلیئر کو دیتا ہے، نہ کہ وہ نسخہ جس پر ایپ کا لوگو چھپا ہوتا ہے۔ اس لیے تصویر کاٹنی یا دھندلی کرنی نہیں پڑتی اور فریم کناروں تک پورا رہتا ہے۔",
    },
    {
      question: "کیا ایپ ڈاؤن لوڈ کرنی پڑے گی یا اکاؤنٹ بنانا ہوگا؟",
      answer:
        "نہیں۔ سب کچھ براؤزر میں ہوتا ہے — اینڈرائیڈ، آئی فون، ونڈوز یا میک، جہاں بھی کھولیں۔ نہ APK، نہ ایکسٹینشن، نہ لاگ اِن۔ یہی وجہ ہے کہ iOS یا اینڈرائیڈ اپڈیٹ کے بعد بھی یہ چلتا رہتا ہے۔",
    },
    {
      question: "آئی فون پر ویڈیو کہاں محفوظ ہوتی ہے؟",
      answer:
        "«Files» ایپ کے Downloads فولڈر میں۔ وہاں فائل پر دیر تک دبائیں، «Share» چنیں اور «Save Video» ٹیپ کریں — ویڈیو Photos میں آ جائے گی۔ کوالٹی وہی رہتی ہے، دوبارہ کمپریس نہیں ہوتی۔",
    },
    {
      question: "اگر مجھے صرف آواز چاہیے تو؟",
      answer:
        "MP3 چن لیں۔ اگر پلیٹ فارم صرف M4A دیتا ہے تو وہ بھی اصل آواز ہی ہوتی ہے، اس لیے دوبارہ کنورٹ کرنے سے بہتر ہے۔ ٹرینڈنگ ساؤنڈ محفوظ کرنے کا سب سے محفوظ وقت وہی ہے جب ویڈیو ابھی موجود ہو۔",
    },
    {
      question: "پرائیویٹ یا ڈیلیٹ ہو چکی ویڈیو مل سکتی ہے؟",
      answer:
        "نہیں۔ صرف عوامی ویڈیوز چلتی ہیں۔ پرائیویٹ اکاؤنٹ، پیکڈ کنٹینٹ اور لائیو اسٹریم باہر رہتے ہیں، کیونکہ ان کا کوئی عوامی فائل لنک ہوتا ہی نہیں۔ یہ پلیٹ فارم کی حد ہے، ٹول کی خرابی نہیں۔",
    },
    {
      question: "کیا میرے لنک یا ویڈیو محفوظ کیے جاتے ہیں؟",
      answer:
        "نہیں۔ لنک صرف یادداشت میں پراسیس ہو کر ختم ہو جاتا ہے، اور ڈاؤن لوڈ سیدھا پلیٹ فارم کے سرور سے آپ کے ڈیوائس پر آتا ہے۔ نہ کوئی ہسٹری، نہ سرور پر نقل، نہ کوئی اکاؤنٹ۔",
    },
  ],
  cta: {
    heading: "اگلی ویڈیو HD میں محفوظ کریں",
    body: "لنک پیسٹ کریں اور اصل فائل لے لیں — نہ اکاؤنٹ، نہ ایپ، نہ انتظار۔",
    button: "ڈاؤن لوڈر کھولیں",
  },
  otherToolsHeading: "انگریزی میں دیگر ٹولز",
  footerNote: "یہ صفحہ اردو میں ہے؛ پلیٹ فارم کے الگ صفحات بھی اسی سائٹ پر موجود ہیں۔",
};

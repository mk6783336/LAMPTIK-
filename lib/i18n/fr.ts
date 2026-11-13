import type { LandingCopy } from "@/lib/i18n/types";

/**
 * French landing page — France, Belgium, Switzerland and francophone Africa.
 *
 * Written for the query French users type — "télécharger vidéo TikTok sans
 * filigrane" — with the vous form, which is what a utility site uses in this
 * market. « Filigrane » is the word for watermark in France and Belgium;
 * « watermark » stays only inside the keywords where people also search it.
 *
 * Non-breaking spaces before « : » and « ? » are deliberate: French
 * typography requires them, and they are what a native reader expects.
 */
export const fr: LandingCopy = {
  code: "fr",
  htmlLang: "fr",
  dir: "ltr",
  title: "Télécharger une vidéo TikTok sans filigrane — HD",
  description:
    "Téléchargez les vidéos TikTok, Instagram Reels, Facebook et YouTube en HD, sans filigrane, sans application et sans compte. MP4 et MP3, c'est gratuit.",
  keywords: [
    "télécharger vidéo tiktok sans filigrane",
    "tiktok sans watermark",
    "télécharger reels instagram",
    "télécharger vidéo facebook",
    "convertir tiktok en mp3",
    "télécharger vidéo youtube mp4",
  ],
  eyebrow: "Gratuit · Sans filigrane · Sans application",
  h1Lead: "Enregistrez vos vidéos.",
  h1Accent: "Sans aucun filigrane.",
  lede:
    "Collez un lien, choisissez la qualité, téléchargez — TikTok, Instagram Reels, Facebook et YouTube en quelques secondes sur votre téléphone.",
  chips: ["MP4", "Audio MP3", "Sans compte"],
  tool: {
    heading: "Collez le lien de la vidéo",
    note: "Fonctionne dans tous les navigateurs, iPhone et Android compris.",
  },
  facts: [
    ["Prix", "Gratuit"],
    ["Compte", "Inutile"],
    ["Qualité", "MP4"],
    ["Audio", "MP3 et M4A"],
  ],
  stepsHeading: "Télécharger en trois étapes",
  steps: [
    {
      title: "Copiez le lien de la vidéo",
      body: "Ouvrez la vidéo dans TikTok, Instagram, Facebook ou YouTube, puis Partage → Copier le lien. L'adresse de la barre du navigateur fonctionne aussi, tout comme les liens courts vt.tiktok.com et fb.watch.",
    },
    {
      title: "Collez-le dans le champ ci-dessus",
      body: "La plateforme est détectée automatiquement : vous n'avez rien à sélectionner. Le serveur demande le flux d'origine au CDN de la plateforme — pas la copie partagée sur laquelle l'application imprime son logo — et vérifie qu'il s'agit bien d'une vidéo avant de vous proposer le fichier.",
    },
    {
      title: "Enregistrez en HD ou en MP3",
      body: "Touchez Télécharger HD MP4, SD MP4 ou MP3. Le fichier arrive dans vos téléchargements sous son nom d'origine, sans réencodage ; sur iPhone, utilisez Partager → Enregistrer dans Fichiers.",
    },
  ],
  faqHeading: "Questions fréquentes",
  faqs: [
    {
      question: "Le téléchargement est-il vraiment gratuit ?",
      answer:
        "Oui. Les téléchargements HD, SD et MP3 sont gratuits et illimités. Aucun abonnement, aucun compte, aucun frais caché : le site est financé par la publicité.",
    },
    {
      question: "Les vidéos arrivent-elles sans filigrane ?",
      answer:
        "Oui. Nous récupérons le fichier d'origine sur le CDN de la plateforme, et non la version partagée sur laquelle le logo est incrusté. Sur TikTok, cela signifie le flux « play » plutôt que « wmplay » : l'image n'est ni rognée ni réencodée.",
    },
    {
      question: "Cela fonctionne-t-il sur iPhone et Android sans application ?",
      answer:
        "Oui. Le site tourne dans Safari, Chrome et Firefox. Sur iPhone, après le téléchargement, choisissez Partager → Enregistrer dans Fichiers ; sur Android, le fichier va directement dans le dossier Téléchargements.",
    },
    {
      question: "Mes liens et mes vidéos sont-ils conservés ?",
      answer:
        "Non. Les liens ne servent qu'à la résolution et sont retirés du cache en quelques minutes. Aucun compte, aucun historique de téléchargement et aucune copie de fichier ne sont conservés sur le serveur.",
    },
  ],
  cta: {
    heading: "Prêt pour votre premier téléchargement ?",
    body: "Collez un lien et enregistrez la vidéo en quelques secondes — sans filigrane, sans application.",
    button: "Ouvrir le téléchargeur",
  },
  otherToolsHeading: "Autres téléchargeurs",
  footerNote: "Cette page est en français ; l'interface de l'outil reste en anglais.",
};

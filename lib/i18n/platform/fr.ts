import type { LandingCopy } from "@/lib/i18n/types";
import type { LocalizedPlatform } from "@/lib/i18n/platform-landings";

/**
 * French platform pages: `/fr/instagram-reels-downloader`,
 * `/fr/youtube-downloader`, `/fr/facebook-video-downloader`.
 *
 * `/fr` was the locale with the longest measured engagement in Ahrefs Web
 * Analytics (1,612s of accumulated session time) but it was the only one of the
 * four Tier-1 languages with no per-network pages — a French visitor landed on
 * the TikTok root and had nowhere to go for a Reel or a Facebook video. These
 * three pages are written for the query, not translated from the English page:
 * the FAQ answers what French autocomplete actually asks («sans filigrane»,
 * «en HD», «sans application», «lien fb.watch»).
 */
export const fr: Record<LocalizedPlatform, LandingCopy> = {
  instagram: {
    code: "fr",
    htmlLang: "fr",
    dir: "ltr",
    title: "Télécharger des Reels Instagram en HD — sans filigrane",
    description:
      "Téléchargez un Reel Instagram dans sa qualité d’origine 1080p, audio inclus, sans filigrane et sans compte. Gratuit, depuis le téléphone ou le PC.",
    keywords: [
      "télécharger reel instagram",
      "télécharger vidéo instagram",
      "reel instagram sans filigrane",
      "enregistrer un reel sur iphone",
      "reel instagram hd",
      "télécharger reels sans compte",
      "instagram reels mp4",
    ],
    eyebrow: "Reels Instagram · gratuit · sans compte",
    h1Lead: "Téléchargez un Reel Instagram",
    h1Accent: "en HD, sans filigrane.",
    lede:
      "Collez le lien du Reel et récupérez le MP4 que sert Instagram lui-même, avec son audio synchronisé. Les liens /reel/, /reels/, /p/, /tv/ et instagr.am sont acceptés, sans compte et sans application.",
    chips: ["Qualité d’origine", "Audio inclus", "Sans connexion"],
    tool: {
      heading: "Collez le lien du Reel",
      note: "Instagram est détecté automatiquement ; TikTok, Facebook et YouTube aussi.",
    },
    facts: [
      ["Prix", "Gratuit"],
      ["Compte", "Inutile"],
      ["Qualité", "1080 × 1920"],
      ["Format", "MP4 avec audio"],
    ],
    stepsHeading: "Télécharger un Reel en trois étapes",
    steps: [
      {
        title: "Copiez le lien du Reel",
        body: "Dans Instagram, touchez les trois points du Reel puis « Copier le lien ». L’adresse de la barre du navigateur fonctionne aussi. N’utilisez pas le bouton de partage de l’application : la copie qu’il produit porte le logo et le nom du compte.",
      },
      {
        title: "Collez-le dans le champ ci-dessus",
        body: "Le serveur ouvre la publication publique, lit les versions vidéo proposées par Instagram et retient le MP4 progressif au débit le plus élevé : image et son dans un seul fichier. Si le Reel n’existe qu’en un conteneur que votre téléphone ne lit pas, il est converti en H.264 standard.",
      },
      {
        title: "Enregistrez le MP4",
        body: "Appuyez sur « Télécharger HD MP4 ». Le fichier arrive sous le nom de la publication et se range dans Téléchargements ; sur iPhone il reste dans Fichiers, d’où vous le passez dans Photos via Partager → Enregistrer la vidéo. Aucun recadrage n’est nécessaire.",
      },
    ],
    faqHeading: "Questions fréquentes",
    faqs: [
      {
        question: "Le Reel est-il téléchargé sans filigrane ?",
        answer:
          "Oui. Nous demandons le fichier qu’Instagram sert à son propre lecteur, pas la copie générée par le menu Partager. La vidéo d’origine ne porte aucune surcouche : il n’y a donc rien à rogner ni à flouter.",
      },
      {
        question: "Faut-il un compte Instagram ?",
        answer:
          "Non. Les publications publiques sont résolues sans session : aucun identifiant, aucun mot de passe, aucun cookie. Les comptes privés ne sont pas téléchargeables, et un outil qui prétend le contraire utilise la session de quelqu’un d’autre.",
      },
      {
        question: "Que faire si le Reel ne se télécharge pas ?",
        answer:
          "Vérifiez d’abord que la vidéo se lit dans Instagram sans être connecté. Si elle se lit mais échoue ici, attendez une minute et réessayez : Instagram limite les requêtes anonymes quand la charge augmente. Si elle est supprimée ou privée, aucun fichier public n’existe.",
      },
      {
        question: "Cela fonctionne-t-il avec les photos et les carrousels ?",
        answer:
          "Les vidéos d’un carrousel sont téléchargées en MP4. Une publication qui ne contient que des photos n’a aucune piste vidéo : l’outil le signale au lieu de livrer un fichier vide.",
      },
      {
        question: "Mes liens ou mes vidéos sont-ils conservés ?",
        answer:
          "Non. Le lien est traité en mémoire puis oublié, et le téléchargement va du CDN d’Instagram directement à votre appareil. Aucun historique, aucune copie serveur, aucun compte à créer.",
      },
    ],
    cta: {
      heading: "Gardez votre prochain Reel en qualité d’origine",
      body: "Sans compte, sans application et sans filigrane : le fichier tel que l’auteur l’a publié.",
      button: "Ouvrir le téléchargeur",
    },
    otherToolsHeading: "Autres outils par plateforme",
    footerNote: "Cette page est en français et fonctionne de la même façon en France, en Belgique et au Canada.",
  },

  youtube: {
    code: "fr",
    htmlLang: "fr",
    dir: "ltr",
    title: "Télécharger une vidéo YouTube en MP4 HD ou MP3",
    description:
      "Collez un lien YouTube et récupérez la vidéo en MP4 jusqu’à 1080p, ou seulement l’audio en MP3. Compatible watch, Shorts, youtu.be et playlists, sans application.",
    keywords: [
      "télécharger vidéo youtube",
      "youtube mp3",
      "télécharger youtube en hd",
      "convertir youtube en mp3",
      "télécharger shorts youtube",
      "youtube mp4 1080p",
      "télécharger vidéo youtube sans logiciel",
    ],
    eyebrow: "YouTube · MP4 et MP3 · rien à installer",
    h1Lead: "Téléchargez une vidéo YouTube",
    h1Accent: "en MP4 HD ou en audio seul.",
    lede:
      "Collez le lien et choisissez la qualité réellement disponible : 1080p quand elle existe, 720p sinon, ou MP3 de l’audio d’origine. Les liens watch, Shorts, youtu.be et les playlists sont acceptés, directement dans le navigateur.",
    chips: ["MP4 1080p", "MP3 d’origine", "Shorts et youtu.be"],
    tool: {
      heading: "Collez le lien de la vidéo",
      note: "YouTube est détecté automatiquement ; TikTok, Instagram et Facebook aussi.",
    },
    facts: [
      ["Prix", "Gratuit"],
      ["Compte", "Inutile"],
      ["Qualité", "1080p / 720p"],
      ["Formats", "MP4 et MP3"],
    ],
    stepsHeading: "Télécharger une vidéo YouTube en trois étapes",
    steps: [
      {
        title: "Copiez le lien de la vidéo",
        body: "Dans l’application YouTube, touchez Partager → Copier le lien ; sur ordinateur, copiez l’adresse de la barre du navigateur. Les liens youtu.be, Shorts et ceux qui portent un paramètre de playlist sont acceptés tels quels.",
      },
      {
        title: "Vérifiez la qualité réelle",
        body: "Le serveur interroge les versions disponibles et affiche celles qui existent vraiment. Aucun 4K inventé, aucun 720p agrandi pour s’appeler HD : si l’auteur a publié en 720p, vous obtenez du 720p.",
      },
      {
        title: "Choisissez MP4 ou MP3",
        body: "Téléchargez la vidéo complète avec image et son, ou extrayez la piste audio en MP3. Le fichier est enregistré sous le titre de la vidéo, pas sous un nom générique.",
      },
    ],
    faqHeading: "Questions fréquentes",
    faqs: [
      {
        question: "Peut-on télécharger en 1080p ?",
        answer:
          "Oui, à condition que YouTube propose cette définition pour la vidéo. L’outil affiche les qualités disponibles avant le téléchargement : vous ne terminez pas avec un fichier moins défini que prévu.",
      },
      {
        question: "Comment convertir une vidéo YouTube en MP3 ?",
        answer:
          "Collez le lien et choisissez l’option audio. La piste publiée par YouTube est extraite puis convertie une seule fois en MP3 : le lecteur n’est pas enregistré et le son n’est pas recomposé. La qualité suit l’original — un audio à 128 kbps reste à 128 kbps.",
      },
      {
        question: "Cela fonctionne-t-il avec les Shorts et youtu.be ?",
        answer:
          "Avec les deux. Les Shorts sont résolus comme n’importe quelle vidéo verticale, et les liens courts youtu.be sont développés côté serveur : inutile de chercher l’adresse complète.",
      },
      {
        question: "Peut-on télécharger une playlist entière ?",
        answer:
          "Une playlist n’est pas un fichier mais une liste. L’outil ouvre la liste et vous laisse passer d’une vidéo à l’autre avec le même téléchargeur ; en aspirer des centaines d’un coup est le moyen le plus rapide de se faire limiter.",
      },
      {
        question: "Faut-il installer quelque chose ?",
        answer:
          "Non. Tout se passe dans le navigateur, mobile compris : aucun logiciel de bureau, aucune extension, aucun APK. Sur iPhone le fichier reste dans Fichiers, d’où vous le passez dans Photos.",
      },
    ],
    cta: {
      heading: "Gardez la vidéo, ou seulement le son",
      body: "Choisissez la qualité qui existe vraiment et téléchargez sans rien installer.",
      button: "Ouvrir le téléchargeur",
    },
    otherToolsHeading: "Autres outils par plateforme",
    footerNote: "Ne téléchargez que vos propres contenus ou ceux que l’auteur autorise ; les droits restent les siens.",
  },

  facebook: {
    code: "fr",
    htmlLang: "fr",
    dir: "ltr",
    title: "Télécharger une vidéo Facebook en HD — sans application",
    description:
      "Téléchargez une vidéo Facebook en HD depuis le navigateur : publications, Watch, Reels et liens fb.watch. Sans installation, sans compte et sans filigrane.",
    keywords: [
      "télécharger vidéo facebook",
      "télécharger vidéo facebook sans application",
      "facebook vidéo hd",
      "télécharger reel facebook",
      "fb.watch télécharger",
      "enregistrer vidéo facebook",
      "vidéo facebook privée",
    ],
    eyebrow: "Facebook · HD · rien à installer",
    h1Lead: "Téléchargez une vidéo Facebook",
    h1Accent: "en HD, sans application.",
    lede:
      "Collez le lien de la vidéo et récupérez le MP4 avec son audio. Les publications de pages, les vidéos Watch, les Reels et les liens courts fb.watch fonctionnent : ces derniers sont développés côté serveur avant la recherche du fichier.",
    chips: ["HD en priorité", "fb.watch inclus", "Vidéos longues"],
    tool: {
      heading: "Collez le lien de la vidéo",
      note: "Facebook est détecté automatiquement ; TikTok, Instagram et YouTube aussi.",
    },
    facts: [
      ["Prix", "Gratuit"],
      ["Compte", "Inutile"],
      ["Qualité", "HD ou SD réelle"],
      ["Taille", "Sans limite"],
    ],
    stepsHeading: "Télécharger une vidéo Facebook en trois étapes",
    steps: [
      {
        title: "Copiez le lien de la vidéo",
        body: "Touchez Partager sous la vidéo puis « Copier le lien ». L’URL de la publication, celle de /watch/, celle de /reel/ et la forme courte fb.watch/ sont acceptées. Les vidéos privées et celles des groupes fermés restent hors de portée : aucun fichier public n’existe.",
      },
      {
        title: "Laissez la redirection se résoudre",
        body: "fb.watch ne contient pas l’identifiant de la vidéo : c’est un raccourcisseur qui mène à la publication réelle. Le serveur suit toute la chaîne de redirections jusqu’à l’URL canonique, puis demande la meilleure version en vérifiant qu’elle contient bien image et son.",
      },
      {
        title: "Choisissez HD et enregistrez",
        body: "Si Facebook propose une variante HD, c’est elle qui est servie ; sinon la meilleure SD disponible, et le panneau indique ce que vous avez reçu. Les longues vidéos Watch sont diffusées sans mise en mémoire tampon côté serveur : un fichier de plus d’1 Go se télécharge comme un clip court.",
      },
    ],
    faqHeading: "Questions fréquentes",
    faqs: [
      {
        question: "Faut-il installer une application ou une extension ?",
        answer:
          "Non. Le téléchargement se fait dans le navigateur, sur iPhone, Android, Windows ou Mac. Aucun APK, aucune extension, aucune permission à accorder : c’est la différence principale avec les sites qui exigent une installation avant d’afficher un fichier.",
      },
      {
        question: "Les liens fb.watch fonctionnent-ils ?",
        answer:
          "Oui. C’est un raccourcisseur, pas l’adresse de la vidéo : la chaîne de redirections est suivie côté serveur jusqu’à la publication réelle. C’est pourquoi un lien que d’autres outils jugent invalide fonctionne ici.",
      },
      {
        question: "Pourquoi une vidéo arrive-t-elle parfois en SD ?",
        answer:
          "Parce que Facebook n’a publié aucune variante HD pour cette vidéo. Nous demandons HD d’abord puis nous revenons à la meilleure SD, et le panneau précise ce qui a été livré au lieu d’appeler du 360p de la HD.",
      },
      {
        question: "Peut-on télécharger une vidéo privée ou de groupe ?",
        answer:
          "Non. Elle exige une session autorisée à la voir, et cet outil ne demande jamais vos identifiants Facebook. Les publications publiques de pages, Watch et Reels publics fonctionnent.",
      },
      {
        question: "Le fichier porte-t-il un filigrane ?",
        answer:
          "Non. Les fichiers Facebook n’en portent aucun et nous ne réencodons pas : le MP4 est celui que sert son lecteur, avec la résolution et l’audio d’origine.",
      },
    ],
    cta: {
      heading: "Gardez cette vidéo avant qu’elle disparaisse",
      body: "Sans compte, sans installation et sans limite de taille.",
      button: "Ouvrir le téléchargeur",
    },
    otherToolsHeading: "Autres outils par plateforme",
    footerNote: "Les vidéos privées et de groupes fermés sont exclues par conception : aucun fichier public à télécharger.",
  },
};

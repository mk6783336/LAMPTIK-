import type { LandingCopy, LocaleCode } from "@/lib/i18n/types";

/**
 * Platform-specific landings in Spanish and Arabic.
 *
 * The locale roots (`/es`, `/ar`) are TikTok pages that mention the other three
 * networks in passing. That is the wrong page to rank for «descargar reels de
 * instagram» or «تحميل فيديو فيسبوك»: the query names one platform, and Google
 * matches a page whose whole subject is that platform. Each entry below is that
 * page — same resolver as the English tool page, with copy written for the
 * query rather than translated from the English one.
 *
 * The URL keeps the English slug (`/es/youtube-downloader`), which is the
 * convention every large localized tool site uses and keeps one canonical
 * topic per path segment.
 */

/** English slug per platform, reused as the last path segment in every locale. */
export const LOCALIZED_PLATFORM_SLUGS = {
  instagram: "instagram-reels-downloader",
  youtube: "youtube-downloader",
  facebook: "facebook-video-downloader",
} as const;

export type LocalizedPlatform = keyof typeof LOCALIZED_PLATFORM_SLUGS;

export const LOCALIZED_PLATFORMS = Object.keys(LOCALIZED_PLATFORM_SLUGS) as LocalizedPlatform[];

/** Only these locales have platform pages; the rest keep their single landing. */
export const PLATFORM_LOCALES = ["es", "ar"] as const;
export type PlatformLocale = (typeof PLATFORM_LOCALES)[number];

export const PLATFORM_LANDINGS: Record<PlatformLocale, Record<LocalizedPlatform, LandingCopy>> = {
  // ---------------------------------------------------------------- Spanish
  es: {
    instagram: {
      code: "es",
      htmlLang: "es",
      dir: "ltr",
      title: "Descargar Reels de Instagram en HD — Sin Marca de Agua",
      description:
        "Descarga Reels de Instagram en su calidad original 1080p con el audio incluido, sin marca de agua y sin iniciar sesión. Gratis, desde el móvil o el PC.",
      keywords: [
        "descargar reels de instagram",
        "descargar video de instagram",
        "guardar reels en el celular",
        "bajar reels sin marca de agua",
        "descargar reels en hd",
        "descargar reels sin iniciar sesion",
      ],
      eyebrow: "Instagram Reels · gratis · sin cuenta",
      h1Lead: "Descarga Reels de Instagram",
      h1Accent: "en HD y sin marca de agua.",
      lede:
        "Pega el enlace del Reel y guarda el MP4 que sirve Instagram, con su audio sincronizado. Acepta enlaces /reel/, /reels/, /p/, /tv/ e instagr.am, y no pide cuenta ni aplicación.",
      chips: ["Calidad original", "Audio incluido", "Sin iniciar sesión"],
      tool: {
        heading: "Pega el enlace del Reel",
        note: "Instagram se detecta solo: también acepta Facebook, YouTube y TikTok.",
      },
      facts: [
        ["Precio", "Gratis"],
        ["Cuenta", "No hace falta"],
        ["Calidad", "1080 × 1920"],
        ["Formatos", "MP4 con audio"],
      ],
      stepsHeading: "Cómo descargar un Reel en tres pasos",
      steps: [
        {
          title: "Copia el enlace del Reel",
          body: "En Instagram pulsa los tres puntos del Reel y elige Copiar enlace. También sirve la dirección que aparece en la barra del navegador. No descargues desde la propia app: esa copia lleva la marca de agua y la interfaz superpuesta.",
        },
        {
          title: "Pégalo en el cuadro de arriba",
          body: "El servidor abre la publicación pública, lee las versiones de vídeo que Instagram ofrece y elige el MP4 progresivo de mayor bitrate, que ya trae imagen y sonido en un solo archivo. Si el Reel solo existe en un contenedor que tu móvil no reproduce, se convierte a H.264 estándar.",
        },
        {
          title: "Guarda el MP4",
          body: "Pulsa Descargar HD MP4. El archivo llega con el nombre de la publicación y se guarda en Descargas; en iPhone queda en Archivos y desde ahí lo mueves a Fotos con Compartir → Guardar vídeo. La calidad es la que publicó el autor, sin recortes.",
        },
      ],
      faqHeading: "Preguntas frecuentes",
      faqs: [
        {
          question: "¿Los Reels se descargan con marca de agua?",
          answer:
            "No. Se pide el archivo que Instagram sirve a su propio reproductor, no la copia que genera el menú Compartir. Como el vídeo original no tiene ninguna capa encima, no hay que recortar ni difuminar nada.",
        },
        {
          question: "¿Necesito cuenta de Instagram para descargar?",
          answer:
            "No. Las publicaciones públicas se resuelven sin sesión: no se pide usuario, contraseña ni cookies. Las cuentas privadas no se pueden descargar, y una herramienta que diga lo contrario está usando la sesión de otra persona.",
        },
        {
          question: "¿Qué hago si el Reel no se descarga?",
          answer:
            "Comprueba que el vídeo se reproduce en Instagram sin haber iniciado sesión. Si se ve pero aquí falla, espera un minuto y reinténtalo: Instagram limita las peticiones anónimas cuando hay mucho tráfico. Si está borrado o es privado, no existe ningún archivo público que descargar.",
        },
        {
          question: "¿Funciona con fotos y carruseles?",
          answer:
            "Los vídeos dentro de un carrusel se descargan como MP4. Las publicaciones que solo tienen fotos no traen ningún vídeo, así que la herramienta lo dice en lugar de entregar un archivo vacío.",
        },
        {
          question: "¿Se guardan mis enlaces o mis vídeos?",
          answer:
            "No. El enlace se procesa en memoria y se descarta, y la descarga va del CDN de Instagram directamente a tu dispositivo. No hay historial, ni copia en el servidor, ni cuenta que crear.",
        },
      ],
      cta: {
        heading: "Guarda tu próximo Reel en calidad original",
        body: "Sin cuenta, sin app y sin marca de agua: solo el archivo que publicó el autor.",
        button: "Abrir el descargador",
      },
      otherToolsHeading: "Más herramientas por plataforma",
      footerNote:
        "Esta página está en español y funciona igual en España y en Latinoamérica.",
    },

    youtube: {
      code: "es",
      htmlLang: "es",
      dir: "ltr",
      title: "Descargar videos de YouTube en MP4 HD y MP3 — Gratis",
      description:
        "Pega un enlace de YouTube y guarda el vídeo en MP4 hasta 1080p o el audio en MP3. Funciona con watch, Shorts, youtu.be y playlists, sin app ni registro.",
      keywords: [
        "descargar videos de youtube",
        "youtube a mp3",
        "descargar video de youtube en hd",
        "bajar musica de youtube",
        "descargar shorts de youtube",
        "descargar videos de youtube sin programa",
      ],
      eyebrow: "YouTube · MP4 y MP3 · sin instalar nada",
      h1Lead: "Descarga videos de YouTube",
      h1Accent: "en MP4 HD o solo el audio.",
      lede:
        "Pega el enlace del vídeo y elige la calidad que YouTube realmente tiene: 1080p cuando existe, 720p si no, y MP3 del audio original. Acepta watch, Shorts, youtu.be y enlaces de playlist, todo desde el navegador.",
      chips: ["MP4 1080p", "MP3 original", "Shorts y youtu.be"],
      tool: {
        heading: "Pega el enlace del vídeo",
        note: "YouTube se detecta solo; también acepta TikTok, Instagram y Facebook.",
      },
      facts: [
        ["Precio", "Gratis"],
        ["Cuenta", "No hace falta"],
        ["Calidad", "1080p / 720p"],
        ["Formatos", "MP4 y MP3"],
      ],
      stepsHeading: "Cómo descargar un video de YouTube en tres pasos",
      steps: [
        {
          title: "Copia el enlace del video",
          body: "En la app de YouTube toca Compartir → Copiar enlace. En el ordenador copia la dirección de la barra del navegador. Los enlaces youtu.be, los de Shorts y los que llevan parámetros de playlist se aceptan tal cual, sin limpiarlos a mano.",
        },
        {
          title: "Comprueba la calidad real",
          body: "El servidor pide las versiones disponibles y muestra cuáles existen de verdad. No se inventa un 4K que el vídeo no tiene ni se reescala un 720p para llamarlo HD: si el autor subió 720p, verás 720p.",
        },
        {
          title: "Elige MP4 o MP3 y guarda",
          body: "Descarga el vídeo completo con imagen y sonido, o extrae la pista de audio en MP3. El archivo se guarda en tu carpeta de Descargas con el título del vídeo, no con un nombre genérico.",
        },
      ],
      faqHeading: "Preguntas frecuentes",
      faqs: [
        {
          question: "¿Puedo descargar un video en 1080p?",
          answer:
            "Sí, siempre que YouTube tenga esa resolución para ese vídeo. La herramienta muestra las calidades disponibles antes de descargar, así que no acabas con un archivo de menos píxeles de los que esperabas.",
        },
        {
          question: "¿Cómo paso un video de YouTube a MP3?",
          answer:
            "Pega el enlace y elige la opción de audio. Se extrae la pista original que publicó YouTube y se convierte a MP3 una sola vez; no se graba el reproductor ni se recompone el sonido. La calidad depende del original: un audio de 128 kbps sigue siendo 128 kbps.",
        },
        {
          question: "¿Funciona con Shorts y con youtu.be?",
          answer:
            "Con los dos. Los Shorts se resuelven como cualquier vídeo vertical y los enlaces cortos youtu.be se expanden en el servidor, así que no tienes que buscar la dirección completa.",
        },
        {
          question: "¿Se pueden descargar playlists completas?",
          answer:
            "Una playlist no es un archivo, es una lista. La herramienta abre la lista y te deja ir vídeo por vídeo con el mismo descargador; descargar cientos de golpe es la forma más rápida de que te limiten las peticiones.",
        },
        {
          question: "¿Necesito instalar algo?",
          answer:
            "No. Todo ocurre en el navegador, también en el móvil: no hay programa de escritorio, ni extensión, ni APK. En iPhone el archivo se guarda en Archivos y desde ahí lo pasas a Fotos.",
        },
      ],
      cta: {
        heading: "Guarda el video o solo el audio",
        body: "Elige la calidad que existe de verdad y descarga sin instalar nada.",
        button: "Abrir el descargador",
      },
      otherToolsHeading: "Más herramientas por plataforma",
      footerNote: "Descarga solo contenido propio o con permiso del autor; los derechos siguen siendo suyos.",
    },

    facebook: {
      code: "es",
      htmlLang: "es",
      dir: "ltr",
      title: "Descargar videos de Facebook en HD — Sin app ni registro",
      description:
        "Descarga videos de Facebook en HD desde el navegador: publicaciones, Watch, Reels y enlaces fb.watch. Sin instalar nada, sin cuenta y sin marca de agua.",
      keywords: [
        "descargar videos de facebook",
        "descargar video de facebook sin app",
        "bajar videos de facebook en hd",
        "descargar reels de facebook",
        "fb.watch descargar",
        "guardar video de facebook",
      ],
      eyebrow: "Facebook · HD · sin instalar nada",
      h1Lead: "Descarga videos de Facebook",
      h1Accent: "en HD, sin aplicación.",
      lede:
        "Pega el enlace del vídeo y guarda el MP4 con su audio. Sirven las publicaciones de páginas, los vídeos de Watch, los Reels y los enlaces cortos fb.watch, que se expanden en el servidor antes de buscar el archivo.",
      chips: ["HD primero", "fb.watch incluido", "Vídeos largos"],
      tool: {
        heading: "Pega el enlace del video",
        note: "Facebook se detecta solo; también acepta TikTok, Instagram y YouTube.",
      },
      facts: [
        ["Precio", "Gratis"],
        ["Cuenta", "No hace falta"],
        ["Calidad", "HD o SD real"],
        ["Límite", "Sin tope de tamaño"],
      ],
      stepsHeading: "Cómo descargar un video de Facebook en tres pasos",
      steps: [
        {
          title: "Copia el enlace del video",
          body: "Pulsa Compartir debajo del vídeo y elige Copiar enlace. Valen la URL de la publicación, la de /watch/, la de /reel/ y la forma corta fb.watch/. Los vídeos privados o de grupos cerrados no se pueden resolver porque no tienen un archivo público.",
        },
        {
          title: "Deja que se resuelva la redirección",
          body: "fb.watch no contiene el identificador del vídeo: es un acortador que salta a la publicación real. El servidor sigue toda la cadena de redirecciones hasta la URL canónica y solo entonces pide la versión de mayor calidad, comprobando que el archivo tenga imagen y sonido.",
        },
        {
          title: "Elige HD y guarda",
          body: "Si Facebook ofrece una variante HD se sirve esa; si no existe, la mejor SD disponible, y el panel te dice cuál has recibido. Los vídeos largos de Watch se transmiten sin buffering en servidor, así que un archivo de más de 1 GB se descarga igual que un clip corto.",
        },
      ],
      faqHeading: "Preguntas frecuentes",
      faqs: [
        {
          question: "¿Tengo que instalar una app o una extensión?",
          answer:
            "No. La descarga ocurre en el navegador, en iPhone, Android, Windows o Mac. No hay APK, ni extensión, ni permisos que conceder: es la diferencia principal frente a las webs que piden instalar algo antes de mostrarte un archivo.",
        },
        {
          question: "¿Funcionan los enlaces fb.watch?",
          answer:
            "Sí. Es un acortador, no la dirección del vídeo, así que se sigue la cadena de redirecciones en el servidor hasta encontrar la publicación real. Por eso un enlace que otras herramientas llaman inválido aquí sí funciona.",
        },
        {
          question: "¿Por qué a veces baja en SD y no en HD?",
          answer:
            "Porque Facebook no publicó ninguna variante HD para ese vídeo. Se pide HD primero y se cae a la mejor SD disponible, y el panel indica cuál se ha entregado en lugar de etiquetar un 360p como HD.",
        },
        {
          question: "¿Se pueden descargar videos privados o de grupos?",
          answer:
            "No. Necesitan una sesión con permiso para verlos, y esta herramienta nunca pide credenciales de Facebook. Sí funcionan las publicaciones públicas de páginas, Watch y Reels públicos.",
        },
        {
          question: "¿El archivo lleva marca de agua?",
          answer:
            "No. Los archivos de Facebook no llevan ninguna marca y aquí no se recodifica, así que el MP4 es el mismo que sirve su reproductor, con la resolución y el audio originales.",
        },
      ],
      cta: {
        heading: "Guarda ese video antes de que lo borren",
        body: "Sin cuenta, sin instalar nada y sin límite de tamaño.",
        button: "Abrir el descargador",
      },
      otherToolsHeading: "Más herramientas por plataforma",
      footerNote: "Los vídeos privados y de grupos cerrados quedan fuera por diseño: no hay archivo público que descargar.",
    },
  },

  // ----------------------------------------------------------------- Arabic
  ar: {
    instagram: {
      code: "ar",
      htmlLang: "ar",
      dir: "rtl",
      title: "تنزيل ريلز انستقرام بجودة HD وبدون علامة مائية",
      description:
        "نزّل ريلز انستقرام بالجودة الأصلية 1080p مع الصوت، بدون علامة مائية وبدون تسجيل دخول. مجاني ومن متصفح الهاتف أو الكمبيوتر مباشرة.",
      keywords: [
        "تنزيل ريلز انستقرام",
        "تحميل فيديو انستقرام",
        "تنزيل ريلز بدون علامة مائية",
        "حفظ ريلز انستقرام",
        "تحميل ريلز بجودة عالية",
        "تنزيل فيديوهات انستقرام",
      ],
      eyebrow: "ريلز انستقرام · مجاني · بلا حساب",
      h1Lead: "نزّل ريلز انستقرام",
      h1Accent: "بجودة HD وبدون علامة مائية.",
      lede:
        "الصق رابط الريل واحفظ ملف MP4 الذي يقدّمه انستقرام نفسه مع صوته المتزامن. يدعم روابط /reel/ و/reels/ و/p/ و/tv/ وinstagr.am، ولا يطلب حسابًا ولا تطبيقًا.",
      chips: ["الجودة الأصلية", "الصوت مضمّن", "بدون تسجيل دخول"],
      tool: {
        heading: "الصق رابط الريل",
        note: "يتعرّف على انستقرام تلقائيًا، ويقبل أيضًا Facebook وYouTube وTikTok.",
      },
      facts: [
        ["السعر", "مجاني"],
        ["الحساب", "غير مطلوب"],
        ["الجودة", "1080 × 1920"],
        ["الصيغة", "MP4 مع الصوت"],
      ],
      stepsHeading: "كيف تنزّل ريل انستقرام في ثلاث خطوات",
      steps: [
        {
          title: "انسخ رابط الريل",
          body: "من انستقرام اضغط النقاط الثلاث في الريل ثم «نسخ الرابط»، أو انسخ العنوان من شريط المتصفح. لا تنزّل من داخل التطبيق: النسخة التي ينتجها زر المشاركة تحمل اسم الحساب والشعار.",
        },
        {
          title: "الصق الرابط في الأداة",
          body: "يطلب الخادم نسخ الفيديو التي يعرضها انستقرام، ويختار ملف MP4 المتدرّج الأعلى بتردد بيانات، وهو يحتوي الصورة والصوت في ملف واحد. وإذا كانت النسخة بصيغة لا يدعمها هاتفك تُحوَّل إلى H.264 قياسي قبل التسليم.",
        },
        {
          title: "احفظ الملف",
          body: "اضغط «تنزيل HD MP4» ليُحفظ الملف باسم المنشور في مجلد التنزيلات. على iPhone يصل إلى تطبيق «الملفات»، ومنه تنقله إلى «الصور» عبر مشاركة ← حفظ الفيديو، دون أي إعادة ضغط.",
        },
      ],
      faqHeading: "أسئلة شائعة",
      faqs: [
        {
          question: "هل يصل الريل بدون علامة مائية؟",
          answer:
            "نعم. نطلب الملف الذي يقدّمه انستقرام لمشغّله، وليس النسخة التي يضيف إليها زر المشاركة الشعار، لذلك لا نحتاج إلى قصّ الصورة أو تمويهها.",
        },
        {
          question: "هل أحتاج إلى حساب انستقرام؟",
          answer:
            "لا. المنشورات العامة تُحلّ دون أي جلسة: لا يُطلب اسم مستخدم ولا كلمة مرور ولا كوكيز. أما الحسابات الخاصة فلا يمكن تنزيلها، وأي أداة تدّعي غير ذلك تستخدم جلسة شخص آخر.",
        },
        {
          question: "ماذا أفعل إذا فشل التنزيل؟",
          answer:
            "تأكّد أولًا أن الفيديو يُعرض في انستقرام دون تسجيل دخول. إن كان يُعرض وظهر الخطأ هنا فانتظر دقيقة وأعد المحاولة، لأن انستقرام يحدّ من الطلبات المجهولة عند الزيادة في الحمل. وإن كان المنشور محذوفًا أو خاصًا فلا يوجد ملف عام لتنزيله.",
        },
        {
          question: "هل تعمل الأداة مع الصور والكاروسيل؟",
          answer:
            "مقاطع الفيديو داخل الكاروسيل تُنزَّل كملف MP4. أما المنشورات التي تحتوي صورًا فقط فلا تحمل أي فيديو، وتقول الأداة ذلك بوضوح بدلًا من تسليم ملف فارغ.",
        },
        {
          question: "هل تُحفظ روابطي أو فيديوهاتي عندكم؟",
          answer:
            "لا. يُعالَج الرابط في الذاكرة ثم يُهمَل، ويجري التنزيل من خوادم انستقرام إلى جهازك مباشرة. لا سجل ولا نسخة على الخادم ولا حساب لإنشائه.",
        },
      ],
      cta: {
        heading: "احفظ ريلك القادم بالجودة الأصلية",
        body: "بلا حساب وبلا تطبيق وبلا علامة مائية — الملف كما نشره صاحبه.",
        button: "العودة إلى الأداة",
      },
      otherToolsHeading: "أدوات أخرى حسب المنصة",
      footerNote: "هذه الصفحة بالعربية وتعمل بالطريقة نفسها في كل الدول.",
    },

    youtube: {
      code: "ar",
      htmlLang: "ar",
      dir: "rtl",
      title: "تنزيل فيديوهات يوتيوب MP4 بجودة HD أو MP3",
      description:
        "الصق رابط يوتيوب ونزّل الفيديو بصيغة MP4 حتى 1080p أو الصوت MP3. يدعم watch وShorts وyoutu.be وقوائم التشغيل، بلا تطبيق وبلا تسجيل.",
      keywords: [
        "تنزيل فيديوهات يوتيوب",
        "تحميل فيديو من يوتيوب",
        "تحويل يوتيوب الى mp3",
        "تنزيل يوتيوب mp3",
        "تحميل فيديوهات يوتيوب بجودة عالية",
        "تنزيل shorts يوتيوب",
      ],
      eyebrow: "يوتيوب · MP4 وMP3 · بلا تثبيت",
      h1Lead: "نزّل فيديوهات يوتيوب",
      h1Accent: "بصيغة MP4 أو الصوت فقط.",
      lede:
        "الصق رابط الفيديو واختر الجودة الموجودة فعلًا: 1080p إن توفّرت، و720p إن لم تكن، أو MP3 من الصوت الأصلي. يدعم watch وShorts وyoutu.be وروابط قوائم التشغيل من داخل المتصفح.",
      chips: ["MP4 1080p", "MP3 أصلي", "Shorts وyoutu.be"],
      tool: {
        heading: "الصق رابط الفيديو",
        note: "يتعرّف على يوتيوب تلقائيًا، ويقبل أيضًا TikTok وInstagram وFacebook.",
      },
      facts: [
        ["السعر", "مجاني"],
        ["الحساب", "غير مطلوب"],
        ["الجودة", "1080p / 720p"],
        ["الصيغة", "MP4 وMP3"],
      ],
      stepsHeading: "كيف تنزّل فيديو يوتيوب في ثلاث خطوات",
      steps: [
        {
          title: "انسخ رابط الفيديو",
          body: "من تطبيق يوتيوب اضغط «مشاركة» ثم «نسخ الرابط»، ومن الكمبيوتر انسخ العنوان من شريط المتصفح. روابط youtu.be وShorts والروابط التي تحمل معامل قائمة تشغيل تُقبل كما هي دون تنظيف يدوي.",
        },
        {
          title: "تحقّق من الجودة الحقيقية",
          body: "يطلب الخادم النسخ المتاحة ويعرض ما هو موجود فعلًا. لا نختلق 4K غير موجود ولا نكبّر 720p لنسمّيه HD: إن رفع صاحب الفيديو 720p فستحصل على 720p.",
        },
        {
          title: "اختر MP4 أو MP3 واحفظ",
          body: "نزّل الفيديو كاملًا بصورة وصوت، أو استخرج المسار الصوتي بصيغة MP3. يُحفظ الملف باسم الفيديو في مجلد التنزيلات، لا باسم عام.",
        },
      ],
      faqHeading: "أسئلة شائعة",
      faqs: [
        {
          question: "هل يمكن التنزيل بجودة 1080p؟",
          answer:
            "نعم، إذا كان الفيديو منشورًا بهذه الدقة على يوتيوب. تعرض الأداة الدقات المتاحة قبل التنزيل، فلا تنتهي بملف أقل دقة مما توقّعت.",
        },
        {
          question: "كيف أحوّل فيديو يوتيوب إلى MP3؟",
          answer:
            "الصق الرابط واختر خيار الصوت. يُستخرج المسار الأصلي الذي نشره يوتيوب ويُحوَّل إلى MP3 مرة واحدة فقط، دون تسجيل المشغّل ولا إعادة تركيب الصوت. الجودة تتبع الأصل: صوت 128kbps يبقى 128kbps.",
        },
        {
          question: "هل تعمل مع Shorts وyoutu.be؟",
          answer:
            "تعمل مع الاثنين. تُعالَج مقاطع Shorts كأي فيديو عمودي، وتُوسَّع روابط youtu.be القصيرة على الخادم، فلا تحتاج إلى البحث عن العنوان الكامل.",
        },
        {
          question: "هل يمكن تنزيل قائمة تشغيل كاملة؟",
          answer:
            "قائمة التشغيل ليست ملفًا بل قائمة. تفتح الأداة القائمة وتتيح لك تنزيل كل فيديو بالأداة نفسها؛ أما تنزيل مئات الملفات دفعة واحدة فهو أسرع طريق إلى تقييد الطلبات.",
        },
        {
          question: "هل أحتاج إلى تثبيت أي برنامج؟",
          answer:
            "لا. كل شيء يجري في المتصفح، على الهاتف أيضًا: لا برنامج سطح مكتب ولا إضافة ولا ملف APK. على iPhone يُحفظ الملف في «الملفات» ومنه تنقله إلى «الصور».",
        },
      ],
      cta: {
        heading: "احفظ الفيديو أو الصوت فقط",
        body: "اختر الجودة الموجودة فعلًا ونزّل دون تثبيت أي شيء.",
        button: "العودة إلى الأداة",
      },
      otherToolsHeading: "أدوات أخرى حسب المنصة",
      footerNote: "نزّل ما تملكه أو ما لديك إذن بنشره؛ الحقوق تبقى لأصحابها.",
    },

    facebook: {
      code: "ar",
      htmlLang: "ar",
      dir: "rtl",
      title: "تنزيل فيديوهات فيسبوك بجودة HD بدون تطبيق",
      description:
        "نزّل فيديوهات فيسبوك بجودة HD من المتصفح: منشورات الصفحات وWatch وReels وروابط fb.watch. بدون تثبيت وبدون حساب وبدون علامة مائية.",
      keywords: [
        "تحميل فيديو فيسبوك",
        "تنزيل فيديوهات فيسبوك",
        "تنزيل فيديو فيسبوك بدون تطبيق",
        "تحميل ريلز فيسبوك",
        "تنزيل fb.watch",
        "حفظ فيديو من فيسبوك",
      ],
      eyebrow: "فيسبوك · HD · بلا تثبيت",
      h1Lead: "نزّل فيديوهات فيسبوك",
      h1Accent: "بجودة HD وبدون تطبيق.",
      lede:
        "الصق رابط الفيديو واحفظ ملف MP4 بصوته. تعمل منشورات الصفحات وفيديوهات Watch وReels وروابط fb.watch القصيرة، التي تُوسَّع على الخادم قبل البحث عن الملف.",
      chips: ["HD أولًا", "يدعم fb.watch", "فيديوهات طويلة"],
      tool: {
        heading: "الصق رابط الفيديو",
        note: "يتعرّف على فيسبوك تلقائيًا، ويقبل أيضًا TikTok وInstagram وYouTube.",
      },
      facts: [
        ["السعر", "مجاني"],
        ["الحساب", "غير مطلوب"],
        ["الجودة", "HD أو SD حقيقية"],
        ["الحجم", "بلا حد أقصى"],
      ],
      stepsHeading: "كيف تنزّل فيديو فيسبوك في ثلاث خطوات",
      steps: [
        {
          title: "انسخ رابط الفيديو",
          body: "اضغط «مشاركة» أسفل الفيديو ثم «نسخ الرابط». تُقبل روابط المنشور و/watch/ و/reel/ والصيغة القصيرة fb.watch/. أما الفيديوهات الخاصة وفيديوهات المجموعات المغلقة فلا يمكن حلها لعدم وجود ملف عام.",
        },
        {
          title: "اترك الخادم يتبع التحويلات",
          body: "رابط fb.watch لا يحتوي معرّف الفيديو، فهو مختصر ينتقل إلى المنشور الحقيقي. يتبع الخادم سلسلة التحويلات كلها حتى العنوان الأصلي، ثم يطلب النسخة الأعلى جودة ويتأكد من احتوائها على صورة وصوت.",
        },
        {
          title: "اختر HD واحفظ",
          body: "إذا قدّم فيسبوك نسخة HD فستحصل عليها، وإذا لم توجد فستحصل على أفضل SD متاحة، مع بيان ما وصلك في لوحة النتيجة. أما فيديوهات Watch الطويلة فتُبثّ دون تخزين مؤقت على الخادم، لذلك يُنزَّل ملف يتجاوز غيغابايت كما يُنزَّل مقطع قصير.",
        },
      ],
      faqHeading: "أسئلة شائعة",
      faqs: [
        {
          question: "هل يجب تثبيت تطبيق أو إضافة؟",
          answer:
            "لا. التنزيل يجري في المتصفح على iPhone وAndroid وWindows وMac. لا ملف APK ولا إضافة ولا أذونات تمنحها، وهذا الفرق الأساسي عن المواقع التي تطلب تثبيت شيء قبل أن تعرض الملف.",
        },
        {
          question: "هل تعمل روابط fb.watch؟",
          answer:
            "نعم. هو رابط مختصر وليس عنوان الفيديو، لذلك تُتبع سلسلة التحويلات على الخادم حتى الوصول إلى المنشور الحقيقي. ولهذا يعمل هنا رابط تعتبره أدوات أخرى غير صالح.",
        },
        {
          question: "لماذا يُنزَّل أحيانًا بجودة SD؟",
          answer:
            "لأن فيسبوك لم ينشر نسخة HD لذلك الفيديو. نطلب HD أولًا ثم نعود إلى أفضل SD متاحة، وتوضّح اللوحة ما تم تسليمه بدلًا من تسمية 360p بوصفها HD.",
        },
        {
          question: "هل يمكن تنزيل فيديوهات خاصة أو خاصة بمجموعة؟",
          answer:
            "لا. تحتاج إلى جلسة مصرّح لها بالمشاهدة، وهذه الأداة لا تطلب بيانات فيسبوك أبدًا. أما منشورات الصفحات العامة وWatch وReels العامة فتعمل.",
        },
        {
          question: "هل يحمل الملف علامة مائية؟",
          answer:
            "لا. ملفات فيسبوك لا تحمل أي علامة، ولا نعيد ترميزها هنا، لذلك يكون MP4 مطابقًا لما يعرضه مشغّله بالدقة والصوت الأصليين.",
        },
      ],
      cta: {
        heading: "احفظ الفيديو قبل أن يُحذف",
        body: "بلا حساب وبلا تثبيت وبلا حد للحجم.",
        button: "العودة إلى الأداة",
      },
      otherToolsHeading: "أدوات أخرى حسب المنصة",
      footerNote: "الفيديوهات الخاصة وفيديوهات المجموعات المغلقة مستبعدة بحكم التصميم: لا يوجد ملف عام لتنزيله.",
    },
  },
};

/** Locales that carry platform pages at all (every one of them does all three). */
export function hasPlatformLanding(locale: string): boolean {
  return (PLATFORM_LOCALES as readonly string[]).includes(locale);
}

/**
 * Path for a platform page in a given locale, or `null` when that locale has no
 * page for it. English resolves to the existing tool page.
 */
export function platformPath(
  locale: LocaleCode | "en",
  platform: LocalizedPlatform,
): string | null {
  const slug = LOCALIZED_PLATFORM_SLUGS[platform];
  if (locale === "en") return `/${slug}`;
  return hasPlatformLanding(locale) ? `/${locale}/${slug}` : null;
}

/** The hreflang cluster for one platform: English plus every localized page. */
export function platformLanguageAlternates(platform: LocalizedPlatform) {
  const slug = LOCALIZED_PLATFORM_SLUGS[platform];
  return {
    en: `/${slug}`,
    es: `/es/${slug}`,
    ar: `/ar/${slug}`,
    "x-default": `/${slug}`,
  } as const;
}

export function getPlatformLanding(
  locale: string,
  slug: string,
): { platform: LocalizedPlatform; copy: LandingCopy } | null {
  if (!hasPlatformLanding(locale)) return null;
  const entry = (Object.keys(LOCALIZED_PLATFORM_SLUGS) as LocalizedPlatform[]).find(
    (platform) => LOCALIZED_PLATFORM_SLUGS[platform] === slug,
  );
  if (!entry) return null;
  return {
    platform: entry,
    copy: PLATFORM_LANDINGS[locale as PlatformLocale][entry],
  };
}

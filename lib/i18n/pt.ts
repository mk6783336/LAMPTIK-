import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Brazilian Portuguese landing page (`/pt`).
 *
 * Written in pt-BR — the variant that carries the volume in Brazil and reads
 * naturally in Portugal too. "Vídeo" (not "video"), "celular" for phone, and
 * "marca d'água" as the search demand spells it.
 */
export const pt: LandingCopy = {
  code: "pt",
  htmlLang: "pt-BR",
  dir: "ltr",
  title: "Baixar vídeo do TikTok sem marca d'água — HD",
  description:
    "Baixe vídeos do TikTok sem marca d'água, Reels do Instagram, vídeos do Facebook e YouTube em MP4 HD ou MP3. Grátis, sem app e sem cadastro.",
  keywords: [
    "baixar vídeo do tiktok sem marca d'água",
    "baixar reels do instagram",
    "baixar vídeo do facebook",
    "youtube para mp3",
    "baixar vídeo tiktok hd",
    "baixar vídeos sem marca d'água",
  ],
  eyebrow: "Grátis · Sem marca d'água · Sem instalar nada",
  h1Lead: "Baixe vídeos do TikTok",
  h1Accent: "sem marca d'água, em HD.",
  lede:
    "Cole o link e salve o arquivo original em MP4 HD ou MP3. Também funciona com Reels do Instagram, vídeos do Facebook e YouTube.",
  chips: ["TikTok, Reels, Facebook e YouTube", "MP4 1080p e MP3", "Sem conta e sem app"],
  tool: {
    heading: "Cole o link e baixe",
    note:
      "O botão de download aparece assim que o servidor confere o arquivo original. Nada fica salvo nos nossos servidores.",
  },
  facts: [
    ["Preço", "Grátis"],
    ["Conta", "Não precisa"],
    ["Qualidade máxima", "1080p HD"],
    ["Formatos", "MP4 e MP3"],
  ],
  stepsHeading: "Como baixar um vídeo em três passos",
  steps: [
    {
      title: "Copie o link do vídeo",
      body:
        "No TikTok, toque em Compartilhar → Copiar link. No Instagram, no Facebook ou no YouTube, use o mesmo menu Compartilhar. Links curtos como vt.tiktok.com e youtu.be também funcionam.",
    },
    {
      title: "Cole no campo acima",
      body:
        "O campo lê a área de transferência com um toque. A plataforma é detectada sozinha, então você não precisa escolher nada antes de colar.",
    },
    {
      title: "Escolha MP4 HD ou MP3 e salve",
      body:
        "Toque em Baixar HD MP4 para o vídeo completo ou em Baixar MP3 para o áudio original. O arquivo é salvo com o título real na galeria ou na pasta Downloads do celular.",
    },
  ],
  faqHeading: "Perguntas frequentes",
  faqs: [
    {
      question: "Como baixar um vídeo do TikTok sem marca d'água?",
      answer:
        "Copie o link do vídeo no TikTok, cole no campo acima e toque em Baixar HD MP4. Pedimos a versão original que o TikTok guarda na CDN dele, e não a cópia com logotipo que o menu Compartilhar gera — por isso o arquivo chega limpo e sem cortes.",
    },
    {
      question: "Meus links ou meus vídeos ficam salvos?",
      answer:
        "Não. O link é processado em memória só para localizar o arquivo e depois é descartado: não criamos histórico, não guardamos cópia do vídeo e não pedimos conta. O download vai da CDN direto para o seu aparelho.",
    },
    {
      question: "Funciona no iPhone e no Android pelo navegador?",
      answer:
        "Sim. Funciona no Safari do iPhone e do iPad, no Chrome do Android e em qualquer navegador de computador. No iPhone o arquivo vai para o app Arquivos; de lá você pode movê-lo para Fotos.",
    },
    {
      question: "Preciso instalar um app ou fazer cadastro?",
      answer:
        "Não. Tudo acontece no navegador, sem cadastro, sem limite de downloads e sem versão paga. O app para Android é opcional e só acrescenta downloads em segundo plano e um atalho no menu Compartilhar.",
    },
  ],
  cta: {
    heading: "Salve seu próximo vídeo em HD.",
    body:
      "Sem conta, sem app e sem armazenamento: apenas o arquivo original, no seu aparelho.",
    button: "Abrir o baixador",
  },
  otherToolsHeading: "Mais ferramentas por plataforma",
  footerNote:
    "Esta página está em português; as ferramentas abaixo estão em inglês e funcionam igual em qualquer país.",
};

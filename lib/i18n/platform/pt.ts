import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Brazilian Portuguese platform landings.
 *
 * `htmlLang` is `pt-BR`, matching the `/pt` root landing: a bare `pt` against a
 * Brazilian document is the hreflang/HTML-language mismatch the audit already
 * flagged once. Vocabulary follows Brazilian usage — "baixar" over "descarregar",
 * "celular" over "telemóvel".
 */
export const pt: Record<"instagram" | "youtube" | "facebook", LandingCopy> = {
  instagram: {
    code: "pt",
    htmlLang: "pt-BR",
    dir: "ltr",
    title: "Baixar Reels do Instagram em HD — sem marca d'água",
    description:
      "Baixe Reels do Instagram na qualidade original 1080p, com áudio, sem marca d'água e sem fazer login. Grátis, pelo navegador do celular ou do computador.",
    keywords: [
      "baixar reels do instagram",
      "baixar video do instagram",
      "salvar reels no celular",
      "reels sem marca d'agua",
      "baixar reels em hd",
      "instagram reels download",
    ],
    eyebrow: "Instagram Reels · grátis · sem conta",
    h1Lead: "Baixar Reels do Instagram",
    h1Accent: "em HD e sem marca d'água.",
    lede:
      "Cole o link do Reel e salve o MP4 que o próprio Instagram entrega, com o áudio sincronizado. Aceita links /reel/, /reels/, /p/, /tv/ e instagr.am, sem conta e sem aplicativo.",
    chips: ["Qualidade original", "Áudio incluído", "Sem login"],
    tool: {
      heading: "Cole o link do Reel",
      note: "O Instagram é detectado sozinho — TikTok, Facebook e YouTube também funcionam.",
    },
    facts: [
      ["Preço", "Grátis"],
      ["Conta", "Não precisa"],
      ["Qualidade", "1080 × 1920"],
      ["Formato", "MP4 com áudio"],
    ],
    stepsHeading: "Como baixar um Reel em três passos",
    steps: [
      {
        title: "Copie o link do Reel",
        body: "No Reel, toque nos três pontos e escolha Copiar link. O endereço da barra do navegador também funciona. Evite o botão de salvar do aplicativo: essa cópia leva marca d'água e a interface sobreposta.",
      },
      {
        title: "Cole no campo acima",
        body: "O servidor lê a publicação pública, verifica as versões de vídeo oferecidas e pega o MP4 progressivo de maior bitrate — nele a imagem e o som já estão no mesmo arquivo.",
      },
      {
        title: "Salve o MP4",
        body: "Toque em Baixar HD MP4. No Android o arquivo vai para Downloads; no iPhone fica em Arquivos, e de lá você move para Fotos com Compartilhar → Salvar vídeo. A qualidade é a do original.",
      },
    ],
    faqHeading: "Perguntas frequentes",
    faqs: [
      {
        question: "O Reel vem com marca d'água?",
        answer:
          "Não. Pedimos o arquivo que o Instagram serve ao próprio player, não a cópia gerada pelo menu de compartilhar. Como o original não tem nenhuma camada por cima, não é preciso cortar nem borrar nada.",
      },
      {
        question: "Preciso de conta no Instagram?",
        answer:
          "Não. Publicações públicas são resolvidas sem sessão: sem usuário, senha ou cookies. Perfis privados não podem ser baixados, e quem promete isso está usando a sessão de outra pessoa.",
      },
      {
        question: "O que fazer se o download falhar?",
        answer:
          "Confira se o vídeo abre no Instagram sem login. Se abre lá e falha aqui, espere um minuto e tente de novo: o Instagram limita pedidos anônimos em horário de pico. Publicações apagadas ou privadas não têm arquivo público.",
      },
      {
        question: "Funciona com fotos e carrosséis?",
        answer:
          "Vídeos dentro de um carrossel são baixados como MP4. Publicações só com fotos não têm vídeo, e a página avisa em vez de entregar um arquivo vazio.",
      },
    ],
    cta: {
      heading: "Guarde o próximo Reel na qualidade original",
      body: "Sem conta, sem aplicativo e sem marca d'água — só o arquivo de quem publicou.",
      button: "Abrir o baixador",
    },
    otherToolsHeading: "Mais ferramentas por plataforma",
    footerNote: "Esta página está em português do Brasil e funciona igual em qualquer país.",
  },

  youtube: {
    code: "pt",
    htmlLang: "pt-BR",
    dir: "ltr",
    title: "Baixar vídeos do YouTube em MP4 HD ou MP3",
    description:
      "Cole o link do YouTube e baixe o vídeo em MP4 até 1080p ou só o áudio em MP3. Funciona com watch, Shorts, youtu.be e playlists, sem app e sem cadastro.",
    keywords: [
      "baixar videos do youtube",
      "youtube para mp3",
      "baixar musica do youtube",
      "baixar video do youtube em hd",
      "baixar shorts do youtube",
      "converter youtube em mp3",
    ],
    eyebrow: "YouTube · MP4 e MP3 · sem instalar nada",
    h1Lead: "Baixar vídeos do YouTube",
    h1Accent: "em MP4 HD ou só o áudio.",
    lede:
      "Cole o link e escolha a qualidade que existe de verdade: 1080p quando disponível, 720p quando não, ou MP3 do áudio original. Aceita watch, Shorts, youtu.be e links de playlist.",
    chips: ["MP4 1080p", "MP3 original", "Shorts e youtu.be"],
    tool: {
      heading: "Cole o link do vídeo",
      note: "O YouTube é detectado sozinho — TikTok, Instagram e Facebook também.",
    },
    facts: [
      ["Preço", "Grátis"],
      ["Conta", "Não precisa"],
      ["Qualidade", "1080p / 720p"],
      ["Formatos", "MP4 e MP3"],
    ],
    stepsHeading: "Como baixar um vídeo do YouTube em três passos",
    steps: [
      {
        title: "Copie o link do vídeo",
        body: "No aplicativo, toque em Compartilhar → Copiar link; no computador, copie o endereço da barra do navegador. Links youtu.be, de Shorts e com parâmetro de playlist são aceitos como estão.",
      },
      {
        title: "Confira a qualidade real",
        body: "O servidor consulta as versões disponíveis e mostra o que existe. Não inventamos um 4K que o vídeo não tem nem aumentamos um 720p para chamá-lo de HD.",
      },
      {
        title: "Escolha MP4 ou MP3",
        body: "Baixe o vídeo completo com imagem e som, ou extraia só a faixa de áudio em MP3. O arquivo é salvo com o título do vídeo, não com um nome genérico.",
      },
    ],
    faqHeading: "Perguntas frequentes",
    faqs: [
      {
        question: "Dá para baixar em 1080p?",
        answer:
          "Sim, se o YouTube tiver essa resolução para o vídeo. A página mostra as opções antes do download, então você não termina com um arquivo de menos pixels do que esperava.",
      },
      {
        question: "Como transformar o vídeo em MP3?",
        answer:
          "Cole o link e escolha a opção de áudio. A faixa publicada pelo YouTube é convertida uma única vez para MP3; nada é gravado do player. A qualidade segue o original: um áudio de 128 kbps continua 128 kbps.",
      },
      {
        question: "Funciona com Shorts e youtu.be?",
        answer:
          "Com os dois. Shorts são resolvidos como qualquer vídeo vertical e links curtos youtu.be são expandidos no servidor.",
      },
      {
        question: "Posso baixar uma playlist inteira?",
        answer:
          "Uma playlist é uma lista, não um arquivo. A página abre a lista e você baixa vídeo por vídeo com o mesmo baixador; centenas de uma vez é o caminho mais rápido para ser limitado.",
      },
    ],
    cta: {
      heading: "Guarde o vídeo ou só o áudio",
      body: "Escolha a qualidade que existe de verdade, sem instalar nada.",
      button: "Abrir o baixador",
    },
    otherToolsHeading: "Mais ferramentas por plataforma",
    footerNote: "Baixe apenas conteúdo próprio ou autorizado; os direitos continuam sendo do autor.",
  },

  facebook: {
    code: "pt",
    htmlLang: "pt-BR",
    dir: "ltr",
    title: "Baixar vídeos do Facebook em HD — sem aplicativo",
    description:
      "Baixe vídeos do Facebook em HD pelo navegador: posts de páginas, Watch, Reels e links fb.watch. Sem instalar nada, sem conta e sem marca d'água.",
    keywords: [
      "baixar videos do facebook",
      "baixar video do facebook sem app",
      "salvar video do facebook",
      "baixar reels do facebook",
      "fb.watch baixar",
      "facebook video download",
    ],
    eyebrow: "Facebook · HD · sem instalar nada",
    h1Lead: "Baixar vídeos do Facebook",
    h1Accent: "em HD, sem aplicativo.",
    lede:
      "Cole o link e salve o MP4 com áudio. Funciona com posts de páginas, vídeos do Watch, Reels e links curtos fb.watch, que são expandidos no servidor antes da busca pelo arquivo.",
    chips: ["HD primeiro", "fb.watch incluído", "Vídeos longos"],
    tool: {
      heading: "Cole o link do vídeo",
      note: "O Facebook é detectado sozinho — TikTok, Instagram e YouTube também.",
    },
    facts: [
      ["Preço", "Grátis"],
      ["Conta", "Não precisa"],
      ["Qualidade", "HD ou SD real"],
      ["Limite", "Sem tamanho máximo"],
    ],
    stepsHeading: "Como baixar um vídeo do Facebook em três passos",
    steps: [
      {
        title: "Copie o link do vídeo",
        body: "Toque em Compartilhar abaixo do vídeo e escolha Copiar link. Valem a URL do post, /watch/, /reel/ e a forma curta fb.watch/. Vídeos privados e de grupos fechados não têm arquivo público.",
      },
      {
        title: "Deixe o servidor seguir o redirecionamento",
        body: "O fb.watch não contém o identificador do vídeo: é um encurtador que salta para o post real. O servidor segue toda a cadeia até a URL canônica e só então verifica se o arquivo tem imagem e som.",
      },
      {
        title: "Escolha HD e salve",
        body: "Se o Facebook oferecer uma versão HD, ela é servida; se não, a melhor SD, e o painel diz qual chegou. Vídeos longos do Watch são transmitidos sem buffer no servidor, então um arquivo de 1 GB baixa como um clipe curto.",
      },
    ],
    faqHeading: "Perguntas frequentes",
    faqs: [
      {
        question: "Preciso instalar aplicativo ou extensão?",
        answer:
          "Não. Tudo acontece no navegador, no iPhone, Android, Windows ou Mac: sem APK, sem extensão e sem permissões. É a diferença principal em relação a sites que pedem instalação antes de mostrar o arquivo.",
      },
      {
        question: "Links fb.watch funcionam?",
        answer:
          "Sim. É um encurtador, não o endereço do vídeo, então a cadeia de redirecionamentos é seguida no servidor até o post real. Por isso um link que outras ferramentas chamam de inválido funciona aqui.",
      },
      {
        question: "Por que às vezes baixa em SD?",
        answer:
          "Porque o Facebook não publicou versão HD para aquele vídeo. Pedimos HD primeiro e caímos para a melhor SD, informando no painel o que foi entregue em vez de chamar 360p de HD.",
      },
      {
        question: "Dá para baixar vídeos privados ou de grupos?",
        answer:
          "Não. Eles exigem uma sessão com permissão de visualização, e esta ferramenta nunca pede credenciais do Facebook. Posts públicos de páginas, Watch e Reels públicos funcionam.",
      },
    ],
    cta: {
      heading: "Guarde o vídeo antes que ele saia do ar",
      body: "Sem conta, sem instalação e sem limite de tamanho.",
      button: "Abrir o baixador",
    },
    otherToolsHeading: "Mais ferramentas por plataforma",
    footerNote: "Vídeos privados e de grupos fechados ficam de fora por princípio: não existe arquivo público.",
  },
};

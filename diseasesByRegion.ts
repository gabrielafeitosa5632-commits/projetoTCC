// data/diseasesByRegion.ts
// Incidência de doenças fitopatológicas por estado brasileiro
// Fonte: adaptado de dados da Embrapa e literatura fitopatológica

export interface Disease {
  id: string;
  name: string;
  pathogen: string;
  crop: string;
  severity: "alta" | "média" | "baixa";
  season: string; // época de maior ocorrência
  description: string;
}

export interface RegionDiseaseData {
  stateCode: string;
  state: string;
  region: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";
  mainCrops: string[];
  topDiseases: Disease[];
}

export const BRAZIL_REGIONS: RegionDiseaseData[] = [
  // ═══════════════ NORTE ═══════════════
  {
    stateCode: "AM",
    state: "Amazonas",
    region: "Norte",
    mainCrops: ["Mandioca", "Guaraná", "Açaí", "Cupuaçu"],
    topDiseases: [
      {
        id: "am-1",
        name: "Podridão Radicular da Mandioca",
        pathogen: "Phytophthora drechsleri",
        crop: "Mandioca",
        severity: "alta",
        season: "Jan–Abr (chuvas intensas)",
        description: "Causa apodrecimento das raízes com perda total da produção em solos encharcados.",
      },
      {
        id: "am-2",
        name: "Antracnose do Guaraná",
        pathogen: "Colletotrichum gloeosporioides",
        crop: "Guaraná",
        severity: "alta",
        season: "Nov–Mar",
        description: "Principal doença do guaraná na Amazônia. Lesões necróticas em frutos e folhas jovens.",
      },
      {
        id: "am-3",
        name: "Vassoura-de-Bruxa do Cupuaçu",
        pathogen: "Moniliophthora perniciosa",
        crop: "Cupuaçu",
        severity: "alta",
        season: "Ano inteiro",
        description: "Provoca brotações hipertrofiadas e impede frutificação. Devastadora em plantios adensados.",
      },
    ],
  },
  {
    stateCode: "PA",
    state: "Pará",
    region: "Norte",
    mainCrops: ["Soja", "Açaí", "Dendê", "Pimenta-do-reino"],
    topDiseases: [
      {
        id: "pa-1",
        name: "Fusariose da Pimenta-do-reino",
        pathogen: "Fusarium solani f. sp. piperis",
        crop: "Pimenta-do-reino",
        severity: "alta",
        season: "Fev–Jun",
        description: "Doença mais destrutiva da cultura. Murcha e morte da planta em semanas.",
      },
      {
        id: "pa-2",
        name: "Requeima da Soja",
        pathogen: "Phytophthora sojae",
        crop: "Soja",
        severity: "média",
        season: "Jan–Mar",
        description: "Favorecida pelo excesso de umidade. Causa tombamento de plântulas e podridão de raiz.",
      },
      {
        id: "pa-3",
        name: "Podridão-seca do Dendezeiro",
        pathogen: "Ganoderma boninense",
        crop: "Dendê",
        severity: "alta",
        season: "Ano inteiro",
        description: "Podridão do estipe, sem cura conhecida. Monitoramento preventivo essencial.",
      },
    ],
  },
  {
    stateCode: "TO",
    state: "Tocantins",
    region: "Norte",
    mainCrops: ["Soja", "Milho", "Arroz", "Cana-de-açúcar"],
    topDiseases: [
      {
        id: "to-1",
        name: "Ferrugem Asiática da Soja",
        pathogen: "Phakopsora pachyrhizi",
        crop: "Soja",
        severity: "alta",
        season: "Jan–Mar",
        description: "Pústulas alaranjadas nas folhas. Pode causar desfolha precoce e perdas de até 80%.",
      },
      {
        id: "to-2",
        name: "Cercosporiose do Milho",
        pathogen: "Cercospora zeae-maydis",
        crop: "Milho",
        severity: "média",
        season: "Fev–Abr",
        description: "Manchas retangulares nas folhas, paralelas às nervuras. Favorecida por alta umidade.",
      },
    ],
  },
  // ═══════════════ NORDESTE ═══════════════
  {
    stateCode: "BA",
    state: "Bahia",
    region: "Nordeste",
    mainCrops: ["Cacau", "Soja", "Algodão", "Sisal"],
    topDiseases: [
      {
        id: "ba-1",
        name: "Vassoura-de-Bruxa do Cacaueiro",
        pathogen: "Moniliophthora perniciosa",
        crop: "Cacau",
        severity: "alta",
        season: "Abr–Jul",
        description: "Maior causa de colapso da cacauicultura baiana nos anos 90. Controle por variedades resistentes.",
      },
      {
        id: "ba-2",
        name: "Ramulária do Algodão",
        pathogen: "Ramulariopsis pseudoglycines",
        crop: "Algodão",
        severity: "alta",
        season: "Fev–Mai",
        description: "Manchas angulares brancas nas folhas. Causa desfolha prematura e reduz qualidade da fibra.",
      },
      {
        id: "ba-3",
        name: "Podridão de Esclerotínia",
        pathogen: "Sclerotinia sclerotiorum",
        crop: "Soja",
        severity: "média",
        season: "Jun–Ago",
        description: "Lesões aquosas no caule com micélio branco. Favorecida por temperaturas mais baixas no oeste baiano.",
      },
    ],
  },
  {
    stateCode: "PE",
    state: "Pernambuco",
    region: "Nordeste",
    mainCrops: ["Cana-de-açúcar", "Tomate", "Melão", "Feijão"],
    topDiseases: [
      {
        id: "pe-1",
        name: "Carvão da Cana-de-açúcar",
        pathogen: "Sporisorium scitamineum",
        crop: "Cana-de-açúcar",
        severity: "alta",
        season: "Out–Dez",
        description: "Chicote negro característico no ápice. Planta perde vigor e não produz colmos aproveitáveis.",
      },
      {
        id: "pe-2",
        name: "Requeima do Tomate",
        pathogen: "Phytophthora infestans",
        crop: "Tomate",
        severity: "alta",
        season: "Abr–Jul",
        description: "Lesões aquosas em frutos e folhas. Em condições úmidas pode destruir lavoura em dias.",
      },
    ],
  },
  {
    stateCode: "CE",
    state: "Ceará",
    region: "Nordeste",
    mainCrops: ["Melão", "Cajueiro", "Feijão-caupi", "Mandioca"],
    topDiseases: [
      {
        id: "ce-1",
        name: "Oídio do Cajueiro",
        pathogen: "Erysiphe quercicola",
        crop: "Cajueiro",
        severity: "média",
        season: "Jul–Set (seco)",
        description: "Pó branco nas folhas e inflorescências. Favorecido por clima seco com orvalho noturno.",
      },
      {
        id: "ce-2",
        name: "Antracnose do Melão",
        pathogen: "Colletotrichum orbiculare",
        crop: "Melão",
        severity: "alta",
        season: "Ano inteiro",
        description: "Lesões circulares em frutos e folhas. Principal limitação sanitária do melão no Nordeste.",
      },
    ],
  },
  // ═══════════════ CENTRO-OESTE ═══════════════
  {
    stateCode: "MT",
    state: "Mato Grosso",
    region: "Centro-Oeste",
    mainCrops: ["Soja", "Milho", "Algodão", "Sorgo"],
    topDiseases: [
      {
        id: "mt-1",
        name: "Ferrugem Asiática da Soja",
        pathogen: "Phakopsora pachyrhizi",
        crop: "Soja",
        severity: "alta",
        season: "Dez–Mar",
        description: "Principal doença da soja no Brasil. MT é epicentro nacional, exige monitoramento intensivo.",
      },
      {
        id: "mt-2",
        name: "Mancha-alvo da Soja",
        pathogen: "Corynespora cassiicola",
        crop: "Soja",
        severity: "alta",
        season: "Jan–Mar",
        description: "Manchas concêntricas nas folhas com halo amarelo. Frequente em lavouras com alta umidade.",
      },
      {
        id: "mt-3",
        name: "Ramulária do Algodão",
        pathogen: "Ramulariopsis pseudoglycines",
        crop: "Algodão",
        severity: "alta",
        season: "Mar–Mai",
        description: "Epidemia frequente no final do ciclo. MT concentra os maiores danos nacionais.",
      },
    ],
  },
  {
    stateCode: "GO",
    state: "Goiás",
    region: "Centro-Oeste",
    mainCrops: ["Soja", "Milho", "Cana-de-açúcar", "Tomate Industrial"],
    topDiseases: [
      {
        id: "go-1",
        name: "Podridão Branca do Caule",
        pathogen: "Sclerotinia sclerotiorum",
        crop: "Soja",
        severity: "alta",
        season: "Mai–Jul",
        description: "Micélio branco e esclerócios pretos no caule. Persiste no solo por muitos anos.",
      },
      {
        id: "go-2",
        name: "Cercosporiose do Milho",
        pathogen: "Cercospora zeae-maydis",
        crop: "Milho",
        severity: "média",
        season: "Fev–Abr",
        description: "Manchas foliares elongadas. Aumenta com o plantio de milho safrinha após soja.",
      },
    ],
  },
  {
    stateCode: "MS",
    state: "Mato Grosso do Sul",
    region: "Centro-Oeste",
    mainCrops: ["Soja", "Milho", "Cana-de-açúcar", "Trigo"],
    topDiseases: [
      {
        id: "ms-1",
        name: "Ferrugem da Folha do Trigo",
        pathogen: "Puccinia triticina",
        crop: "Trigo",
        severity: "alta",
        season: "Jun–Ago",
        description: "Pústulas alaranjadas nas folhas. Pode reduzir produção em 40% sem controle.",
      },
      {
        id: "ms-2",
        name: "Ferrugem Asiática da Soja",
        pathogen: "Phakopsora pachyrhizi",
        crop: "Soja",
        severity: "alta",
        season: "Dez–Mar",
        description: "Alta pressão de inóculo vindo do norte. Aplicações preventivas obrigatórias.",
      },
    ],
  },
  // ═══════════════ SUDESTE ═══════════════
  {
    stateCode: "SP",
    state: "São Paulo",
    region: "Sudeste",
    mainCrops: ["Cana-de-açúcar", "Citros", "Café", "Tomate"],
    topDiseases: [
      {
        id: "sp-1",
        name: "Clorose Variegada dos Citros (CVC)",
        pathogen: "Xylella fastidiosa",
        crop: "Citros",
        severity: "alta",
        season: "Ano inteiro",
        description: "Doença sistêmica sem cura. Frutos pequenos e duros. Vetorada por cigarrinhas.",
      },
      {
        id: "sp-2",
        name: "Ferrugem do Café",
        pathogen: "Hemileia vastatrix",
        crop: "Café",
        severity: "alta",
        season: "Mar–Jun",
        description: "Pó alaranjado na face inferior das folhas. Causa desfolha intensa e perda de produção.",
      },
      {
        id: "sp-3",
        name: "Podridão Vermelha da Cana",
        pathogen: "Glomerella tucumanensis",
        crop: "Cana-de-açúcar",
        severity: "média",
        season: "Jun–Set",
        description: "Tecido interno com manchas vermelhas e odor de vinagre. Afeta qualidade do caldo.",
      },
    ],
  },
  {
    stateCode: "MG",
    state: "Minas Gerais",
    region: "Sudeste",
    mainCrops: ["Café", "Soja", "Milho", "Hortaliças"],
    topDiseases: [
      {
        id: "mg-1",
        name: "Ferrugem do Café",
        pathogen: "Hemileia vastatrix",
        crop: "Café",
        severity: "alta",
        season: "Fev–Mai",
        description: "Principal doença do café em MG. Monitoramento semanal recomendado na safra.",
      },
      {
        id: "mg-2",
        name: "Cercosporiose do Café",
        pathogen: "Cercospora coffeicola",
        crop: "Café",
        severity: "média",
        season: "Out–Jan",
        description: "Mancha olho-pardo nas folhas e frutos. Favorecida por déficit nutricional.",
      },
      {
        id: "mg-3",
        name: "Podridão de Esclerotínia na Soja",
        pathogen: "Sclerotinia sclerotiorum",
        crop: "Soja",
        severity: "média",
        season: "Mai–Jul",
        description: "Frequente no Sul de MG onde temperaturas são mais amenas.",
      },
    ],
  },
  {
    stateCode: "RJ",
    state: "Rio de Janeiro",
    region: "Sudeste",
    mainCrops: ["Banana", "Cana-de-açúcar", "Citros", "Hortaliças"],
    topDiseases: [
      {
        id: "rj-1",
        name: "Sigatoka Negra da Banana",
        pathogen: "Mycosphaerella fijiensis",
        crop: "Banana",
        severity: "alta",
        season: "Nov–Mar",
        description: "Estrias negras nas folhas evoluindo para necrose. Pode desfolhar completamente.",
      },
      {
        id: "rj-2",
        name: "Antracnose da Manga",
        pathogen: "Colletotrichum gloeosporioides",
        crop: "Manga",
        severity: "média",
        season: "Out–Jan",
        description: "Manchas escuras em flores e frutos. Principal limitação na pré-colheita.",
      },
    ],
  },
  {
    stateCode: "ES",
    state: "Espírito Santo",
    region: "Sudeste",
    mainCrops: ["Café Conilon", "Mamão", "Banana", "Cacau"],
    topDiseases: [
      {
        id: "es-1",
        name: "Ferrugem do Café Conilon",
        pathogen: "Hemileia vastatrix",
        crop: "Café Conilon",
        severity: "alta",
        season: "Mar–Jun",
        description: "ES é maior produtor de Conilon. Ferrugem é desafio constante nas lavouras irrigadas.",
      },
      {
        id: "es-2",
        name: "Meleira do Mamoeiro",
        pathogen: "Papaya meleira virus (PMeV)",
        crop: "Mamão",
        severity: "alta",
        season: "Ano inteiro",
        description: "Exsudação de látex aquoso nos frutos. Doença viral sem controle químico.",
      },
    ],
  },
  // ═══════════════ SUL ═══════════════
  {
    stateCode: "RS",
    state: "Rio Grande do Sul",
    region: "Sul",
    mainCrops: ["Soja", "Trigo", "Arroz", "Uva"],
    topDiseases: [
      {
        id: "rs-1",
        name: "Brusone do Trigo",
        pathogen: "Magnaporthe oryzae Triticum",
        crop: "Trigo",
        severity: "alta",
        season: "Set–Nov",
        description: "Espigas esbranquiçadas com grãos chochos. Emergiu no RS com grande impacto econômico.",
      },
      {
        id: "rs-2",
        name: "Míldio da Videira",
        pathogen: "Plasmopara viticola",
        crop: "Uva",
        severity: "alta",
        season: "Out–Jan",
        description: "Manchas oleosas nas folhas com mofo branco. Principal doença da vitivinicultura gaúcha.",
      },
      {
        id: "rs-3",
        name: "Brusone do Arroz",
        pathogen: "Magnaporthe oryzae",
        crop: "Arroz",
        severity: "alta",
        season: "Nov–Fev",
        description: "Lesões em folhas, colmos e panículas. RS é o maior produtor de arroz irrigado do Brasil.",
      },
    ],
  },
  {
    stateCode: "SC",
    state: "Santa Catarina",
    region: "Sul",
    mainCrops: ["Maçã", "Soja", "Fumo", "Arroz"],
    topDiseases: [
      {
        id: "sc-1",
        name: "Sarna da Macieira",
        pathogen: "Venturia inaequalis",
        crop: "Maçã",
        severity: "alta",
        season: "Set–Dez",
        description: "Manchas escuras velutinosas em folhas e frutos. Principal doença da maçã no Sul.",
      },
      {
        id: "sc-2",
        name: "Podridão Amarga da Maçã",
        pathogen: "Colletotrichum acutatum",
        crop: "Maçã",
        severity: "média",
        season: "Dez–Mar",
        description: "Lesões cônicas nos frutos. Causa perdas na pós-colheita.",
      },
      {
        id: "sc-3",
        name: "Mofo Cinzento do Fumo",
        pathogen: "Botrytis cinerea",
        crop: "Fumo",
        severity: "alta",
        season: "Jun–Ago",
        description: "Podridão aquosa em folhas e flores. Favorecida por alta umidade e temperaturas amenas.",
      },
    ],
  },
  {
    stateCode: "PR",
    state: "Paraná",
    region: "Sul",
    mainCrops: ["Soja", "Milho", "Trigo", "Café"],
    topDiseases: [
      {
        id: "pr-1",
        name: "Podridão Branca do Caule (Soja)",
        pathogen: "Sclerotinia sclerotiorum",
        crop: "Soja",
        severity: "alta",
        season: "Mai–Jul",
        description: "Alta pressão no PR pelo clima mais frio. Esclerócios persistem por anos no solo.",
      },
      {
        id: "pr-2",
        name: "Giberela do Trigo",
        pathogen: "Fusarium graminearum",
        crop: "Trigo",
        severity: "alta",
        season: "Set–Nov",
        description: "Espigas rosadas com grãos micotoxinados. Problema sanitário e de qualidade.",
      },
      {
        id: "pr-3",
        name: "Ferrugem Asiática da Soja",
        pathogen: "Phakopsora pachyrhizi",
        crop: "Soja",
        severity: "alta",
        season: "Jan–Mar",
        description: "Alta agressividade no PR. Cultivares resistentes + fungicida são a base do manejo.",
      },
    ],
  },
];

// Estados organizados por sigla para busca rápida
export const DISEASE_BY_STATE: Record<string, RegionDiseaseData> = Object.fromEntries(
  BRAZIL_REGIONS.map((r) => [r.stateCode, r])
);

export const ALL_STATES = BRAZIL_REGIONS.map((r) => ({
  code: r.stateCode,
  name: r.state,
  region: r.region,
})).sort((a, b) => a.name.localeCompare(b.name));

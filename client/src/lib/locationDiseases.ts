export interface RegionDisease {
  doenca: string;
  patogeno: string;
  culturas: string[];
  incidencia: 'Alta' | 'Media' | 'Baixa';
}

export interface EstadoData {
  estado: string;
  uf: string;
  regiao: string;
  doencas: RegionDisease[];
}

export const estadosData: EstadoData[] = [
  {
    estado: 'Mato Grosso', uf: 'MT', regiao: 'Centro-Oeste',
    doencas: [
      { doenca: 'Ferrugem Asiatica da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Mancha Alvo', patogeno: 'Corynespora cassiicola', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Antracnose do Milho', patogeno: 'Colletotrichum graminicola', culturas: ['Milho'], incidencia: 'Alta' },
      { doenca: 'Podridao de Carvao', patogeno: 'Macrophomina phaseolina', culturas: ['Soja', 'Milho'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Parana', uf: 'PR', regiao: 'Sul',
    doencas: [
      { doenca: 'Ferrugem da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Brusone do Trigo', patogeno: 'Pyricularia oryzae', culturas: ['Trigo'], incidencia: 'Alta' },
      { doenca: 'Helmintosporiose', patogeno: 'Helminthosporium sp.', culturas: ['Milho', 'Trigo'], incidencia: 'Alta' },
      { doenca: 'Esclerotinia', patogeno: 'Sclerotinia sclerotiorum', culturas: ['Soja'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Rio Grande do Sul', uf: 'RS', regiao: 'Sul',
    doencas: [
      { doenca: 'Brusone do Arroz', patogeno: 'Pyricularia oryzae', culturas: ['Arroz'], incidencia: 'Alta' },
      { doenca: 'Ferrugem da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Oido da Videira', patogeno: 'Erysiphe necator', culturas: ['Uva'], incidencia: 'Alta' },
      { doenca: 'Mancha Parda do Arroz', patogeno: 'Cochliobolus miyabeanus', culturas: ['Arroz'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Santa Catarina', uf: 'SC', regiao: 'Sul',
    doencas: [
      { doenca: 'Sarna da Macieira', patogeno: 'Venturia inaequalis', culturas: ['Maca'], incidencia: 'Alta' },
      { doenca: 'Podridao Amarga', patogeno: 'Colletotrichum acutatum', culturas: ['Maca', 'Pera'], incidencia: 'Alta' },
      { doenca: 'Mofo Cinzento', patogeno: 'Botrytis cinerea', culturas: ['Uva', 'Morango'], incidencia: 'Alta' },
      { doenca: 'Brusone do Trigo', patogeno: 'Pyricularia oryzae', culturas: ['Trigo'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Sao Paulo', uf: 'SP', regiao: 'Sudeste',
    doencas: [
      { doenca: 'Ferrugem do Cafeeiro', patogeno: 'Hemileia vastatrix', culturas: ['Cafe'], incidencia: 'Alta' },
      { doenca: 'Carvao da Cana', patogeno: 'Sporisorium scitamineum', culturas: ['Cana-de-acucar'], incidencia: 'Alta' },
      { doenca: 'Cancro Citrico', patogeno: 'Xanthomonas citri', culturas: ['Citros'], incidencia: 'Alta' },
      { doenca: 'Sigatoka Negra', patogeno: 'Mycosphaerella fijiensis', culturas: ['Banana'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Minas Gerais', uf: 'MG', regiao: 'Sudeste',
    doencas: [
      { doenca: 'Ferrugem do Cafeeiro', patogeno: 'Hemileia vastatrix', culturas: ['Cafe'], incidencia: 'Alta' },
      { doenca: 'Cercospora do Cafe', patogeno: 'Cercospora coffeicola', culturas: ['Cafe'], incidencia: 'Alta' },
      { doenca: 'Fusariose do Tomateiro', patogeno: 'Fusarium oxysporum', culturas: ['Tomate'], incidencia: 'Alta' },
      { doenca: 'Antracnose do Feijao', patogeno: 'Colletotrichum lindemuthianum', culturas: ['Feijao'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Rio de Janeiro', uf: 'RJ', regiao: 'Sudeste',
    doencas: [
      { doenca: 'Sigatoka Negra', patogeno: 'Mycosphaerella fijiensis', culturas: ['Banana'], incidencia: 'Alta' },
      { doenca: 'Antracnose da Manga', patogeno: 'Colletotrichum gloeosporioides', culturas: ['Manga'], incidencia: 'Alta' },
      { doenca: 'Requeima do Tomateiro', patogeno: 'Phytophthora infestans', culturas: ['Tomate'], incidencia: 'Alta' },
      { doenca: 'Oido do Mamoeiro', patogeno: 'Oidium caricae', culturas: ['Mamao'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Espirito Santo', uf: 'ES', regiao: 'Sudeste',
    doencas: [
      { doenca: 'Ferrugem do Cafe Conilon', patogeno: 'Hemileia vastatrix', culturas: ['Cafe Conilon'], incidencia: 'Alta' },
      { doenca: 'Meleira do Mamoeiro', patogeno: 'Papaya meleira virus', culturas: ['Mamao'], incidencia: 'Alta' },
      { doenca: 'Podridao do Pe do Mamoeiro', patogeno: 'Phytophthora palmivora', culturas: ['Mamao'], incidencia: 'Alta' },
      { doenca: 'Vassoura de Bruxa do Cacau', patogeno: 'Moniliophthora perniciosa', culturas: ['Cacau'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Goias', uf: 'GO', regiao: 'Centro-Oeste',
    doencas: [
      { doenca: 'Ferrugem Asiatica da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Requeima do Tomate', patogeno: 'Phytophthora infestans', culturas: ['Tomate'], incidencia: 'Alta' },
      { doenca: 'Podridao Vermelha da Raiz', patogeno: 'Fusarium solani', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Ferrugem da Cana', patogeno: 'Puccinia melanocephala', culturas: ['Cana-de-acucar'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Mato Grosso do Sul', uf: 'MS', regiao: 'Centro-Oeste',
    doencas: [
      { doenca: 'Ferrugem Asiatica da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Mancha Branca do Milho', patogeno: 'Pantoea ananatis', culturas: ['Milho'], incidencia: 'Alta' },
      { doenca: 'Podridao da Espiga', patogeno: 'Fusarium graminearum', culturas: ['Milho'], incidencia: 'Media' },
      { doenca: 'Carvao da Cana', patogeno: 'Sporisorium scitamineum', culturas: ['Cana-de-acucar'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Distrito Federal', uf: 'DF', regiao: 'Centro-Oeste',
    doencas: [
      { doenca: 'Ferrugem Asiatica da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Requeima do Tomateiro', patogeno: 'Phytophthora infestans', culturas: ['Tomate', 'Hortalicas'], incidencia: 'Alta' },
      { doenca: 'Mildio da Alface', patogeno: 'Bremia lactucae', culturas: ['Alface'], incidencia: 'Alta' },
      { doenca: 'Oido das Cucurbitaceas', patogeno: 'Podosphaera xanthii', culturas: ['Pepino', 'Melao'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Bahia', uf: 'BA', regiao: 'Nordeste',
    doencas: [
      { doenca: 'Vassoura de Bruxa do Cacau', patogeno: 'Moniliophthora perniciosa', culturas: ['Cacau'], incidencia: 'Alta' },
      { doenca: 'Ramulose do Algodao', patogeno: 'Colletotrichum gossypii', culturas: ['Algodao'], incidencia: 'Alta' },
      { doenca: 'Ferrugem Asiatica da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Mela do Feijao', patogeno: 'Rhizoctonia solani', culturas: ['Feijao'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Pernambuco', uf: 'PE', regiao: 'Nordeste',
    doencas: [
      { doenca: 'Sigatoka Amarela', patogeno: 'Mycosphaerella musicola', culturas: ['Banana'], incidencia: 'Alta' },
      { doenca: 'Mal do Panama', patogeno: 'Fusarium oxysporum cubense', culturas: ['Banana'], incidencia: 'Alta' },
      { doenca: 'Carvao da Cana', patogeno: 'Sporisorium scitamineum', culturas: ['Cana-de-acucar'], incidencia: 'Alta' },
      { doenca: 'Mosaico da Cana', patogeno: 'Sugarcane mosaic virus', culturas: ['Cana-de-acucar'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Ceara', uf: 'CE', regiao: 'Nordeste',
    doencas: [
      { doenca: 'Antracnose do Melao', patogeno: 'Colletotrichum orbiculare', culturas: ['Melao'], incidencia: 'Alta' },
      { doenca: 'Mildio do Melao', patogeno: 'Pseudoperonospora cubensis', culturas: ['Melao', 'Pepino'], incidencia: 'Alta' },
      { doenca: 'Oido do Cajueiro', patogeno: 'Erysiphe quercicola', culturas: ['Caju'], incidencia: 'Alta' },
      { doenca: 'Resinose do Cajueiro', patogeno: 'Lasiodiplodia theobromae', culturas: ['Caju'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Maranhao', uf: 'MA', regiao: 'Nordeste',
    doencas: [
      { doenca: 'Ferrugem Asiatica da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Vassoura de Bruxa do Cacau', patogeno: 'Moniliophthora perniciosa', culturas: ['Cacau'], incidencia: 'Alta' },
      { doenca: 'Podridao Mole da Mandioca', patogeno: 'Erwinia carotovora', culturas: ['Mandioca'], incidencia: 'Alta' },
      { doenca: 'Cercosporiose da Soja', patogeno: 'Cercospora kikuchii', culturas: ['Soja'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Piaui', uf: 'PI', regiao: 'Nordeste',
    doencas: [
      { doenca: 'Ferrugem Asiatica da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Antracnose do Cajueiro', patogeno: 'Colletotrichum gloeosporioides', culturas: ['Caju'], incidencia: 'Alta' },
      { doenca: 'Mancha Foliar do Feijao-Caupi', patogeno: 'Cercospora canescens', culturas: ['Feijao-caupi'], incidencia: 'Alta' },
      { doenca: 'Podridao Radicular da Soja', patogeno: 'Fusarium solani', culturas: ['Soja'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Rio Grande do Norte', uf: 'RN', regiao: 'Nordeste',
    doencas: [
      { doenca: 'Mosaico do Mamoeiro', patogeno: 'Papaya ringspot virus', culturas: ['Mamao'], incidencia: 'Alta' },
      { doenca: 'Antracnose do Melao', patogeno: 'Colletotrichum orbiculare', culturas: ['Melao'], incidencia: 'Alta' },
      { doenca: 'Oio de Passaro do Cajueiro', patogeno: 'Cercospora anacardii', culturas: ['Caju'], incidencia: 'Media' },
      { doenca: 'Podridao Peduncular da Manga', patogeno: 'Lasiodiplodia theobromae', culturas: ['Manga'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Paraiba', uf: 'PB', regiao: 'Nordeste',
    doencas: [
      { doenca: 'Mosaico Dourado do Feijao', patogeno: 'Bean golden mosaic virus', culturas: ['Feijao'], incidencia: 'Alta' },
      { doenca: 'Antracnose do Feijao', patogeno: 'Colletotrichum lindemuthianum', culturas: ['Feijao'], incidencia: 'Alta' },
      { doenca: 'Sigatoka Amarela', patogeno: 'Mycosphaerella musicola', culturas: ['Banana'], incidencia: 'Media' },
      { doenca: 'Cercosporiose do Feijao-Caupi', patogeno: 'Cercospora canescens', culturas: ['Feijao-caupi'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Sergipe', uf: 'SE', regiao: 'Nordeste',
    doencas: [
      { doenca: 'Sigatoka Amarela', patogeno: 'Mycosphaerella musicola', culturas: ['Banana'], incidencia: 'Alta' },
      { doenca: 'Ferrugem do Coqueiro', patogeno: 'Marasmius cocophilus', culturas: ['Coco'], incidencia: 'Alta' },
      { doenca: 'Antracnose da Manga', patogeno: 'Colletotrichum gloeosporioides', culturas: ['Manga'], incidencia: 'Media' },
      { doenca: 'Podridao Peduncular da Manga', patogeno: 'Lasiodiplodia theobromae', culturas: ['Manga'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Alagoas', uf: 'AL', regiao: 'Nordeste',
    doencas: [
      { doenca: 'Carvao da Cana', patogeno: 'Sporisorium scitamineum', culturas: ['Cana-de-acucar'], incidencia: 'Alta' },
      { doenca: 'Ferrugem da Cana', patogeno: 'Puccinia melanocephala', culturas: ['Cana-de-acucar'], incidencia: 'Alta' },
      { doenca: 'Escaldadura da Cana', patogeno: 'Xanthomonas albilineans', culturas: ['Cana-de-acucar'], incidencia: 'Alta' },
      { doenca: 'Raquitismo da Soqueira', patogeno: 'Leifsonia xyli xyli', culturas: ['Cana-de-acucar'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Para', uf: 'PA', regiao: 'Norte',
    doencas: [
      { doenca: 'Amarelecimento Fatal do Dendezeiro', patogeno: 'Phytoplasma sp.', culturas: ['Dende'], incidencia: 'Alta' },
      { doenca: 'Vassoura de Bruxa do Cacau', patogeno: 'Moniliophthora perniciosa', culturas: ['Cacau'], incidencia: 'Alta' },
      { doenca: 'Podridao Mole da Mandioca', patogeno: 'Erwinia carotovora', culturas: ['Mandioca'], incidencia: 'Alta' },
      { doenca: 'Antracnose da Pimenta', patogeno: 'Colletotrichum gloeosporioides', culturas: ['Pimenta-do-reino'], incidencia: 'Alta' },
    ],
  },
  {
    estado: 'Amazonas', uf: 'AM', regiao: 'Norte',
    doencas: [
      { doenca: 'Vassoura de Bruxa do Cupuacu', patogeno: 'Moniliophthora perniciosa', culturas: ['Cupuacu'], incidencia: 'Alta' },
      { doenca: 'Antracnose do Guarana', patogeno: 'Colletotrichum gloeosporioides', culturas: ['Guarana'], incidencia: 'Alta' },
      { doenca: 'Podridao Radicular da Mandioca', patogeno: 'Phytophthora drechsleri', culturas: ['Mandioca'], incidencia: 'Alta' },
      { doenca: 'Cercosporiose da Banana', patogeno: 'Mycosphaerella musicola', culturas: ['Banana'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Tocantins', uf: 'TO', regiao: 'Norte',
    doencas: [
      { doenca: 'Ferrugem Asiatica da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Cercosporiose do Milho', patogeno: 'Cercospora zeae-maydis', culturas: ['Milho'], incidencia: 'Alta' },
      { doenca: 'Antracnose do Milho', patogeno: 'Colletotrichum graminicola', culturas: ['Milho'], incidencia: 'Media' },
      { doenca: 'Podridao Mole da Mandioca', patogeno: 'Erwinia carotovora', culturas: ['Mandioca'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Rondonia', uf: 'RO', regiao: 'Norte',
    doencas: [
      { doenca: 'Vassoura de Bruxa do Cacau', patogeno: 'Moniliophthora perniciosa', culturas: ['Cacau'], incidencia: 'Alta' },
      { doenca: 'Ferrugem Asiatica da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Podridao Radicular do Cafeeiro', patogeno: 'Fusarium oxysporum', culturas: ['Cafe'], incidencia: 'Alta' },
      { doenca: 'Mancha Parda do Cafeeiro', patogeno: 'Cercospora coffeicola', culturas: ['Cafe'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Roraima', uf: 'RR', regiao: 'Norte',
    doencas: [
      { doenca: 'Ferrugem Asiatica da Soja', patogeno: 'Phakopsora pachyrhizi', culturas: ['Soja'], incidencia: 'Alta' },
      { doenca: 'Brusone do Arroz', patogeno: 'Pyricularia oryzae', culturas: ['Arroz'], incidencia: 'Alta' },
      { doenca: 'Podridao Mole da Mandioca', patogeno: 'Erwinia carotovora', culturas: ['Mandioca'], incidencia: 'Media' },
      { doenca: 'Antracnose do Milho', patogeno: 'Colletotrichum graminicola', culturas: ['Milho'], incidencia: 'Media' },
    ],
  },
  {
    estado: 'Acre', uf: 'AC', regiao: 'Norte',
    doencas: [
      { doenca: 'Vassoura de Bruxa do Cacau', patogeno: 'Moniliophthora perniciosa', culturas: ['Cacau'], incidencia: 'Alta' },
      { doenca: 'Podridao Radicular da Mandioca', patogeno: 'Phytophthora drechsleri', culturas: ['Mandioca'], incidencia: 'Alta' },
      { doenca: 'Antracnose da Seringueira', patogeno: 'Colletotrichum gloeosporioides', culturas: ['Seringueira'], incidencia: 'Alta' },
      { doenca: 'Mal das Folhas da Seringueira', patogeno: 'Microcyclus ulei', culturas: ['Seringueira'], incidencia: 'Alta' },
    ],
  },
  {
    estado: 'Amapa', uf: 'AP', regiao: 'Norte',
    doencas: [
      { doenca: 'Podridao Mole da Mandioca', patogeno: 'Erwinia carotovora', culturas: ['Mandioca'], incidencia: 'Alta' },
      { doenca: 'Brusone do Arroz', patogeno: 'Pyricularia oryzae', culturas: ['Arroz'], incidencia: 'Alta' },
      { doenca: 'Antracnose do Acai', patogeno: 'Colletotrichum gloeosporioides', culturas: ['Acai'], incidencia: 'Media' },
      { doenca: 'Cercosporiose da Banana', patogeno: 'Mycosphaerella musicola', culturas: ['Banana'], incidencia: 'Media' },
    ],
  },
];

export const regioes = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

export function getEstadosByRegiao(regiao: string): EstadoData[] {
  return estadosData.filter(e => e.regiao === regiao);
}

export function getEstadoByUF(uf: string): EstadoData | undefined {
  return estadosData.find(e => e.uf === uf);
}

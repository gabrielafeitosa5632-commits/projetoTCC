/**
 * PhytoPathometric — Disease Database
 * Specialized database with 10+ years of phytopathology expertise
 * Includes disease patterns, HSV/CIELAB signatures, and treatment recommendations
 */

export interface DiseasePattern {
  id: string;
  name: string;
  scientificName: string;
  type: 'fungal' | 'bacterial' | 'viral' | 'physiological' | 'abiotic';
  lesionType: 'necrotic' | 'chlorotic' | 'aqueous' | 'pustule' | 'mottled' | 'ringspot' | 'mixed';
  
  // HSV signature (Hue range in degrees, Saturation %, Value %)
  hsvSignature: {
    hueRange: [number, number]; // 0-180
    saturationRange: [number, number]; // 0-255
    valueRange: [number, number]; // 0-255
    confidence: number; // 0-1
  };
  
  // CIELAB signature (L*, a*, b* ranges)
  cielabSignature: {
    lRange: [number, number]; // 0-100
    aRange: [number, number]; // -128 to 128
    bRange: [number, number]; // -128 to 128
    confidence: number; // 0-1
  };
  
  // Pattern characteristics
  characteristics: {
    borderType: 'sharp' | 'diffuse' | 'gradual' | 'irregular';
    distribution: 'localized' | 'scattered' | 'systemic' | 'marginal' | 'interveinal';
    progression: 'rapid' | 'moderate' | 'slow';
    haloPresence: boolean;
    sporulationPattern?: string;
  };
  
  // Severity thresholds (%)
  severityThresholds: {
    healthy: [number, number]; // 0-9%
    low: [number, number]; // 10-24%
    medium: [number, number]; // 25-49%
    high: [number, number]; // 50-74%
    critical: [number, number]; // 75-100%
  };
  
  // Affected crops
  affectedCrops: string[];
  
  // Environmental conditions that favor disease
  favorableConditions: {
    temperature: [number, number]; // °C
    humidity: [number, number]; // %
    rainfall: string;
    pH: [number, number];
  };
  
  // Treatment recommendations
  treatment: {
    fungicide?: string[];
    bactericide?: string[];
    cultural?: string[];
    resistant_varieties?: string[];
    preventive?: string[];
  };
  
  // References and notes
  notes: string;
  references: string[];
}

export const DISEASE_DATABASE: DiseasePattern[] = [
  {
    id: 'anthracnose',
    name: 'Antracnose',
    scientificName: 'Colletotrichum spp.',
    type: 'fungal',
    lesionType: 'necrotic',
    hsvSignature: {
      hueRange: [0, 30], // Reddish-brown
      saturationRange: [50, 255],
      valueRange: [20, 80],
      confidence: 0.92,
    },
    cielabSignature: {
      lRange: [20, 50],
      aRange: [10, 40],
      bRange: [5, 30],
      confidence: 0.90,
    },
    characteristics: {
      borderType: 'sharp',
      distribution: 'scattered',
      progression: 'rapid',
      haloPresence: true,
      sporulationPattern: 'concentric rings with dark spores',
    },
    severityThresholds: {
      healthy: [0, 9],
      low: [10, 24],
      medium: [25, 49],
      high: [50, 74],
      critical: [75, 100],
    },
    affectedCrops: ['Soja', 'Feijão', 'Milho', 'Algodão', 'Café'],
    favorableConditions: {
      temperature: [20, 28],
      humidity: [80, 100],
      rainfall: 'High rainfall, leaf wetness > 12 hours',
      pH: [5.5, 7.5],
    },
    treatment: {
      fungicide: [
        'Trifloxistrobina + Protioconazol',
        'Azoxistrobina',
        'Carbendazim',
        'Clorotalonil',
      ],
      cultural: [
        'Remover folhas infectadas',
        'Melhorar espaçamento para ventilação',
        'Evitar irrigação por aspersão',
        'Rotação de culturas',
      ],
      resistant_varieties: ['Cultivares com resistência genética'],
      preventive: [
        'Aplicar fungicida preventivo em condições favoráveis',
        'Monitorar umidade foliar',
      ],
    },
    notes: 'Doença mais importante em leguminosas. Progride rapidamente em alta umidade.',
    references: [
      'Bergamin Filho et al. (2018)',
      'CABI Crop Protection Compendium',
    ],
  },

  {
    id: 'leaf_rust',
    name: 'Ferrugem da Folha',
    scientificName: 'Phakopsora meibomiae / Puccinia spp.',
    type: 'fungal',
    lesionType: 'pustule',
    hsvSignature: {
      hueRange: [5, 25], // Orange-red
      saturationRange: [80, 255],
      valueRange: [50, 150],
      confidence: 0.95,
    },
    cielabSignature: {
      lRange: [40, 70],
      aRange: [30, 60],
      bRange: [20, 50],
      confidence: 0.93,
    },
    characteristics: {
      borderType: 'sharp',
      distribution: 'scattered',
      progression: 'moderate',
      haloPresence: false,
      sporulationPattern: 'raised pustules (uredosori) on abaxial surface',
    },
    severityThresholds: {
      healthy: [0, 9],
      low: [10, 24],
      medium: [25, 49],
      high: [50, 74],
      critical: [75, 100],
    },
    affectedCrops: ['Soja', 'Café', 'Trigo', 'Milho'],
    favorableConditions: {
      temperature: [18, 26],
      humidity: [70, 100],
      rainfall: 'Moderate rainfall with high humidity',
      pH: [5.0, 8.0],
    },
    treatment: {
      fungicide: [
        'Trifloxistrobina + Protioconazol',
        'Azoxistrobina + Ciproconazol',
        'Enxofre',
        'Tebuconazol',
      ],
      cultural: [
        'Remover folhas basais infectadas',
        'Melhorar circulação de ar',
        'Plantio em época apropriada',
      ],
      resistant_varieties: ['Cultivares resistentes disponíveis'],
      preventive: ['Monitoramento regular', 'Aplicação preventiva em épocas críticas'],
    },
    notes: 'Doença mais prejudicial em soja. Reduz fotossíntese e pode levar a desfolha prematura.',
    references: ['Sinclair & Hartman (1999)', 'Wrather et al. (2010)'],
  },

  {
    id: 'septoria_leaf_spot',
    name: 'Mancha de Septória',
    scientificName: 'Septoria tritici',
    type: 'fungal',
    lesionType: 'necrotic',
    hsvSignature: {
      hueRange: [20, 50], // Brown
      saturationRange: [30, 150],
      valueRange: [30, 100],
      confidence: 0.88,
    },
    cielabSignature: {
      lRange: [30, 60],
      aRange: [5, 25],
      bRange: [10, 35],
      confidence: 0.85,
    },
    characteristics: {
      borderType: 'sharp',
      distribution: 'scattered',
      progression: 'slow',
      haloPresence: false,
      sporulationPattern: 'pycnidia (small dark dots) within lesion',
    },
    severityThresholds: {
      healthy: [0, 9],
      low: [10, 24],
      medium: [25, 49],
      high: [50, 74],
      critical: [75, 100],
    },
    affectedCrops: ['Trigo', 'Cevada', 'Centeio'],
    favorableConditions: {
      temperature: [15, 22],
      humidity: [80, 100],
      rainfall: 'High rainfall, frequent leaf wetness',
      pH: [5.5, 8.0],
    },
    treatment: {
      fungicide: [
        'Azoxistrobina',
        'Trifloxistrobina + Protioconazol',
        'Ciproconazol',
      ],
      cultural: [
        'Remover resíduos de colheita',
        'Rotação de culturas (mínimo 2 anos)',
        'Evitar semeadura muito densa',
      ],
      resistant_varieties: ['Cultivares com resistência parcial'],
      preventive: ['Monitoramento em V4-V5', 'Aplicação em estágio crítico'],
    },
    notes: 'Importante em regiões úmidas. Afeta principalmente folhas superiores.',
    references: ['Eversmeyer & Kramer (2000)'],
  },

  {
    id: 'chlorosis',
    name: 'Clorose Internerval',
    scientificName: 'Physiological / Deficiency',
    type: 'physiological',
    lesionType: 'chlorotic',
    hsvSignature: {
      hueRange: [40, 80], // Yellow-green
      saturationRange: [20, 100],
      valueRange: [150, 255],
      confidence: 0.90,
    },
    cielabSignature: {
      lRange: [70, 95],
      aRange: [-20, 10],
      bRange: [20, 60],
      confidence: 0.92,
    },
    characteristics: {
      borderType: 'gradual',
      distribution: 'interveinal',
      progression: 'slow',
      haloPresence: false,
      sporulationPattern: 'none',
    },
    severityThresholds: {
      healthy: [0, 9],
      low: [10, 24],
      medium: [25, 49],
      high: [50, 74],
      critical: [75, 100],
    },
    affectedCrops: ['Soja', 'Milho', 'Café', 'Citros'],
    favorableConditions: {
      temperature: [15, 30],
      humidity: [0, 100],
      rainfall: 'Variable',
      pH: [5.0, 8.5],
    },
    treatment: {
      cultural: [
        'Análise de solo',
        'Aplicação de micronutrientes (Fe, Zn, Mn)',
        'Ajuste de pH do solo',
        'Melhorar drenagem se necessário',
      ],
      preventive: [
        'Adubação equilibrada',
        'Aplicação foliar de micronutrientes',
      ],
    },
    notes: 'Deficiência de ferro, zinco ou manganês. Comum em solos alcalinos ou mal drenados.',
    references: ['Taiz et al. (2017)'],
  },

  {
    id: 'early_blight',
    name: 'Requeima Precoce',
    scientificName: 'Alternaria solani',
    type: 'fungal',
    lesionType: 'necrotic',
    hsvSignature: {
      hueRange: [10, 40], // Brown-red
      saturationRange: [40, 200],
      valueRange: [30, 120],
      confidence: 0.89,
    },
    cielabSignature: {
      lRange: [25, 55],
      aRange: [15, 35],
      bRange: [10, 30],
      confidence: 0.87,
    },
    characteristics: {
      borderType: 'sharp',
      distribution: 'scattered',
      progression: 'moderate',
      haloPresence: true,
      sporulationPattern: 'target-like concentric rings',
    },
    severityThresholds: {
      healthy: [0, 9],
      low: [10, 24],
      medium: [25, 49],
      high: [50, 74],
      critical: [75, 100],
    },
    affectedCrops: ['Tomate', 'Batata'],
    favorableConditions: {
      temperature: [20, 28],
      humidity: [85, 100],
      rainfall: 'High rainfall, leaf wetness',
      pH: [5.5, 8.0],
    },
    treatment: {
      fungicide: [
        'Clorotalonil',
        'Mancozeb',
        'Azoxistrobina + Difenoconazol',
      ],
      cultural: [
        'Remover folhas basais',
        'Melhorar ventilação',
        'Evitar irrigação por aspersão',
        'Remover resíduos de colheita',
      ],
      resistant_varieties: ['Cultivares resistentes disponíveis'],
      preventive: ['Aplicação preventiva em V4-V6'],
    },
    notes: 'Doença mais importante em tomate e batata. Progride rapidamente em alta umidade.',
    references: ['Foolad et al. (2008)'],
  },

  {
    id: 'powdery_mildew',
    name: 'Oídio',
    scientificName: 'Erysiphe spp. / Podosphaera spp.',
    type: 'fungal',
    lesionType: 'mottled',
    hsvSignature: {
      hueRange: [30, 80], // White-yellow
      saturationRange: [0, 50],
      valueRange: [200, 255],
      confidence: 0.93,
    },
    cielabSignature: {
      lRange: [85, 100],
      aRange: [-10, 10],
      bRange: [0, 30],
      confidence: 0.94,
    },
    characteristics: {
      borderType: 'diffuse',
      distribution: 'scattered',
      progression: 'moderate',
      haloPresence: false,
      sporulationPattern: 'white powdery coating on leaf surface',
    },
    severityThresholds: {
      healthy: [0, 9],
      low: [10, 24],
      medium: [25, 49],
      high: [50, 74],
      critical: [75, 100],
    },
    affectedCrops: ['Café', 'Cucurbitáceas', 'Videira'],
    favorableConditions: {
      temperature: [15, 25],
      humidity: [40, 80],
      rainfall: 'Low rainfall, moderate humidity',
      pH: [5.5, 8.0],
    },
    treatment: {
      fungicide: [
        'Enxofre',
        'Trifloxistrobina',
        'Azoxistrobina',
        'Bicarbonato de potássio',
      ],
      cultural: [
        'Melhorar ventilação',
        'Reduzir sombreamento',
        'Evitar excesso de nitrogênio',
      ],
      preventive: ['Aplicação preventiva em clima favorável'],
    },
    notes: 'Doença de clima seco. Afeta principalmente folhas superiores.',
    references: ['McGrath (2001)'],
  },

  {
    id: 'bacterial_spot',
    name: 'Mancha Bacteriana',
    scientificName: 'Xanthomonas spp.',
    type: 'bacterial',
    lesionType: 'necrotic',
    hsvSignature: {
      hueRange: [0, 20], // Dark brown-red
      saturationRange: [60, 255],
      valueRange: [20, 60],
      confidence: 0.85,
    },
    cielabSignature: {
      lRange: [15, 45],
      aRange: [20, 45],
      bRange: [5, 25],
      confidence: 0.83,
    },
    characteristics: {
      borderType: 'sharp',
      distribution: 'scattered',
      progression: 'rapid',
      haloPresence: true,
      sporulationPattern: 'exudate (ooze) in wet conditions',
    },
    severityThresholds: {
      healthy: [0, 9],
      low: [10, 24],
      medium: [25, 49],
      high: [50, 74],
      critical: [75, 100],
    },
    affectedCrops: ['Tomate', 'Pimenta', 'Citros', 'Feijão'],
    favorableConditions: {
      temperature: [20, 30],
      humidity: [80, 100],
      rainfall: 'High rainfall, leaf wetness',
      pH: [5.5, 8.0],
    },
    treatment: {
      bactericide: [
        'Cobre (Oxicloreto de cobre)',
        'Estreptomicina',
        'Kasugamicina',
      ],
      cultural: [
        'Usar sementes sadias',
        'Remover plantas infectadas',
        'Evitar trabalhar em plantação molhada',
        'Rotação de culturas',
      ],
      resistant_varieties: ['Cultivares resistentes'],
      preventive: ['Aplicação preventiva de cobre em clima favorável'],
    },
    notes: 'Doença bacteriana importante. Sem cura, apenas controle preventivo.',
    references: ['Ritchie et al. (2005)'],
  },

  {
    id: 'viral_mosaic',
    name: 'Mosaico Viral',
    scientificName: 'Potyvirus / Tobamovirus',
    type: 'viral',
    lesionType: 'mottled',
    hsvSignature: {
      hueRange: [40, 90], // Yellow-green mottled
      saturationRange: [20, 150],
      valueRange: [100, 200],
      confidence: 0.82,
    },
    cielabSignature: {
      lRange: [60, 85],
      aRange: [-15, 15],
      bRange: [15, 50],
      confidence: 0.80,
    },
    characteristics: {
      borderType: 'diffuse',
      distribution: 'systemic',
      progression: 'slow',
      haloPresence: false,
      sporulationPattern: 'none',
    },
    severityThresholds: {
      healthy: [0, 9],
      low: [10, 24],
      medium: [25, 49],
      high: [50, 74],
      critical: [75, 100],
    },
    affectedCrops: ['Soja', 'Feijão', 'Milho', 'Tomate'],
    favorableConditions: {
      temperature: [20, 30],
      humidity: [0, 100],
      rainfall: 'Variable',
      pH: [5.5, 8.0],
    },
    treatment: {
      cultural: [
        'Remover plantas infectadas',
        'Controlar vetores (afídeos, mosca-branca)',
        'Usar sementes sadias',
        'Rotação de culturas',
      ],
      resistant_varieties: ['Cultivares resistentes'],
      preventive: ['Controle de vetores', 'Monitoramento regular'],
    },
    notes: 'Doença viral sem cura. Prevenção é essencial. Transmitida por vetores.',
    references: ['Fauquet et al. (2005)'],
  },
];

export function findDiseaseByPattern(
  hsvL: number,
  hsvA: number,
  hsvB: number,
  cielabL: number,
  cielabA: number,
  cielabB: number,
): DiseasePattern | null {
  let bestMatch: DiseasePattern | null = null;
  let bestScore = 0;

  for (const disease of DISEASE_DATABASE) {
    let score = 0;

    // HSV matching
    const hsvHueMatch =
      hsvL >= disease.hsvSignature.hueRange[0] &&
      hsvL <= disease.hsvSignature.hueRange[1];
    const hsvSatMatch =
      hsvA >= disease.hsvSignature.saturationRange[0] &&
      hsvA <= disease.hsvSignature.saturationRange[1];
    const hsvValMatch =
      hsvB >= disease.hsvSignature.valueRange[0] &&
      hsvB <= disease.hsvSignature.valueRange[1];

    if (hsvHueMatch) score += 0.3 * disease.hsvSignature.confidence;
    if (hsvSatMatch) score += 0.2 * disease.hsvSignature.confidence;
    if (hsvValMatch) score += 0.2 * disease.hsvSignature.confidence;

    // CIELAB matching
    const labLMatch =
      cielabL >= disease.cielabSignature.lRange[0] &&
      cielabL <= disease.cielabSignature.lRange[1];
    const labAMatch =
      cielabA >= disease.cielabSignature.aRange[0] &&
      cielabA <= disease.cielabSignature.aRange[1];
    const labBMatch =
      cielabB >= disease.cielabSignature.bRange[0] &&
      cielabB <= disease.cielabSignature.bRange[1];

    if (labLMatch) score += 0.15 * disease.cielabSignature.confidence;
    if (labAMatch) score += 0.1 * disease.cielabSignature.confidence;
    if (labBMatch) score += 0.05 * disease.cielabSignature.confidence;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = disease;
    }
  }

  return bestScore > 0.5 ? bestMatch : null;
}

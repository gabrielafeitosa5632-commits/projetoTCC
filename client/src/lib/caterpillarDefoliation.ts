import { segmentLeaf } from './leafSegmentation';

export type FixedDefoliationSensitivity = 'conservador' | 'padrao' | 'sensivel';
export type DefoliationSensitivity = 'automatico' | FixedDefoliationSensitivity;

export interface DefoliationOptions {
  sensitivity?: DefoliationSensitivity;
  leafRegionConstraint?: Uint8Array;
}

export interface DefoliationResult {
  leafRegionMask: Uint8Array;
  remainingLeafMask: Uint8Array;
  estimatedOriginalLeafMask: Uint8Array;
  damageMask: Uint8Array;
  internalHoleMask: Uint8Array;
  edgeLossMask: Uint8Array;
  areaFoliarRemanescente: number;
  areaFoliarConsumida: number;
  areaFoliarOriginalEstimada: number;
  percentualDesfolha: number;
  confidence: number;
  selectedSensitivity: FixedDefoliationSensitivity;
  automaticAdjustment: boolean;
  segmentationIssues: string[];
  debugMaskCounts: {
    leafRegion: number;
    remainingLeaf: number;
    internalHole: number;
    edgeDamage: number;
    finalDamage: number;
    estimatedOriginal: number;
  };
}

export type DamageInterestAreaId = 'folhaInteira' | 'apice' | 'base' | 'bordas';

export interface DamageInterestArea {
  id: DamageInterestAreaId;
  label: string;
  shortLabel: string;
  description: string;
}

export const DAMAGE_INTEREST_AREAS: DamageInterestArea[] = [
  {
    id: 'folhaInteira',
    label: 'Folha inteira',
    shortLabel: 'Inteira',
    description: 'Desfolha total considerando toda a lâmina foliar.',
  },
  {
    id: 'apice',
    label: 'Ápice',
    shortLabel: 'Ápice',
    description: 'Terço superior da folha.',
  },
  {
    id: 'base',
    label: 'Base',
    shortLabel: 'Base',
    description: 'Terço inferior da folha.',
  },
  {
    id: 'bordas',
    label: 'Bordas',
    shortLabel: 'Bordas',
    description: 'Faixa marginal onde mordidas externas são mais frequentes.',
  },
];

export type SeverityLevel = 'saudavel' | 'baixa' | 'media' | 'alta';

export interface AreaInterestResult {
  id: DamageInterestAreaId;
  label: string;
  shortLabel: string;
  areaFoliarTotal: number;
  areaFoliarVisivel: number;
  areaDanificada: number;
  areaPreservada: number;
  danoPercentual: number;
}

export interface DefoliationVisualizations {
  folhaIsolada: string;
  areaPresente: string;
  areaRemovida: string;
  contornoEstimado: string;
  sobreposicao: string;
}

export interface CaterpillarDamageResult {
  id: string;
  timestamp: Date;
  cultura: string;
  observacoes?: string;
  areaInteresse: DamageInterestAreaId;
  areaFoliarTotal: number;
  areaFoliarVisivel: number;
  areaDanificada: number;
  areaFurosInternos: number;
  areaPerdaMarginal: number;
  areaPreservada: number;
  danoPercentual: number;
  areasInteresse: AreaInterestResult[];
  nivel: SeverityLevel;
  confianca: number;
  imageDataUrl: string;
  processedImageDataUrl: string;
  visualizacoes: DefoliationVisualizations;
  ajusteMascara: FixedDefoliationSensitivity;
  ajusteAutomatico: boolean;
  avisosSegmentacao: string[];
}

type Component = {
  pixels: Int32Array;
  count: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  touchesBorder: boolean;
};

type RgbaImageLike = {
  data: Uint8ClampedArray;
  width?: number;
  height?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

export function countMask(mask: Uint8Array) {
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) count++;
  }
  return count;
}

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;

  if (delta > 0) {
    if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
  }

  return {
    h,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

function erode(mask: Uint8Array, width: number, height: number, radius = 1) {
  const out = new Uint8Array(mask.length);
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      let keep = 1;
      for (let dy = -radius; dy <= radius && keep; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (!mask[(y + dy) * width + x + dx]) {
            keep = 0;
            break;
          }
        }
      }
      out[y * width + x] = keep;
    }
  }
  return out;
}

function dilate(mask: Uint8Array, width: number, height: number, radius = 1) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let keep = 0;
      for (let dy = -radius; dy <= radius && !keep; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          if (mask[ny * width + nx]) {
            keep = 1;
            break;
          }
        }
      }
      out[y * width + x] = keep;
    }
  }
  return out;
}

function closeMask(mask: Uint8Array, width: number, height: number, radius = 1) {
  return erode(dilate(mask, width, height, radius), width, height, radius);
}

function openMask(mask: Uint8Array, width: number, height: number, radius = 1) {
  return dilate(erode(mask, width, height, radius), width, height, radius);
}

function subtractMasks(a: Uint8Array, b: Uint8Array) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] && !b[i] ? 1 : 0;
  return out;
}

function intersectMasks(a: Uint8Array, b: Uint8Array) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] && b[i] ? 1 : 0;
  return out;
}

function constrainMask(mask: Uint8Array, constraint: Uint8Array) {
  return intersectMasks(mask, constraint);
}

function fullMask(total: number) {
  const out = new Uint8Array(total);
  out.fill(1);
  return out;
}

function unionMasks(...masks: Uint8Array[]) {
  const out = new Uint8Array(masks[0].length);
  for (const mask of masks) {
    for (let i = 0; i < out.length; i++) {
      if (mask[i]) out[i] = 1;
    }
  }
  return out;
}

function getComponents(mask: Uint8Array, width: number, height: number): Component[] {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const pixels = new Int32Array(total);
  const components: Component[] = [];

  for (let start = 0; start < total; start++) {
    if (!mask[start] || visited[start]) continue;

    let qHead = 0;
    let qTail = 0;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let touchesBorder = false;

    visited[start] = 1;
    queue[qTail++] = start;

    while (qHead < qTail) {
      const idx = queue[qHead++];
      pixels[count++] = idx;
      const x = idx % width;
      const y = Math.floor(idx / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const next = ny * width + nx;
          if (!mask[next] || visited[next]) continue;
          visited[next] = 1;
          queue[qTail++] = next;
        }
      }
    }

    components.push({
      pixels: pixels.slice(0, count),
      count,
      minX,
      minY,
      maxX,
      maxY,
      touchesBorder,
    });
  }

  return components;
}

function componentToMask(component: Component | undefined, total: number) {
  const out = new Uint8Array(total);
  if (!component) return out;
  for (let i = 0; i < component.count; i++) out[component.pixels[i]] = 1;
  return out;
}

function removeSmallComponents(mask: Uint8Array, width: number, height: number, minPixels: number) {
  const out = new Uint8Array(mask.length);
  for (const component of getComponents(mask, width, height)) {
    if (component.count < minPixels) continue;
    for (let i = 0; i < component.count; i++) out[component.pixels[i]] = 1;
  }
  return out;
}

function buildLeafRegionConstraint(seedMask: Uint8Array, width: number, height: number) {
  const seedArea = countMask(seedMask);
  if (seedArea === 0) return new Uint8Array(seedMask.length);

  const minDim = Math.min(width, height);
  const closeRadius = clamp(Math.round(minDim * 0.006), 1, 4);
  // A nova mascara foliar ja preserva a borda real; uma margem grande inflava
  // artificialmente a area esperada e criava falsa desfolha no contorno.
  const marginRadius = clamp(Math.round(minDim * 0.004), 1, 3);
  let roi = removeSmallComponents(seedMask, width, height, Math.max(24, Math.round(seedArea * 0.08)));
  roi = closeMask(roi, width, height, closeRadius);
  roi = fillInternalHoles(roi, width, height);
  roi = dilate(roi, width, height, marginRadius);
  roi = closeMask(roi, width, height, 1);
  return removeSmallComponents(roi, width, height, Math.max(24, Math.round(seedArea * 0.45)));
}

function expandMaskIntoSupport(
  seedMask: Uint8Array,
  supportMask: Uint8Array,
  width: number,
  height: number,
  iterations: number,
) {
  const out = new Uint8Array(seedMask);

  for (let step = 0; step < iterations; step++) {
    const expanded = dilate(out, width, height, 1);
    let changed = false;

    for (let i = 0; i < out.length; i++) {
      if (!expanded[i] || !supportMask[i] || out[i]) continue;
      out[i] = 1;
      changed = true;
    }

    if (!changed) break;
  }

  return out;
}

function includeEnclosedSupportedTissue(seedMask: Uint8Array, supportMask: Uint8Array, width: number, height: number) {
  const seedWithClosedInterior = fillInternalHoles(seedMask, width, height);
  const out = new Uint8Array(seedMask);

  for (let i = 0; i < out.length; i++) {
    if (seedWithClosedInterior[i] && supportMask[i]) out[i] = 1;
  }

  return out;
}

function fillInternalHoles(mask: Uint8Array, width: number, height: number) {
  const total = width * height;
  const external = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;

  const seed = (idx: number) => {
    if (idx < 0 || idx >= total || mask[idx] || external[idx]) return;
    external[idx] = 1;
    queue[qTail++] = idx;
  };

  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  while (qHead < qTail) {
    const idx = queue[qHead++];
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x > 0) seed(idx - 1);
    if (x < width - 1) seed(idx + 1);
    if (y > 0) seed(idx - width);
    if (y < height - 1) seed(idx + width);
  }

  const out = new Uint8Array(total);
  for (let i = 0; i < total; i++) out[i] = external[i] ? 0 : 1;
  return out;
}

function touchesMask(component: Component, mask: Uint8Array, width: number, height: number) {
  for (let i = 0; i < component.count; i++) {
    const idx = component.pixels[i];
    const x = idx % width;
    const y = Math.floor(idx / width);
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (mask[ny * width + nx]) return true;
      }
    }
  }
  return false;
}

function filterDamageComponents(
  mask: Uint8Array,
  referenceMask: Uint8Array,
  width: number,
  height: number,
  minPixels: number,
) {
  const out = new Uint8Array(mask.length);
  for (const component of getComponents(mask, width, height)) {
    const boxWidth = component.maxX - component.minX + 1;
    const boxHeight = component.maxY - component.minY + 1;
    const boxArea = Math.max(1, boxWidth * boxHeight);
    const fillRatio = component.count / boxArea;
    const tooThin = boxWidth <= 2 || boxHeight <= 2 || fillRatio < 0.08;
    if (component.count < minPixels || tooThin || !touchesMask(component, referenceMask, width, height)) continue;
    for (let i = 0; i < component.count; i++) out[component.pixels[i]] = 1;
  }
  return out;
}

function median(values: number[]) {
  if (values.length === 0) return -1;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function localMedian(values: Int32Array, index: number, radius: number) {
  const window: number[] = [];
  for (let i = Math.max(0, index - radius); i <= Math.min(values.length - 1, index + radius); i++) {
    if (values[i] >= 0) window.push(values[i]);
  }
  return median(window);
}

function localRangeMedian(values: Int32Array, start: number, end: number) {
  const window: number[] = [];
  for (let i = Math.max(0, start); i <= Math.min(values.length - 1, end); i++) {
    if (values[i] >= 0) window.push(values[i]);
  }
  return median(window);
}

function flankedContourReference(values: Int32Array, index: number, radius: number, side: 'min' | 'max') {
  const gap = Math.max(2, Math.round(radius * 0.35));
  const left = localRangeMedian(values, index - radius, index - gap);
  const right = localRangeMedian(values, index + gap, index + radius);
  if (left < 0 || right < 0) return -1;
  return side === 'min' ? Math.max(left, right) : Math.min(left, right);
}

function getAxisBounds(mask: Uint8Array, width: number, height: number) {
  const rowMin = new Int32Array(height).fill(-1);
  const rowMax = new Int32Array(height).fill(-1);
  const colMin = new Int32Array(width).fill(-1);
  const colMax = new Int32Array(width).fill(-1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!mask[idx]) continue;
      if (rowMin[y] < 0 || x < rowMin[y]) rowMin[y] = x;
      if (x > rowMax[y]) rowMax[y] = x;
      if (colMin[x] < 0 || y < colMin[x]) colMin[x] = y;
      if (y > colMax[x]) colMax[x] = y;
    }
  }

  return { rowMin, rowMax, colMin, colMax };
}

function repairBounds(values: Int32Array, radius: number, threshold: number, side: 'min' | 'max') {
  const out = new Int32Array(values);
  for (let i = 0; i < values.length; i++) {
    if (values[i] < 0) continue;
    const flankedReference = flankedContourReference(values, i, radius, side);
    const med = localMedian(values, i, Math.max(3, Math.round(radius * 0.45)));
    const reference = flankedReference >= 0 ? flankedReference : med;
    if (reference < 0) continue;

    if (side === 'min' && values[i] > reference + threshold) out[i] = reference;
    if (side === 'max' && values[i] < reference - threshold) out[i] = reference;
  }
  return out;
}

function reconstructEdgeLossMask(
  filledRemainingMask: Uint8Array,
  width: number,
  height: number,
  sensitivity: FixedDefoliationSensitivity,
  leafRegionConstraint: Uint8Array,
) {
  const { rowMin, rowMax, colMin, colMax } = getAxisBounds(filledRemainingMask, width, height);
  const minDim = Math.min(width, height);
  const sensitivityScale = sensitivity === 'conservador' ? 0.72 : sensitivity === 'sensivel' ? 1.35 : 1;
  const radius = Math.max(8, Math.round(minDim * 0.07 * sensitivityScale));
  const threshold = Math.max(3, Math.round(minDim * 0.007 / sensitivityScale));
  const repairedRowMin = repairBounds(rowMin, radius, threshold, 'min');
  const repairedRowMax = repairBounds(rowMax, radius, threshold, 'max');
  const repairedColMin = repairBounds(colMin, radius, threshold, 'min');
  const repairedColMax = repairBounds(colMax, radius, threshold, 'max');
  const reconstructedByRows = new Uint8Array(width * height);
  const reconstructedByColumns = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const minX = repairedRowMin[y];
    const maxX = repairedRowMax[y];
    if (minX < 0 || maxX < minX) continue;
    for (let x = minX; x <= maxX; x++) {
      const p = y * width + x;
      if (leafRegionConstraint[p]) reconstructedByRows[p] = 1;
    }
  }

  for (let x = 0; x < width; x++) {
    const minY = repairedColMin[x];
    const maxY = repairedColMax[x];
    if (minY < 0 || maxY < minY) continue;
    for (let y = minY; y <= maxY; y++) {
      const p = y * width + x;
      if (leafRegionConstraint[p]) reconstructedByColumns[p] = 1;
    }
  }

  const reconstructed = unionMasks(reconstructedByRows, reconstructedByColumns);
  const rawEdgeLoss = constrainMask(subtractMasks(reconstructed, filledRemainingMask), leafRegionConstraint);
  const minPixels = Math.max(6, Math.round(countMask(filledRemainingMask) * (sensitivity === 'sensivel' ? 0.00007 : 0.00013)));
  return filterDamageComponents(rawEdgeLoss, filledRemainingMask, width, height, minPixels);
}

function estimateDefoliationWithFixedSensitivity(
  remainingLeafMask: Uint8Array,
  width: number,
  height: number,
  sensitivity: FixedDefoliationSensitivity,
  options: DefoliationOptions = {},
  automaticAdjustment = false,
): DefoliationResult {
  const leafRegionMask =
    options.leafRegionConstraint && options.leafRegionConstraint.length === remainingLeafMask.length
      ? options.leafRegionConstraint
      : fullMask(width * height);
  const constrainedRemaining = constrainMask(remainingLeafMask, leafRegionMask);
  const cleanRemaining = constrainMask(
    removeSmallComponents(openMask(constrainedRemaining, width, height, 1), width, height, Math.max(16, width * height * 0.0004)),
    leafRegionMask,
  );
  const areaFoliarRemanescente = countMask(cleanRemaining);
  const filledRemainingMask = constrainMask(fillInternalHoles(cleanRemaining, width, height), leafRegionMask);
  const rawHoleMask = constrainMask(subtractMasks(filledRemainingMask, cleanRemaining), leafRegionMask);
  const minHolePixels = Math.max(5, Math.round(areaFoliarRemanescente * (sensitivity === 'sensivel' ? 0.00005 : 0.0001)));
  const internalHoleMask = filterDamageComponents(rawHoleMask, cleanRemaining, width, height, minHolePixels);
  const filledForEdge = unionMasks(cleanRemaining, internalHoleMask);
  const edgeLossMask = reconstructEdgeLossMask(filledForEdge, width, height, sensitivity, leafRegionMask);
  const estimatedOriginalLeafMask = constrainMask(unionMasks(cleanRemaining, internalHoleMask, edgeLossMask), leafRegionMask);
  const damageMask = constrainMask(subtractMasks(estimatedOriginalLeafMask, cleanRemaining), leafRegionMask);
  const areaFoliarOriginalEstimada = countMask(estimatedOriginalLeafMask);
  const areaFoliarConsumida = countMask(damageMask);
  const percentualDesfolha =
    areaFoliarOriginalEstimada > 0 ? (areaFoliarConsumida / areaFoliarOriginalEstimada) * 100 : 0;
  const consumedRatio = areaFoliarOriginalEstimada > 0 ? areaFoliarConsumida / areaFoliarOriginalEstimada : 0;
  const confidence = clamp(0.78 - Math.abs(consumedRatio - 0.18) * 0.18 + Math.min(0.12, areaFoliarRemanescente / (width * height)), 0.42, 0.96);

  return {
    leafRegionMask,
    remainingLeafMask: cleanRemaining,
    estimatedOriginalLeafMask,
    damageMask,
    internalHoleMask,
    edgeLossMask,
    areaFoliarRemanescente,
    areaFoliarConsumida,
    areaFoliarOriginalEstimada,
    percentualDesfolha: roundPercent(percentualDesfolha),
    confidence: roundPercent(confidence),
    selectedSensitivity: sensitivity,
    automaticAdjustment,
    segmentationIssues: [],
    debugMaskCounts: {
      leafRegion: countMask(leafRegionMask),
      remainingLeaf: areaFoliarRemanescente,
      internalHole: countMask(internalHoleMask),
      edgeDamage: countMask(edgeLossMask),
      finalDamage: areaFoliarConsumida,
      estimatedOriginal: areaFoliarOriginalEstimada,
    },
  };
}

function scoreAutomaticCandidate(result: DefoliationResult) {
  const originalArea = Math.max(1, result.areaFoliarOriginalEstimada);
  const consumedRatio = result.areaFoliarConsumida / originalArea;
  const edgeRatio = countMask(result.edgeLossMask) / originalArea;
  const holeRatio = countMask(result.internalHoleMask) / originalArea;
  const edgeDominance = edgeRatio / Math.max(0.01, holeRatio + edgeRatio);
  const severePenalty = Math.max(0, consumedRatio - 0.5) * 1.2;
  const edgePenalty = Math.max(0, edgeRatio - 0.24) * 1.5 + Math.max(0, edgeDominance - 0.92) * 0.12;
  const sensitivityBias =
    result.selectedSensitivity === 'padrao' ? 0.025 : result.selectedSensitivity === 'conservador' ? 0.01 : -0.015;

  return result.confidence + sensitivityBias - severePenalty - edgePenalty;
}

export function estimateDefoliationFromRemainingMask(
  remainingLeafMask: Uint8Array,
  width: number,
  height: number,
  options: DefoliationOptions = {},
): DefoliationResult {
  const sensitivity = options.sensitivity || 'automatico';

  if (sensitivity !== 'automatico') {
    return estimateDefoliationWithFixedSensitivity(remainingLeafMask, width, height, sensitivity, options, false);
  }

  const candidates = (['conservador', 'padrao', 'sensivel'] as const).map((candidate) =>
    estimateDefoliationWithFixedSensitivity(remainingLeafMask, width, height, candidate, options, true),
  );

  return candidates.reduce((best, current) =>
    scoreAutomaticCandidate(current) > scoreAutomaticCandidate(best) ? current : best,
  );
}

function buildLeafColorMasks(imageData: RgbaImageLike, width: number, height: number) {
  const total = width * height;
  const greenMask = new Uint8Array(total);
  const supportMask = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    const offset = i * 4;
    const r = imageData.data[offset];
    const g = imageData.data[offset + 1];
    const b = imageData.data[offset + 2];
    const a = imageData.data[offset + 3];
    if (a < 60) continue;

    const { h, s, v } = rgbToHsv(r, g, b);
    const exg = 2 * g - r - b;
    const neutralBackground = s < 12 && v > 58;
    const veryDark = v < 14 || (v < 20 && s < 18);
    const greenTissue = h >= 32 && h <= 180 && s > 8 && v > 10 && exg > -55;
    const yellowTissue = h >= 18 && h <= 100 && s > 9 && v > 20 && g >= b * 0.9;
    const brownLeafTissue = h >= 3 && h <= 68 && s > 11 && v >= 18 && v <= 82 && exg > -96 && g >= b * 0.58;
    const possibleLeafTissue = greenTissue || yellowTissue;
    const possibleRemainingTissue = possibleLeafTissue || brownLeafTissue;

    if (!neutralBackground && !veryDark && possibleLeafTissue) {
      greenMask[i] = 1;
    }

    if (!neutralBackground && !veryDark && possibleRemainingTissue) {
      supportMask[i] = 1;
    }
  }

  return { greenMask: openMask(greenMask, width, height, 1), supportMask: closeMask(supportMask, width, height, 1) };
}

function selectMainLeafComponent(mask: Uint8Array, width: number, height: number) {
  const total = width * height;
  const components = getComponents(mask, width, height);
  const minPixels = Math.max(80, Math.round(total * 0.0012));
  let best: Component | undefined;
  let bestScore = -Infinity;

  for (const component of components) {
    if (component.count < minPixels) continue;
    const cx = (component.minX + component.maxX) / 2;
    const cy = (component.minY + component.maxY) / 2;
    const centerDistance = Math.hypot((cx - width / 2) / width, (cy - height / 2) / height);
    const areaRatio = component.count / total;
    const borderPenalty = component.touchesBorder ? 2.5 : 0;
    const giantPenalty = areaRatio > 0.55 ? 2.5 : 0;
    const score = Math.min(2, areaRatio * 16) + Math.max(0, 1.2 - centerDistance * 2.6) - borderPenalty - giantPenalty;
    if (score > bestScore) {
      best = component;
      bestScore = score;
    }
  }

  return componentToMask(best, total);
}

export function computeCaterpillarDefoliation(
  imageData: RgbaImageLike,
  width: number,
  height: number,
  options: DefoliationOptions = {},
) {
  const { greenMask, supportMask } = buildLeafColorMasks(imageData, width, height);
  let leafRegionMask: Uint8Array;
  let remainingLeafMask: Uint8Array;
  let segmentationConfidence = 0.72;
  let segmentationIssues: string[] = [];

  const adaptive = segmentLeaf(
    { data: imageData.data, width, height } as ImageData,
    width,
    height,
  );
  const adaptiveShare = adaptive.leafArea / Math.max(1, width * height);
  const adaptiveUsable = adaptive.leafArea >= Math.max(80, width * height * 0.01) && adaptiveShare < 0.985;

  if (adaptiveUsable) {
    leafRegionMask = buildLeafRegionConstraint(adaptive.leafMask, width, height);
    segmentationConfidence = adaptive.confidence;
    segmentationIssues = adaptive.issues;
  } else {
    const mainLeafSeedMask = selectMainLeafComponent(greenMask, width, height);
    leafRegionMask = buildLeafRegionConstraint(mainLeafSeedMask, width, height);
    segmentationConfidence = Math.min(0.48, adaptive.confidence);
    segmentationIssues = [
      ...adaptive.issues,
      'A seleção automática teve baixa confiança; refaça a foto com a folha centralizada e maior separação do fundo.',
    ];
  }

  remainingLeafMask = constrainMask(supportMask, leafRegionMask);

  const result = estimateDefoliationFromRemainingMask(remainingLeafMask, width, height, {
    ...options,
    leafRegionConstraint: options.leafRegionConstraint || leafRegionMask,
  });

  return {
    ...result,
    confidence: roundPercent(clamp(result.confidence * 0.55 + segmentationConfidence * 0.45, 0.25, 0.97)),
    segmentationIssues,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function levelFromPercent(percent: number): SeverityLevel {
  if (percent <= 0) return 'saudavel';
  if (percent <= 5) return 'baixa';
  if (percent <= 25) return 'media';
  return 'alta';
}

function maskBounds(mask: Uint8Array, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function isInInterestArea(area: DamageInterestAreaId, x: number, y: number, bounds: ReturnType<typeof maskBounds>) {
  if (area === 'folhaInteira') return true;
  if (!bounds) return false;

  const nx = (x - bounds.minX) / Math.max(1, bounds.width - 1);
  const ny = (y - bounds.minY) / Math.max(1, bounds.height - 1);
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return false;

  if (area === 'apice') return ny <= 1 / 3;
  if (area === 'base') return ny >= 2 / 3;

  const margin = 0.18;
  return nx <= margin || nx >= 1 - margin || ny <= margin || ny >= 1 - margin;
}

function summarizeInterestAreas(
  defoliation: DefoliationResult,
  width: number,
  height: number,
  scaleUp: number,
): AreaInterestResult[] {
  const bounds = maskBounds(defoliation.estimatedOriginalLeafMask, width, height);

  return DAMAGE_INTEREST_AREAS.map((area) => {
    let areaFoliarTotal = 0;
    let areaFoliarVisivel = 0;
    let areaDanificada = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (!defoliation.estimatedOriginalLeafMask[p] || !isInInterestArea(area.id, x, y, bounds)) continue;
        areaFoliarTotal++;
        if (defoliation.remainingLeafMask[p]) areaFoliarVisivel++;
        if (defoliation.damageMask[p]) areaDanificada++;
      }
    }

    const scaledTotal = Math.round(areaFoliarTotal * scaleUp);
    const scaledVisible = Math.round(areaFoliarVisivel * scaleUp);
    const scaledDamaged = Math.round(areaDanificada * scaleUp);

    return {
      id: area.id,
      label: area.label,
      shortLabel: area.shortLabel,
      areaFoliarTotal: scaledTotal,
      areaFoliarVisivel: scaledVisible,
      areaDanificada: scaledDamaged,
      areaPreservada: Math.max(0, scaledTotal - scaledDamaged),
      danoPercentual: roundPercent(areaFoliarTotal > 0 ? (areaDanificada / areaFoliarTotal) * 100 : 0),
    };
  });
}

function rgbaDataUrl(data: Uint8ClampedArray, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  const output = context.createImageData(width, height);
  output.data.set(data);
  context.putImageData(output, 0, 0);
  return canvas.toDataURL('image/png');
}

function renderIsolatedLeaf(
  imageData: RgbaImageLike,
  tissueMask: Uint8Array,
  width: number,
  height: number,
) {
  const output = new Uint8ClampedArray(width * height * 4);
  output.fill(255);
  for (let p = 0; p < tissueMask.length; p++) {
    if (!tissueMask[p]) continue;
    const offset = p * 4;
    output[offset] = imageData.data[offset];
    output[offset + 1] = imageData.data[offset + 1];
    output[offset + 2] = imageData.data[offset + 2];
  }
  return output;
}

function renderSolidMask(mask: Uint8Array, rgb: [number, number, number]) {
  const output = new Uint8ClampedArray(mask.length * 4);
  output.fill(255);
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const offset = p * 4;
    output[offset] = rgb[0];
    output[offset + 1] = rgb[1];
    output[offset + 2] = rgb[2];
  }
  return output;
}

function renderDefoliationOverlay(
  imageData: RgbaImageLike,
  remainingMask: Uint8Array,
  damageMask: Uint8Array,
  expectedMask: Uint8Array,
  width: number,
  height: number,
) {
  const output = renderIsolatedLeaf(imageData, remainingMask, width, height);
  const expectedBoundary = dilate(maskBoundary(expectedMask, width, height), width, height, Math.max(1, Math.round(Math.min(width, height) * 0.002)));
  for (let p = 0; p < expectedMask.length; p++) {
    const offset = p * 4;
    if (damageMask[p]) {
      output[offset] = 249;
      output[offset + 1] = 115;
      output[offset + 2] = 22;
    } else if (expectedBoundary[p]) {
      output[offset] = 15;
      output[offset + 1] = 118;
      output[offset + 2] = 110;
    }
  }
  return output;
}

export async function analyzeCaterpillarDefoliation(
  src: string,
  cultura: string,
  observacoes: string | undefined,
  areaInteresse: DamageInterestAreaId = 'folhaInteira',
  sensibilidade: DefoliationSensitivity = 'automatico',
): Promise<CaterpillarDamageResult> {
  const img = await loadImage(src);
  const fullWidth = img.naturalWidth || img.width;
  const fullHeight = img.naturalHeight || img.height;
  const maxDim = 800;
  const scale = Math.min(1, maxDim / Math.max(fullWidth, fullHeight));
  const width = Math.max(1, Math.round(fullWidth * scale));
  const height = Math.max(1, Math.round(fullHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const defoliation = computeCaterpillarDefoliation(imageData, width, height, {
    sensitivity: sensibilidade,
  });
  const scaleUp = (fullWidth * fullHeight) / Math.max(1, width * height);
  const areasInteresse = summarizeInterestAreas(defoliation, width, height, scaleUp);
  const selectedArea = areasInteresse.find((area) => area.id === areaInteresse) ?? areasInteresse[0];

  const isolated = rgbaDataUrl(renderIsolatedLeaf(imageData, defoliation.remainingLeafMask, width, height), width, height);
  const present = rgbaDataUrl(renderSolidMask(defoliation.remainingLeafMask, [22, 163, 74]), width, height);
  const removed = rgbaDataUrl(renderSolidMask(defoliation.damageMask, [249, 115, 22]), width, height);
  const estimatedContour = rgbaDataUrl(
    renderDefoliationOverlay(
      imageData,
      defoliation.remainingLeafMask,
      new Uint8Array(defoliation.damageMask.length),
      defoliation.estimatedOriginalLeafMask,
      width,
      height,
    ),
    width,
    height,
  );
  const overlay = rgbaDataUrl(
    renderDefoliationOverlay(
      imageData,
      defoliation.remainingLeafMask,
      defoliation.damageMask,
      defoliation.estimatedOriginalLeafMask,
      width,
      height,
    ),
    width,
    height,
  );

  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    cultura,
    observacoes,
    areaInteresse: selectedArea.id,
    areaFoliarTotal: selectedArea.areaFoliarTotal,
    areaFoliarVisivel: selectedArea.areaFoliarVisivel,
    areaDanificada: selectedArea.areaDanificada,
    areaFurosInternos: Math.round(countMask(defoliation.internalHoleMask) * scaleUp),
    areaPerdaMarginal: Math.round(countMask(defoliation.edgeLossMask) * scaleUp),
    areaPreservada: selectedArea.areaPreservada,
    danoPercentual: selectedArea.danoPercentual,
    areasInteresse,
    nivel: levelFromPercent(selectedArea.danoPercentual),
    confianca: defoliation.confidence,
    imageDataUrl: src,
    processedImageDataUrl: overlay,
    visualizacoes: {
      folhaIsolada: isolated,
      areaPresente: present,
      areaRemovida: removed,
      contornoEstimado: estimatedContour,
      sobreposicao: overlay,
    },
    ajusteMascara: defoliation.selectedSensitivity,
    ajusteAutomatico: defoliation.automaticAdjustment,
    avisosSegmentacao: defoliation.segmentationIssues,
  };
}

function maskBoundary(mask: Uint8Array, width: number, height: number) {
  const boundary = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (!mask[p]) continue;
      if (
        x === 0 ||
        y === 0 ||
        x === width - 1 ||
        y === height - 1 ||
        !mask[p - 1] ||
        !mask[p + 1] ||
        !mask[p - width] ||
        !mask[p + width]
      ) {
        boundary[p] = 1;
      }
    }
  }
  return boundary;
}

export function applyDamageOverlay(
  imageData: RgbaImageLike,
  damageMask: Uint8Array,
  width: number,
  height: number,
) {
  const output = new Uint8ClampedArray(imageData.data);
  const strokeRadius = clamp(Math.round(Math.min(width, height) * 0.0045), 1, 4);
  const outline = dilate(maskBoundary(damageMask, width, height), width, height, strokeRadius);
  for (let i = 0; i < width * height; i++) {
    if (!outline[i]) continue;
    const offset = i * 4;
    output[offset] = 255;
    output[offset + 1] = 102;
    output[offset + 2] = 0;
    output[offset + 3] = 255;
  }
  return output;
}

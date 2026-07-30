/**
 * PhytoPathometric - leafDiseaseAnalysis.ts
 * Classifica doencas apenas dentro da leafMask e usa a mesma mascara no calculo
 * e na visualizacao.
 */

import {
  loadOrientedImageData,
  segmentLeaf,
  countPixels,
  closeMask,
  dilateN,
  fillHoles,
  rgbToLab,
  type LeafSegmentation,
  type LeafSegmentationDiagnostics,
} from './leafSegmentation';

export type TissueClass = 'healthy' | 'chlorosis' | 'necrosis' | 'removed' | 'uncertain';

export interface LeafDiseaseVisualizations {
  backgroundRemovedImageDataUrl: string;
  leafMaskImageDataUrl: string;
  overlayImageDataUrl: string;
  segmentationMapImageDataUrl: string;
  contourImageDataUrl: string;
  classImageDataUrls: {
    healthy: string;
    chlorosis: string;
    necrosis: string;
    removed: string;
    uncertain: string;
  };
  debugImageDataUrls: {
    initialMask: string;
    backgroundRemovedMask: string;
    components: string;
    selectedComponent: string;
    finalMask: string;
    background: string;
  };
}

export interface LeafDiseaseResult {
  width: number;
  height: number;
  visibleLeafMask: Uint8Array;
  leafMask: Uint8Array;
  estimatedLeafMask: Uint8Array;
  healthyMask: Uint8Array;
  chlorosisMask: Uint8Array;
  necrosisMask: Uint8Array;
  uncertainMask: Uint8Array;
  removedMask: Uint8Array;
  totalLeafArea: number;
  estimatedLeafArea: number;
  visibleLeafArea: number;
  healthyPixels: number;
  chlorosisPixels: number;
  necrosisPixels: number;
  uncertainPixels: number;
  removedPixels: number;
  healthyPercentage: number;
  chlorosisPercentage: number;
  necrosisPercentage: number;
  removedPercentage: number;
  uncertainPercentage: number;
  severityPercentage: number;
  confidence: number;
  quality: 'alto' | 'moderado' | 'baixo';
  issues: string[];
  reliable: boolean;
  method: string;
  timings: LeafDiseaseTimings;
  processedImageDataUrl: string;
  visualizations: LeafDiseaseVisualizations;
  segmentationDiagnostics: LeafSegmentationDiagnostics;
}

export interface LeafDiseaseTimings {
  decodeMs: number;
  segmentationMs: number;
  normalizationMs: number;
  classificationMs: number;
  postprocessMs: number;
  overlayMs: number;
  totalMs: number;
}

export interface CalibrationSamples {
  healthy?: Array<{ x: number; y: number }>;
  chlorosis?: Array<{ x: number; y: number }>;
  necrosis?: Array<{ x: number; y: number }>;
}

export interface AnalyzeOptions {
  calibration?: CalibrationSamples;
  workingMaxSide?: number;
  signal?: AbortSignal;
  onProgress?: (progress: number, stage: string) => void;
  debug?: boolean;
}

function boxBlurMasked(
  src: Float32Array,
  mask: Uint8Array,
  w: number,
  h: number,
  radius: number,
): Float32Array {
  const sum = new Float64Array((w + 1) * (h + 1));
  const cnt = new Float64Array((w + 1) * (h + 1));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = (y + 1) * (w + 1) + (x + 1);
      const v = mask[p] ? src[p] : 0;
      const c = mask[p] ? 1 : 0;
      sum[i] = v + sum[i - 1] + sum[i - (w + 1)] - sum[i - 1 - (w + 1)];
      cnt[i] = c + cnt[i - 1] + cnt[i - (w + 1)] - cnt[i - 1 - (w + 1)];
    }
  }

  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const y0 = Math.max(0, y - radius);
      const x1 = Math.min(w - 1, x + radius);
      const y1 = Math.min(h - 1, y + radius);
      const iA = y0 * (w + 1) + x0;
      const iB = y0 * (w + 1) + (x1 + 1);
      const iC = (y1 + 1) * (w + 1) + x0;
      const iD = (y1 + 1) * (w + 1) + (x1 + 1);
      const s = sum[iD] - sum[iB] - sum[iC] + sum[iA];
      const c = cnt[iD] - cnt[iB] - cnt[iC] + cnt[iA];
      out[y * w + x] = c > 0 ? s / c : 0;
    }
  }

  return out;
}

function normalizeIllumination(
  lab: { L: Float32Array; a: Float32Array; b: Float32Array },
  leafMask: Uint8Array,
  w: number,
  h: number,
): { L: Float32Array; a: Float32Array; b: Float32Array } {
  const n = w * h;
  const L = Float32Array.from(lab.L);
  const A = Float32Array.from(lab.a);
  const B = Float32Array.from(lab.b);

  let cnt = 0;
  let meanL = 0;
  for (let p = 0; p < n; p++) {
    if (!leafMask[p]) continue;
    meanL += L[p];
    cnt++;
  }
  if (cnt === 0) return { L, a: A, b: B };
  meanL /= cnt;

  const radius = Math.max(12, Math.round(Math.min(w, h) * 0.22));
  const illum = boxBlurMasked(L, leafMask, w, h, radius);

  for (let p = 0; p < n; p++) {
    if (!leafMask[p]) continue;
    const base = illum[p] > 1 ? illum[p] : meanL;
    const gain = Math.max(0.75, Math.min(1.45, meanL / base));
    L[p] = Math.max(0, Math.min(100, L[p] * gain));
  }

  return { L, a: A, b: B };
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function emptyTimings(): LeafDiseaseTimings {
  return {
    decodeMs: 0,
    segmentationMs: 0,
    normalizationMs: 0,
    classificationMs: 0,
    postprocessMs: 0,
    overlayMs: 0,
    totalMs: 0,
  };
}

function roundMs(value: number): number {
  return Math.round(value * 10) / 10;
}

function medianOf(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

interface ClassModel {
  L: number;
  a: number;
  b: number;
}

function deltaE(L1: number, a1: number, b1: number, model: ClassModel): number {
  const dL = (L1 - model.L) * 0.5;
  const da = a1 - model.a;
  const db = b1 - model.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

function rgbFeatures(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let hue = 0;
  if (delta > 1e-6) {
    if (max === rn) hue = 60 * ((((gn - bn) / delta) % 6 + 6) % 6);
    else if (max === gn) hue = 60 * ((bn - rn) / delta + 2);
    else hue = 60 * ((rn - gn) / delta + 4);
  }
  const sum = r + g + b + 1e-6;
  return {
    hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
    exg: (2 * g - r - b) / 255,
    exr: (1.4 * r - g) / 255,
    vari: (g - r) / Math.max(8, g + r - b),
    normalizedGreen: g / sum,
  };
}

function classifyTissue(
  imageData: ImageData,
  lab: { L: Float32Array; a: Float32Array; b: Float32Array },
  leafMask: Uint8Array,
  w: number,
  h: number,
  calibration?: CalibrationSamples,
): {
  predHealthy: Uint8Array;
  predChlorosis: Uint8Array;
  predNecrosis: Uint8Array;
  predUncertain: Uint8Array;
  mode: 'calibrado' | 'automatico';
} {
  const n = w * h;
  const { L, a: A, b: B } = lab;
  const predHealthy = new Uint8Array(n);
  const predChlorosis = new Uint8Array(n);
  const predNecrosis = new Uint8Array(n);
  const predUncertain = new Uint8Array(n);
  const localL = boxBlurMasked(L, leafMask, w, h, Math.max(1, Math.round(Math.min(w, h) * 0.004)));

  const sampleAt = (pts?: Array<{ x: number; y: number }>): ClassModel | null => {
    if (!pts?.length) return null;
    const ls: number[] = [];
    const as: number[] = [];
    const bs: number[] = [];
    for (const pt of pts) {
      const x = Math.round(pt.x * (w - 1));
      const y = Math.round(pt.y * (h - 1));
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const p = ny * w + nx;
          if (!leafMask[p]) continue;
          ls.push(L[p]);
          as.push(A[p]);
          bs.push(B[p]);
        }
      }
    }
    return ls.length ? { L: medianOf(ls), a: medianOf(as), b: medianOf(bs) } : null;
  };

  const calHealthy = sampleAt(calibration?.healthy);
  const calChlorosis = sampleAt(calibration?.chlorosis);
  const calNecrosis = sampleAt(calibration?.necrosis);
  const calibrado = Boolean(calHealthy && (calChlorosis || calNecrosis));

  const leafPix: number[] = [];
  for (let p = 0; p < n; p++) if (leafMask[p]) leafPix.push(p);
  if (!leafPix.length) {
    return { predHealthy, predChlorosis, predNecrosis, predUncertain, mode: 'automatico' };
  }

  // Limita apenas a amostra estatistica; todos os pixels continuam classificados.
  const stride = Math.max(1, Math.ceil(leafPix.length / 50000));
  const modelSample = leafPix.filter((_, index) => index % stride === 0);
  const byA = modelSample.sort((p, q) => A[p] - A[q]);
  const greenCore = byA.slice(0, Math.max(1, Math.round(byA.length * 0.38)));
  const autoHealthy: ClassModel = {
    L: medianOf(greenCore.map((p) => L[p])),
    a: medianOf(greenCore.map((p) => A[p])),
    b: medianOf(greenCore.map((p) => B[p])),
  };
  const healthy = calHealthy ?? autoHealthy;
  const dists = greenCore.map((p) => deltaE(L[p], A[p], B[p], healthy));
  const medDist = medianOf(dists);
  const madDist = medianOf(dists.map((distance) => Math.abs(distance - medDist)));
  const tolHealthy = Math.max(7, Math.min(22, medDist + 3 * 1.4826 * madDist));

  for (const p of leafPix) {
    const i = p * 4;
    const l = L[p];
    const a = A[p];
    const b = B[p];
    const chroma = Math.hypot(a, b);
    const color = rgbFeatures(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
    const textureContrast = Math.abs(l - localL[p]);
    const dHealthy = deltaE(l, a, b, healthy);

    const reflection = l > 91 && (chroma < 15 || color.saturation < 0.09);
    const deepShadow = l < 9 && color.value < 0.12;
    if (reflection || deepShadow) {
      predUncertain[p] = 1;
      continue;
    }

    const greenShadow =
      color.hue >= 62 && color.hue <= 178 &&
      color.exg > -0.04 && color.vari > -0.08 && a < healthy.a + 10;
    const greenEvidence =
      (color.hue >= 58 && color.hue <= 175 && color.saturation >= 0.08) ||
      color.exg > 0.06 || color.normalizedGreen > 0.355;

    if ((dHealthy <= tolHealthy && greenEvidence) || greenShadow) {
      predHealthy[p] = 1;
      continue;
    }

    const toChl = calChlorosis
      ? deltaE(l, a, b, calChlorosis)
      : deltaE(l, a, b, {
          L: Math.max(healthy.L, 60),
          a: Math.min(4, healthy.a + 16),
          b: Math.max(healthy.b + 8, 34),
        });
    const toNec = calNecrosis
      ? deltaE(l, a, b, calNecrosis)
      : deltaE(l, a, b, { L: Math.min(healthy.L * 0.62, 42), a: 10, b: 18 });

    const brownHue = color.hue <= 65 || color.hue >= 345;
    const necrosisPlausible =
      !greenShadow &&
      brownHue &&
      color.saturation >= 0.1 &&
      a > healthy.a + 5 &&
      (l < healthy.L * 0.88 || color.exr > 0.08 || textureContrast > 4.5);
    const chlorosisPlausible =
      color.hue >= 34 && color.hue <= 100 &&
      color.saturation >= 0.1 &&
      b > healthy.b + 5 &&
      a > healthy.a + 3 &&
      l > Math.max(18, healthy.L * 0.68) &&
      color.normalizedGreen >= 0.31;

    const ambiguous = Math.abs(toNec - toChl) < 2.2 && necrosisPlausible && chlorosisPlausible;
    if (ambiguous) predUncertain[p] = 1;
    else if (necrosisPlausible && (!chlorosisPlausible || toNec < toChl)) predNecrosis[p] = 1;
    else if (chlorosisPlausible && (!necrosisPlausible || toChl <= toNec)) predChlorosis[p] = 1;
    else if (greenEvidence || dHealthy <= tolHealthy * 1.45) predHealthy[p] = 1;
    else predUncertain[p] = 1;
  }

  return {
    predHealthy,
    predChlorosis,
    predNecrosis,
    predUncertain,
    mode: calibrado ? 'calibrado' : 'automatico',
  };
}

function removeSmallComponents(mask: Uint8Array, w: number, h: number, minPixels: number): Uint8Array {
  const labels = new Int32Array(w * h).fill(-1);
  const sizes: number[] = [];
  const stack: number[] = [];
  let label = 0;

  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || labels[s] !== -1) continue;
    let size = 0;
    stack.length = 0;
    stack.push(s);
    labels[s] = label;

    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const x = p % w;
      const y = Math.floor(p / w);

      if (x > 0) {
        const q = p - 1;
        if (mask[q] && labels[q] === -1) {
          labels[q] = label;
          stack.push(q);
        }
      }
      if (x < w - 1) {
        const q = p + 1;
        if (mask[q] && labels[q] === -1) {
          labels[q] = label;
          stack.push(q);
        }
      }
      if (y > 0) {
        const q = p - w;
        if (mask[q] && labels[q] === -1) {
          labels[q] = label;
          stack.push(q);
        }
      }
      if (y < h - 1) {
        const q = p + w;
        if (mask[q] && labels[q] === -1) {
          labels[q] = label;
          stack.push(q);
        }
      }
    }

    sizes[label] = size;
    label++;
  }

  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    const l = labels[i];
    if (l !== -1 && sizes[l] >= minPixels) out[i] = 1;
  }
  return out;
}

function refineLesion(mask: Uint8Array, w: number, h: number, leafArea: number): Uint8Array {
  const minPixels = Math.max(6, Math.round(leafArea * 0.00012));
  let out = removeSmallComponents(mask, w, h, minPixels);
  out = closeMask(out, w, h, 1);
  out = removeSmallComponents(out, w, h, minPixels);
  return out;
}

function andInPlace(pred: Uint8Array, leafMask: Uint8Array): Uint8Array {
  const out = new Uint8Array(pred.length);
  for (let p = 0; p < pred.length; p++) {
    out[p] = pred[p] && leafMask[p] ? 1 : 0;
  }
  return out;
}

interface EstimatedLeafArea {
  visibleMask: Uint8Array;
  estimatedMask: Uint8Array;
  removedMask: Uint8Array;
  issues: string[];
}

function clusterBackgroundLab(ls: number[], as: number[], bs: number[]): ClassModel[] {
  const order = ls.map((_, index) => index).sort((left, right) => ls[left] - ls[right]);
  const seeds = [0.18, 0.5, 0.82].map((quantile) => {
    const index = order[Math.min(order.length - 1, Math.round((order.length - 1) * quantile))];
    return { L: ls[index], a: as[index], b: bs[index] };
  });

  for (let iteration = 0; iteration < 5; iteration++) {
    const sums = seeds.map(() => ({ L: 0, a: 0, b: 0, count: 0 }));
    for (let index = 0; index < ls.length; index++) {
      let best = 0;
      let bestDistance = Infinity;
      for (let cluster = 0; cluster < seeds.length; cluster++) {
        const distance = deltaE(ls[index], as[index], bs[index], seeds[cluster]);
        if (distance < bestDistance) {
          best = cluster;
          bestDistance = distance;
        }
      }
      sums[best].L += ls[index];
      sums[best].a += as[index];
      sums[best].b += bs[index];
      sums[best].count++;
    }
    for (let cluster = 0; cluster < seeds.length; cluster++) {
      if (!sums[cluster].count) continue;
      seeds[cluster] = {
        L: sums[cluster].L / sums[cluster].count,
        a: sums[cluster].a / sums[cluster].count,
        b: sums[cluster].b / sums[cluster].count,
      };
    }
  }
  return seeds;
}

function estimateRemovedArea(
  visibleInput: Uint8Array,
  lab: { L: Float32Array; a: Float32Array; b: Float32Array },
  w: number,
  h: number,
): EstimatedLeafArea {
  const visibleMask = visibleInput.slice();
  const internalShape = fillHoles(visibleMask, w, h);
  const radius = Math.max(1, Math.min(8, Math.round(Math.min(w, h) * 0.01)));
  const estimatedMask = fillHoles(closeMask(visibleMask, w, h, radius), w, h);
  const bgL: number[] = [];
  const bgA: number[] = [];
  const bgB: number[] = [];
  const stride = Math.max(1, Math.ceil((w * h) / 60000));

  for (let p = 0; p < estimatedMask.length; p += stride) {
    if (estimatedMask[p]) continue;
    bgL.push(lab.L[p]);
    bgA.push(lab.a[p]);
    bgB.push(lab.b[p]);
  }

  if (bgL.length < 20) {
    return { visibleMask, estimatedMask: visibleMask.slice(), removedMask: new Uint8Array(visibleMask.length), issues: [] };
  }

  const backgroundModels = clusterBackgroundLab(bgL, bgA, bgB);
  const distanceToBackground = (l: number, a: number, b: number) => Math.min(
    ...backgroundModels.map((model) => deltaE(l, a, b, model)),
  );
  const bgDistances = bgL.map((l, index) => distanceToBackground(l, bgA[index], bgB[index]));
  const medianDistance = medianOf(bgDistances);
  const madDistance = medianOf(bgDistances.map((distance) => Math.abs(distance - medianDistance)));
  const backgroundTolerance = Math.max(4.5, Math.min(16, medianDistance + 2.8 * 1.4826 * madDistance));
  const removedMask = new Uint8Array(visibleMask.length);
  const gap = new Uint8Array(visibleMask.length);
  for (let p = 0; p < gap.length; p++) gap[p] = estimatedMask[p] && !visibleMask[p] ? 1 : 0;
  const visited = new Uint8Array(gap.length);
  const stack: number[] = [];
  const component: number[] = [];
  const minRemovedEvidence = Math.max(32, Math.round(w * h * 0.0008));

  for (let start = 0; start < gap.length; start++) {
    if (!gap[start] || visited[start]) continue;
    stack.length = 0;
    component.length = 0;
    stack.push(start);
    visited[start] = 1;
    let backgroundLike = 0;
    let enclosed = 0;
    let visibleBoundary = 0;

    while (stack.length) {
      const p = stack.pop()!;
      component.push(p);
      if (distanceToBackground(lab.L[p], lab.a[p], lab.b[p]) <= backgroundTolerance) backgroundLike++;
      if (internalShape[p]) enclosed++;
      const x = p % w;
      const y = Math.floor(p / w);
      const visit = (q: number) => {
        if (gap[q] && !visited[q]) {
          visited[q] = 1;
          stack.push(q);
        } else if (visibleInput[q]) {
          visibleBoundary++;
        }
      };
      if (x > 0) visit(p - 1);
      if (x < w - 1) visit(p + 1);
      if (y > 0) visit(p - w);
      if (y < h - 1) visit(p + w);
    }

    const backgroundRatio = backgroundLike / component.length;
    const enclosedRatio = enclosed / component.length;
    const geometricEvidence =
      component.length >= minRemovedEvidence &&
      (enclosedRatio >= 0.9 || visibleBoundary >= Math.sqrt(component.length) * 1.6);
    const isRemoved = backgroundRatio >= 0.78 && geometricEvidence;
    for (const p of component) {
      if (isRemoved) removedMask[p] = 1;
      else visibleMask[p] = 1;
    }
  }

  let removedPixels = countPixels(removedMask);
  let estimatedPixels = countPixels(estimatedMask);
  const issues: string[] = [];
  if (estimatedPixels > 0 && removedPixels / estimatedPixels > 0.32) {
    // Evita transformar um vazamento grande para o fundo em herbivoria.
    removedMask.fill(0);
    for (let p = 0; p < estimatedMask.length; p++) estimatedMask[p] = visibleMask[p];
    removedPixels = 0;
    estimatedPixels = countPixels(estimatedMask);
    issues.push('Reconstrucao de area ausente descartada por baixa confianca.');
  }

  if (removedPixels > Math.max(4, estimatedPixels * 0.001)) {
    issues.push('Lacunas internas ou pequenos recortes foram estimados como area removida.');
  }

  for (let p = 0; p < estimatedMask.length; p++) {
    estimatedMask[p] = visibleMask[p] || removedMask[p] ? 1 : 0;
  }

  return { visibleMask, estimatedMask, removedMask, issues };
}

const CLASS_COLORS = {
  healthy: [22, 163, 74] as const,
  chlorosis: [250, 204, 21] as const,
  necrosis: [124, 45, 18] as const,
  removed: [249, 115, 22] as const,
  uncertain: [148, 163, 184] as const,
};

function imageDataUrl(data: Uint8ClampedArray, w: number, h: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(new ImageData(data, w, h), 0, 0);
  return canvas.toDataURL('image/png');
}

function paintPixel(data: Uint8ClampedArray, p: number, color: readonly [number, number, number], alpha = 1) {
  const i = p * 4;
  data[i] = Math.round(data[i] * (1 - alpha) + color[0] * alpha);
  data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + color[1] * alpha);
  data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + color[2] * alpha);
  data[i + 3] = 255;
}

function createWhiteImage(length: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(length * 4);
  data.fill(255);
  return data;
}

function renderBinaryMask(
  mask: Uint8Array,
  w: number,
  h: number,
  foreground: readonly [number, number, number] = [5, 90, 55],
): string {
  const data = createWhiteImage(mask.length);
  for (let p = 0; p < mask.length; p++) {
    if (mask[p]) paintPixel(data, p, foreground, 1);
  }
  return imageDataUrl(data, w, h);
}

function renderComponentLabels(
  labels: Int32Array,
  selectedLabel: number,
  w: number,
  h: number,
): string {
  const data = createWhiteImage(labels.length);
  const palette = [
    [14, 165, 233], [168, 85, 247], [245, 158, 11], [236, 72, 153],
    [34, 197, 94], [239, 68, 68], [20, 184, 166], [99, 102, 241],
  ] as const;
  for (let p = 0; p < labels.length; p++) {
    const label = labels[p];
    if (label < 0) continue;
    const color = label === selectedLabel ? [5, 90, 55] as const : palette[label % palette.length];
    paintPixel(data, p, color, 1);
  }
  return imageDataUrl(data, w, h);
}

function renderVisualizations(
  imageData: ImageData,
  masks: {
    visible: Uint8Array;
    estimated: Uint8Array;
    healthy: Uint8Array;
    chlorosis: Uint8Array;
    necrosis: Uint8Array;
    removed: Uint8Array;
    uncertain: Uint8Array;
  },
  diagnostics: LeafSegmentationDiagnostics,
  w: number,
  h: number,
): LeafDiseaseVisualizations {
  const n = w * h;
  const backgroundRemoved = createWhiteImage(n);
  const overlay = createWhiteImage(n);
  const map = createWhiteImage(n);
  const contours = createWhiteImage(n);
  const isolated = {
    healthy: createWhiteImage(n),
    chlorosis: createWhiteImage(n),
    necrosis: createWhiteImage(n),
    removed: createWhiteImage(n),
    uncertain: createWhiteImage(n),
  };

  for (let p = 0; p < n; p++) {
    if (masks.visible[p]) {
      const i = p * 4;
      backgroundRemoved[i] = overlay[i] = contours[i] = imageData.data[i];
      backgroundRemoved[i + 1] = overlay[i + 1] = contours[i + 1] = imageData.data[i + 1];
      backgroundRemoved[i + 2] = overlay[i + 2] = contours[i + 2] = imageData.data[i + 2];
    }

    let key: keyof typeof CLASS_COLORS | null = null;
    if (masks.necrosis[p]) key = 'necrosis';
    else if (masks.chlorosis[p]) key = 'chlorosis';
    else if (masks.healthy[p]) key = 'healthy';
    else if (masks.removed[p]) key = 'removed';
    else if (masks.uncertain[p]) key = 'uncertain';
    if (!key) continue;

    const alpha = key === 'healthy' ? 0.34 : key === 'removed' ? 0.92 : 0.54;
    paintPixel(overlay, p, CLASS_COLORS[key], alpha);
    paintPixel(map, p, CLASS_COLORS[key], 1);
    paintPixel(isolated[key], p, CLASS_COLORS[key], 1);
  }

  const classAt = (p: number) => {
    if (masks.necrosis[p]) return 1;
    if (masks.chlorosis[p]) return 2;
    if (masks.healthy[p]) return 3;
    if (masks.removed[p]) return 4;
    if (masks.uncertain[p]) return 5;
    return 0;
  };
  const boundary = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!masks.estimated[p]) continue;
      const own = classAt(p);
      if (
        x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
        classAt(p - 1) !== own || classAt(p + 1) !== own ||
        classAt(p - w) !== own || classAt(p + w) !== own
      ) boundary[p] = 1;
    }
  }
  const contourWidth = Math.max(1, Math.min(3, Math.round(Math.min(w, h) / 350)));
  const thickBoundary = dilateN(boundary, w, h, contourWidth);
  for (let p = 0; p < n; p++) {
    if (!thickBoundary[p]) continue;
    const own = classAt(p);
    const color = own === 1 ? CLASS_COLORS.necrosis
      : own === 2 ? CLASS_COLORS.chlorosis
      : own === 4 ? CLASS_COLORS.removed
      : own === 5 ? CLASS_COLORS.uncertain
      : [5, 90, 55] as const;
    paintPixel(contours, p, color, 1);
  }

  return {
    backgroundRemovedImageDataUrl: imageDataUrl(backgroundRemoved, w, h),
    leafMaskImageDataUrl: renderBinaryMask(masks.visible, w, h),
    overlayImageDataUrl: imageDataUrl(overlay, w, h),
    segmentationMapImageDataUrl: imageDataUrl(map, w, h),
    contourImageDataUrl: imageDataUrl(contours, w, h),
    classImageDataUrls: {
      healthy: imageDataUrl(isolated.healthy, w, h),
      chlorosis: imageDataUrl(isolated.chlorosis, w, h),
      necrosis: imageDataUrl(isolated.necrosis, w, h),
      removed: imageDataUrl(isolated.removed, w, h),
      uncertain: imageDataUrl(isolated.uncertain, w, h),
    },
    debugImageDataUrls: {
      initialMask: renderBinaryMask(diagnostics.initialMask, w, h, [37, 99, 235]),
      backgroundRemovedMask: renderBinaryMask(diagnostics.backgroundRemovedMask, w, h, [14, 165, 233]),
      components: renderComponentLabels(
        diagnostics.componentLabels,
        diagnostics.selectedComponentLabel,
        w,
        h,
      ),
      selectedComponent: renderBinaryMask(diagnostics.selectedComponentMask, w, h, [5, 90, 55]),
      finalMask: renderBinaryMask(diagnostics.finalMask, w, h, [22, 163, 74]),
      background: renderBinaryMask(diagnostics.backgroundMask, w, h, [100, 116, 139]),
    },
  };
}

export type LeafDiseaseCore = Omit<LeafDiseaseResult, 'processedImageDataUrl' | 'visualizations'>;

export function analyzeLeafDiseaseFromImageData(
  imageData: ImageData,
  width: number,
  height: number,
  options: AnalyzeOptions = {},
): LeafDiseaseCore {
  return runPipeline(imageData, width, height, options);
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Analise cancelada.', 'AbortError');
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export async function analyzeLeafDisease(
  src: string,
  options: AnalyzeOptions = {},
): Promise<LeafDiseaseResult> {
  const totalStart = nowMs();
  options.onProgress?.(3, 'Carregando e orientando a imagem');
  throwIfAborted(options.signal);
  const decodeStart = nowMs();
  const { imageData, width, height, bitmap } = await loadOrientedImageData(
    src,
    options.workingMaxSide ?? 1024,
  );
  const decodeMs = nowMs() - decodeStart;
  options.onProgress?.(18, 'Detectando a folha principal');
  throwIfAborted(options.signal);
  await yieldToBrowser();

  const core = runPipeline(imageData, width, height, options);
  core.timings.decodeMs = roundMs(decodeMs);
  options.onProgress?.(78, 'Gerando mapas e contornos');
  throwIfAborted(options.signal);
  await yieldToBrowser();

  const overlayStart = nowMs();
  const visualizations = renderVisualizations(
    imageData,
    {
      visible: core.visibleLeafMask,
      estimated: core.leafMask,
      healthy: core.healthyMask,
      chlorosis: core.chlorosisMask,
      necrosis: core.necrosisMask,
      removed: core.removedMask,
      uncertain: core.uncertainMask,
    },
    core.segmentationDiagnostics,
    width,
    height,
  );
  const processedImageDataUrl = visualizations.overlayImageDataUrl;
  core.timings.overlayMs = roundMs(nowMs() - overlayStart);
  core.timings.totalMs = roundMs(nowMs() - totalStart);
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();
  options.onProgress?.(100, 'Analise concluida');

  if (options.debug || import.meta.env.DEV) {
    console.info('[PhytoPathometric] Diagnostico da segmentacao foliar', {
      totalPixelsImagem: width * height,
      pixelsFundo: width * height - core.totalLeafArea,
      pixelsMascaraFoliar: core.totalLeafArea,
      pixelsSadios: core.healthyPixels,
      pixelsCloroticos: core.chlorosisPixels,
      pixelsNecroticos: core.necrosisPixels,
      pixelsIncertos: core.uncertainPixels,
      componentesRemovidos: core.segmentationDiagnostics.removedComponentCount,
      tempoTotalMs: core.timings.totalMs,
    });
  }

  return { ...core, processedImageDataUrl, visualizations };
}

function runPipeline(
  imageData: ImageData,
  width: number,
  height: number,
  options: AnalyzeOptions,
): LeafDiseaseCore {
  throwIfAborted(options.signal);
  const timings = emptyTimings();
  const segmentationStart = nowMs();
  const seg: LeafSegmentation = segmentLeaf(imageData, width, height);
  timings.segmentationMs = roundMs(nowMs() - segmentationStart);
  options.onProgress?.(38, 'Refinando mascara e removendo o fundo');
  throwIfAborted(options.signal);
  const visibleSegmentationArea = countPixels(seg.leafMask);
  const n = width * height;
  const empty = new Uint8Array(n);

  if (visibleSegmentationArea === 0) {
    return {
      width,
      height,
      visibleLeafMask: seg.leafMask,
      leafMask: seg.leafMask,
      estimatedLeafMask: seg.leafMask,
      healthyMask: empty,
      chlorosisMask: empty.slice(),
      necrosisMask: empty.slice(),
      uncertainMask: empty.slice(),
      removedMask: empty.slice(),
      totalLeafArea: 0,
      estimatedLeafArea: 0,
      visibleLeafArea: 0,
      healthyPixels: 0,
      chlorosisPixels: 0,
      necrosisPixels: 0,
      uncertainPixels: 0,
      removedPixels: 0,
      healthyPercentage: 0,
      chlorosisPercentage: 0,
      necrosisPercentage: 0,
      removedPercentage: 0,
      uncertainPercentage: 0,
      severityPercentage: 0,
      confidence: 0,
      quality: 'baixo',
      issues: seg.issues.length ? seg.issues : ['Nao foi possivel delimitar a folha.'],
      reliable: false,
      method: 'Semente + crescimento de regiao (CIELAB, borda, foco)',
      timings,
      segmentationDiagnostics: seg.diagnostics,
    };
  }

  const areaModel = estimateRemovedArea(seg.leafMask, seg.lab, width, height);
  const visibleLeafMask = areaModel.visibleMask;
  // A mascara foliar valida contem somente tecido realmente visivel. A area
  // removida e mantida separada e nunca entra no denominador da severidade.
  const leafMask = visibleLeafMask;
  const estimatedLeafMask = areaModel.estimatedMask;
  const removedMask = areaModel.removedMask;
  const visibleLeafArea = countPixels(visibleLeafMask);
  const totalLeafArea = countPixels(leafMask);
  const estimatedLeafArea = countPixels(estimatedLeafMask);
  options.onProgress?.(48, 'Normalizando sombras e iluminacao');
  throwIfAborted(options.signal);

  const normalizationStart = nowMs();
  const lab = normalizeIllumination(seg.lab, visibleLeafMask, width, height);
  timings.normalizationMs = roundMs(nowMs() - normalizationStart);
  options.onProgress?.(56, 'Classificando tecidos foliares');
  throwIfAborted(options.signal);

  const classificationStart = nowMs();
  const pred = classifyTissue(imageData, lab, visibleLeafMask, width, height, options.calibration);
  timings.classificationMs = roundMs(nowMs() - classificationStart);
  options.onProgress?.(70, 'Limpando ruido e preservando lesoes');
  throwIfAborted(options.signal);

  const postprocessStart = nowMs();
  let necrosisMask = andInPlace(refineLesion(pred.predNecrosis, width, height, visibleLeafArea), visibleLeafMask);
  let chlorosisMask = andInPlace(refineLesion(pred.predChlorosis, width, height, visibleLeafArea), visibleLeafMask);
  let uncertainMask = andInPlace(pred.predUncertain, visibleLeafMask);

  for (let p = 0; p < n; p++) {
    if (necrosisMask[p]) {
      chlorosisMask[p] = 0;
      uncertainMask[p] = 0;
    } else if (chlorosisMask[p]) {
      uncertainMask[p] = 0;
    }
  }

  const healthyMask = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    healthyMask[p] = visibleLeafMask[p] && !necrosisMask[p] && !chlorosisMask[p] && !uncertainMask[p] ? 1 : 0;
  }

  const necrosisPixels = countPixels(necrosisMask);
  const chlorosisPixels = countPixels(chlorosisMask);
  const uncertainPixels = countPixels(uncertainMask);
  const removedPixels = countPixels(removedMask);
  const healthyPixels = countPixels(healthyMask);
  const validClassSum = healthyPixels + chlorosisPixels + necrosisPixels + uncertainPixels;
  if (validClassSum !== totalLeafArea) {
    throw new Error(`Invariante violada: classes validas=${validClassSum}, mascara foliar=${totalLeafArea}.`);
  }
  const pct = (value: number) => totalLeafArea > 0 ? Math.round((value / totalLeafArea) * 10000) / 100 : 0;

  const healthyPercentage = pct(healthyPixels);
  const chlorosisPercentage = pct(chlorosisPixels);
  const necrosisPercentage = pct(necrosisPixels);
  const removedPercentage = estimatedLeafArea > 0
    ? Math.round((removedPixels / estimatedLeafArea) * 10000) / 100
    : 0;
  const uncertainPercentage = pct(uncertainPixels);
  const severityPercentage = Math.round(((chlorosisPixels + necrosisPixels) / totalLeafArea) * 10000) / 100;

  const uncertainFrac = uncertainPixels / totalLeafArea;
  const removedFrac = estimatedLeafArea > 0 ? removedPixels / estimatedLeafArea : 0;
  const confidence = Math.max(0, Math.min(0.98, seg.confidence - uncertainFrac * 0.6 - Math.max(0, removedFrac - 0.18) * 0.25));
  const quality: 'alto' | 'moderado' | 'baixo' =
    confidence >= 0.75 ? 'alto' : confidence >= 0.5 ? 'moderado' : 'baixo';

  const issues = [...seg.issues, ...areaModel.issues];
  if (uncertainFrac > 0.1) {
    issues.push('Parte da folha ficou sem classificacao confiavel (reflexo/sombra). Fotografe novamente com luz difusa.');
  }
  if (uncertainFrac > 0.28) {
    issues.push('Area incerta excessiva; recomenda-se nova fotografia com melhor foco e fundo mais uniforme.');
  }
  timings.postprocessMs = roundMs(nowMs() - postprocessStart);

  const reliable = confidence >= 0.48 && uncertainFrac <= 0.35 && totalLeafArea >= Math.max(80, width * height * 0.012);
  const finalBackgroundMask = new Uint8Array(n);
  for (let p = 0; p < n; p++) finalBackgroundMask[p] = leafMask[p] ? 0 : 1;
  const segmentationDiagnostics: LeafSegmentationDiagnostics = {
    ...seg.diagnostics,
    finalMask: leafMask.slice(),
    backgroundMask: finalBackgroundMask,
  };

  return {
    width,
    height,
    visibleLeafMask,
    leafMask,
    estimatedLeafMask,
    healthyMask,
    chlorosisMask,
    necrosisMask,
    uncertainMask,
    removedMask,
    totalLeafArea,
    estimatedLeafArea,
    visibleLeafArea,
    healthyPixels,
    chlorosisPixels,
    necrosisPixels,
    uncertainPixels,
    removedPixels,
    healthyPercentage,
    chlorosisPercentage,
    necrosisPercentage,
    removedPercentage,
    uncertainPercentage,
    severityPercentage,
    confidence,
    quality,
    issues,
    reliable,
    method: `Mascara foliar automatica hibrida (CIELAB/HSV/ExG/ExR/VARI/textura/conectividade) -> classificacao adaptativa ${pred.mode}`,
    timings,
    segmentationDiagnostics,
  };
}

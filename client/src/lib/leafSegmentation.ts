/**
 * PhytoPathometric - leafSegmentation.ts
 * Segmenta somente a folha principal antes da classificacao de doencas.
 */

export interface LeafSegmentation {
  leafMask: Uint8Array;
  width: number;
  height: number;
  leafArea: number;
  confidence: number;
  quality: 'alto' | 'moderado' | 'baixo';
  issues: string[];
  lab: { L: Float32Array; a: Float32Array; b: Float32Array };
  diagnostics: LeafSegmentationDiagnostics;
}

export interface LeafSegmentationDiagnostics {
  initialMask: Uint8Array;
  backgroundRemovedMask: Uint8Array;
  componentLabels: Int32Array;
  componentCount: number;
  selectedComponentLabel: number;
  selectedComponentMask: Uint8Array;
  finalMask: Uint8Array;
  backgroundMask: Uint8Array;
  removedComponentCount: number;
}

export async function loadOrientedImageData(
  src: string,
  workingMaxSide = 1024,
): Promise<{ imageData: ImageData; width: number; height: number; bitmap: ImageBitmap | HTMLImageElement }> {
  let source: ImageBitmap | HTMLImageElement;
  let srcW: number;
  let srcH: number;

  try {
    const blob = await (await fetch(src)).blob();
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    source = bmp;
    srcW = bmp.width;
    srcH = bmp.height;
  } catch {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Falha ao carregar a imagem.'));
      el.src = src;
    });
    if ('decode' in img) {
      try {
        await img.decode();
      } catch {
        // A imagem ja pode estar disponivel apos onload.
      }
    }
    source = img;
    srcW = img.naturalWidth || img.width;
    srcH = img.naturalHeight || img.height;
  }

  const scale = Math.min(1, workingMaxSide / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

  return { imageData: ctx.getImageData(0, 0, width, height), width, height, bitmap: source };
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  const z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;

  if (d !== 0) {
    if (max === rn) h = (((gn - bn) / d) % 6 + 6) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }

  return [h, max === 0 ? 0 : d / max, max];
}

function isNonLeafMaterial(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  const skin =
    r > 90 && g > 38 && b > 18 && r > g && g > b && r - b > 14 &&
    h >= 5 && h <= 52 && s >= 0.16 && s <= 0.7 && v > 0.42;
  const nail = (h >= 280 || h <= 8) && s > 0.3 && v > 0.32 && b >= g;
  const sky = h >= 185 && h <= 260 && s > 0.12;
  const neutralBright = s < 0.12 && v > 0.62;

  return skin || nail || sky || neutralBright;
}

function sobelMagnitude(L: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] +
        L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1];
      const gy =
        -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] +
        L[i + w - 1] + 2 * L[i + w] + L[i + w + 1];
      out[i] = Math.hypot(gx, gy);
    }
  }
  return out;
}

function localSharpness(L: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  const radius = 2;
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      let sum = 0;
      let sum2 = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const value = L[(y + dy) * w + (x + dx)];
          sum += value;
          sum2 += value * value;
          count++;
        }
      }
      const mean = sum / count;
      out[y * w + x] = Math.sqrt(Math.max(0, sum2 / count - mean * mean));
    }
  }
  return out;
}

/** Suavizacao bilateral 3x3 em CIELAB: reduz ruido sem atravessar bordas cromaticas. */
function bilateralSmoothLab(
  lab: { L: Float32Array; A: Float32Array; B: Float32Array },
  w: number,
  h: number,
): { L: Float32Array; A: Float32Array; B: Float32Array } {
  const outL = Float32Array.from(lab.L);
  const outA = Float32Array.from(lab.A);
  const outB = Float32Array.from(lab.B);
  const sigmaColor2 = 2 * 12 * 12;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      let sumW = 0;
      let sumL = 0;
      let sumA = 0;
      let sumB = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const q = (y + dy) * w + x + dx;
          const dL = (lab.L[q] - lab.L[p]) * 0.5;
          const dA = lab.A[q] - lab.A[p];
          const dB = lab.B[q] - lab.B[p];
          const spatial = dx === 0 && dy === 0 ? 1 : dx === 0 || dy === 0 ? 0.78 : 0.61;
          const weight = spatial * Math.exp(-(dL * dL + dA * dA + dB * dB) / sigmaColor2);
          sumW += weight;
          sumL += lab.L[q] * weight;
          sumA += lab.A[q] * weight;
          sumB += lab.B[q] * weight;
        }
      }
      if (sumW > 0) {
        outL[p] = sumL / sumW;
        outA[p] = sumA / sumW;
        outB[p] = sumB / sumW;
      }
    }
  }
  return { L: outL, A: outA, B: outB };
}

function percentile(values: Float32Array, p: number): number {
  const arr = Array.from(values).filter(Number.isFinite).sort((a, b) => a - b);
  if (!arr.length) return 0;
  return arr[Math.min(arr.length - 1, Math.max(0, Math.round(p * (arr.length - 1))))];
}

interface BackgroundLabModel {
  L: number;
  a: number;
  b: number;
}

function labDistance(
  L: number,
  a: number,
  b: number,
  model: BackgroundLabModel,
): number {
  // A luminancia recebe peso menor para tolerar sombras sem perder a separacao
  // cromatica entre a folha e o fundo.
  return Math.hypot((L - model.L) * 0.55, a - model.a, b - model.b);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[sorted.length >> 1];
}

function estimateBorderBackground(
  lab: { L: Float32Array; A: Float32Array; B: Float32Array },
  w: number,
  h: number,
): { models: BackgroundLabModel[]; tolerance: number } {
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.035));
  const samples: number[] = [];
  const add = (p: number) => {
    if (samples.length < 12000) samples.push(p);
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < band || y < band || x >= w - band || y >= h - band) add(y * w + x);
    }
  }

  if (!samples.length) return { models: [{ L: 50, a: 0, b: 0 }], tolerance: 10 };

  // Inicializacao farthest-point e poucas iteracoes de k-means em CIELAB.
  // Tres modelos acomodam fundos com sombra, solo e placa de referencia.
  const centerIndex = samples.reduce((best, p) => (
    Math.abs(lab.L[p] - 50) < Math.abs(lab.L[best] - 50) ? p : best
  ), samples[0]);
  const models: BackgroundLabModel[] = [
    { L: lab.L[centerIndex], a: lab.A[centerIndex], b: lab.B[centerIndex] },
  ];

  while (models.length < 3) {
    let farthest = samples[0];
    let farthestDistance = -1;
    for (const p of samples) {
      const distance = Math.min(...models.map((model) => labDistance(lab.L[p], lab.A[p], lab.B[p], model)));
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthest = p;
      }
    }
    models.push({ L: lab.L[farthest], a: lab.A[farthest], b: lab.B[farthest] });
  }

  for (let iteration = 0; iteration < 6; iteration++) {
    const sums = models.map(() => ({ L: 0, a: 0, b: 0, count: 0 }));
    for (const p of samples) {
      let best = 0;
      let bestDistance = Infinity;
      for (let cluster = 0; cluster < models.length; cluster++) {
        const distance = labDistance(lab.L[p], lab.A[p], lab.B[p], models[cluster]);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = cluster;
        }
      }
      sums[best].L += lab.L[p];
      sums[best].a += lab.A[p];
      sums[best].b += lab.B[p];
      sums[best].count++;
    }
    for (let cluster = 0; cluster < models.length; cluster++) {
      if (!sums[cluster].count) continue;
      models[cluster] = {
        L: sums[cluster].L / sums[cluster].count,
        a: sums[cluster].a / sums[cluster].count,
        b: sums[cluster].b / sums[cluster].count,
      };
    }
  }

  const distances = samples.map((p) => Math.min(
    ...models.map((model) => labDistance(lab.L[p], lab.A[p], lab.B[p], model)),
  ));
  const distanceMedian = median(distances);
  const distanceMad = median(distances.map((value) => Math.abs(value - distanceMedian)));
  const tolerance = Math.max(5.5, Math.min(18, distanceMedian + 3 * 1.4826 * distanceMad + 2));
  return { models, tolerance };
}

export function countPixels(mask: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) count++;
  }
  return count;
}

function dilate1(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mask[i]) {
        out[i] = 1;
        continue;
      }
      for (let dy = -1; dy <= 1 && !out[i]; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          if (mask[ny * w + nx]) {
            out[i] = 1;
            break;
          }
        }
      }
    }
  }
  return out;
}

function erode1(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      let keep = 1;
      for (let dy = -1; dy <= 1 && keep; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) {
          keep = 0;
          break;
        }
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w || !mask[ny * w + nx]) {
            keep = 0;
            break;
          }
        }
      }
      out[i] = keep;
    }
  }
  return out;
}

export function dilateN(mask: Uint8Array, w: number, h: number, n: number): Uint8Array {
  let current = mask;
  for (let i = 0; i < n; i++) current = dilate1(current, w, h);
  return current;
}

export function erodeN(mask: Uint8Array, w: number, h: number, n: number): Uint8Array {
  let current = mask;
  for (let i = 0; i < n; i++) current = erode1(current, w, h);
  return current;
}

export function openMask(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return r <= 0 ? mask.slice() : dilateN(erodeN(mask, w, h, r), w, h, r);
}

export function closeMask(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return r <= 0 ? mask.slice() : erodeN(dilateN(mask, w, h, r), w, h, r);
}

function buildPlantCandidateMask(
  data: Uint8ClampedArray,
  allowed: Uint8Array,
  lab: { L: Float32Array; A: Float32Array; B: Float32Array },
  backgroundDistance: Float32Array,
  backgroundTolerance: number,
  grad: Float32Array,
  sharp: Float32Array,
  gradThreshold: number,
  sharpThreshold: number,
  w: number,
  h: number,
): Uint8Array {
  const n = w * h;
  const raw = new Uint8Array(n);

  for (let p = 0, i = 0; p < n; p++, i += 4) {
    if (!allowed[p]) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // A mascara inicial serve apenas para localizar o nucleo foliar. Materiais
    // externos plausiveis (pele, unha, ceu) nao podem virar sementes; tecidos
    // lesionados continuam recuperados na mascara ampla por conectividade.
    if (isNonLeafMaterial(r, g, b)) continue;
    const [hue, saturation, value] = rgbToHsv(r, g, b);
    const exg = 2 * g - r - b;
    const labA = lab.A[p];
    const labB = lab.B[p];
    const separatedFromBackground = backgroundDistance[p] > backgroundTolerance;
    const texturedForeground =
      sharp[p] >= sharpThreshold * 0.9 || grad[p] >= gradThreshold * 0.55;

    if (backgroundDistance[p] <= backgroundTolerance * 0.45) continue;
    if (!separatedFromBackground && !texturedForeground) continue;

    const greenLeaf =
      hue >= 48 &&
      hue <= 175 &&
      saturation >= 0.08 &&
      value >= 0.1 &&
      exg > -22 &&
      labA < 18 &&
      g >= b * 0.8;

    const chloroticLeaf =
      hue >= 32 &&
      hue <= 105 &&
      saturation >= 0.1 &&
      value >= 0.2 &&
      g >= r * 0.72 &&
      g >= b * 0.95 &&
      labB > 8 &&
      labA < 28;

    const mutedLeaf =
      value > 0.16 &&
      labA < 14 &&
      labB > 6 &&
      g >= r * 0.67 &&
      g >= b * 0.8;

    if (greenLeaf || chloroticLeaf || mutedLeaf) raw[p] = 1;
  }

  const cleanRadius = Math.max(1, Math.round(Math.min(w, h) * 0.003));
  return closeMask(openMask(raw, w, h, cleanRadius), w, h, cleanRadius + 1);
}

function componentContainingSeed(mask: Uint8Array, w: number, h: number, seed: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  if (!mask[seed]) return out;

  const stack = [seed];
  out[seed] = 1;

  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    const y = Math.floor(p / w);

    if (x > 0) {
      const n = p - 1;
      if (mask[n] && !out[n]) {
        out[n] = 1;
        stack.push(n);
      }
    }
    if (x < w - 1) {
      const n = p + 1;
      if (mask[n] && !out[n]) {
        out[n] = 1;
        stack.push(n);
      }
    }
    if (y > 0) {
      const n = p - w;
      if (mask[n] && !out[n]) {
        out[n] = 1;
        stack.push(n);
      }
    }
    if (y < h - 1) {
      const n = p + w;
      if (mask[n] && !out[n]) {
        out[n] = 1;
        stack.push(n);
      }
    }
  }

  return out;
}

export function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  const outside = new Uint8Array(mask.length);
  const stack: number[] = [];
  const seed = (i: number) => {
    if (!mask[i] && !outside[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };

  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }

  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    const y = Math.floor(p / w);
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (y > 0) seed(p - w);
    if (y < h - 1) seed(p + w);
  }

  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    out[i] = mask[i] || !outside[i] ? 1 : 0;
  }
  return out;
}

/** Preenche apenas lacunas internas pequenas; perfuracoes reais maiores permanecem fora. */
export function fillSmallHoles(
  mask: Uint8Array,
  w: number,
  h: number,
  maxHolePixels: number,
): Uint8Array {
  const outside = new Uint8Array(mask.length);
  const stack: number[] = [];
  const seedOutside = (p: number) => {
    if (!mask[p] && !outside[p]) {
      outside[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    seedOutside(x);
    seedOutside((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seedOutside(y * w);
    seedOutside(y * w + w - 1);
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    const y = Math.floor(p / w);
    if (x > 0) seedOutside(p - 1);
    if (x < w - 1) seedOutside(p + 1);
    if (y > 0) seedOutside(p - w);
    if (y < h - 1) seedOutside(p + w);
  }

  const visited = outside.slice();
  const out = mask.slice();
  const component: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (mask[start] || visited[start]) continue;
    component.length = 0;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      component.push(p);
      const x = p % w;
      const y = Math.floor(p / w);
      const visit = (q: number) => {
        if (!mask[q] && !visited[q]) {
          visited[q] = 1;
          stack.push(q);
        }
      };
      if (x > 0) visit(p - 1);
      if (x < w - 1) visit(p + 1);
      if (y > 0) visit(p - w);
      if (y < h - 1) visit(p + w);
    }
    if (component.length <= maxHolePixels) {
      for (const p of component) out[p] = 1;
    }
  }
  return out;
}

function buildForegroundMask(
  data: Uint8ClampedArray,
  alphaMask: Uint8Array,
  lab: { A: Float32Array; B: Float32Array },
  backgroundDistance: Float32Array,
  backgroundTolerance: number,
  grad: Float32Array,
  sharp: Float32Array,
  gradThreshold: number,
  sharpThreshold: number,
  plantSeedMask: Uint8Array,
  w: number,
  h: number,
): Uint8Array {
  const raw = new Uint8Array(w * h);
  const plantSupport = dilateN(
    plantSeedMask,
    w,
    h,
    Math.max(3, Math.min(18, Math.round(Math.min(w, h) * 0.055))),
  );
  for (let p = 0, i = 0; p < raw.length; p++, i += 4) {
    if (!alphaMask[p]) continue;
    if (plantSeedMask[p]) {
      raw[p] = 1;
      continue;
    }
    const [hue, saturation, value] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    const chroma = Math.hypot(lab.A[p], lab.B[p]);
    const separated = backgroundDistance[p] > backgroundTolerance * 0.78;
    const stronglySeparated = backgroundDistance[p] > backgroundTolerance * 1.15;
    const texture = sharp[p] > sharpThreshold * 0.42 || grad[p] > gradThreshold * 0.32;
    const plantColor =
      (hue >= 28 && hue <= 180 && saturation >= 0.055 && value >= 0.08) ||
      ((hue <= 72 || hue >= 345) && saturation >= 0.1 && value >= 0.08);
    const neutralButDistinct = chroma >= 4.5 || texture;
    const externalMaterial = isNonLeafMaterial(data[i], data[i + 1], data[i + 2]);

    if (!separated) continue;
    if (externalMaterial && !plantSupport[p]) continue;
    if (plantColor || neutralButDistinct || stronglySeparated) raw[p] = 1;
  }

  const radius = Math.max(1, Math.min(5, Math.round(Math.min(w, h) * 0.006)));
  return closeMask(raw, w, h, radius);
}

function boundingBox(mask: Uint8Array, w: number, h: number) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return maxX < 0 ? null : { minX, minY, maxX, maxY, bw: maxX - minX + 1, bh: maxY - minY + 1 };
}

function nearestMaskPixel(mask: Uint8Array, w: number, h: number, seed: number, maxRadius: number): number | null {
  if (mask[seed]) return seed;

  const sx = seed % w;
  const sy = Math.floor(seed / w);

  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = sx + dx;
        const y = sy + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const p = y * w + x;
        if (mask[p]) return p;
      }
    }
  }

  return null;
}

interface ComponentSelection {
  selected: Uint8Array;
  labels: Int32Array;
  componentCount: number;
  selectedLabel: number;
  removedCount: number;
}

function selectMainPlantComponent(candidate: Uint8Array, w: number, h: number, seed: number): ComponentSelection {
  const n = w * h;
  const nearSeed = nearestMaskPixel(candidate, w, h, seed, Math.round(Math.min(w, h) * 0.16));
  const labels = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  const sizes: number[] = [];
  const scores: number[] = [];
  const selected = new Uint8Array(n);
  const minPixels = Math.max(60, Math.round(n * 0.001));
  const centerMinX = w * 0.18;
  const centerMaxX = w * 0.82;
  const centerMinY = h * 0.12;
  const centerMaxY = h * 0.9;
  let componentCount = 0;

  for (let start = 0; start < n; start++) {
    if (!candidate[start] || labels[start] !== -1) continue;

    let qHead = 0;
    let qTail = 0;
    let count = 0;
    let borderCount = 0;
    let centerCount = 0;
    let sumX = 0;
    let sumY = 0;

    labels[start] = componentCount;
    queue[qTail++] = start;

    while (qHead < qTail) {
      const p = queue[qHead++];
      count++;
      const x = p % w;
      const y = Math.floor(p / w);
      sumX += x;
      sumY += y;

      if (x <= 1 || y <= 1 || x >= w - 2 || y >= h - 2) borderCount++;
      if (x >= centerMinX && x <= centerMaxX && y >= centerMinY && y <= centerMaxY) centerCount++;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const next = ny * w + nx;
          if (!candidate[next] || labels[next] !== -1) continue;
          labels[next] = componentCount;
          queue[qTail++] = next;
        }
      }
    }

    const cx = sumX / count;
    const cy = sumY / count;
    const centerDistance = Math.hypot((cx - w / 2) / w, (cy - h / 2) / h);
    const areaRatio = count / n;
    const centerRatio = centerCount / count;
    const borderRatio = borderCount / count;
    sizes[componentCount] = count;
    scores[componentCount] =
      centerRatio * 3.6 +
      Math.min(1.8, areaRatio * 22) -
      centerDistance * 2.4 -
      borderRatio * 3.4;
    componentCount++;
  }

  let selectedLabel = nearSeed === null ? -1 : labels[nearSeed];
  if (selectedLabel < 0 || sizes[selectedLabel] < minPixels) {
    let bestScore = -Infinity;
    selectedLabel = -1;
    for (let label = 0; label < componentCount; label++) {
      if (sizes[label] >= minPixels && scores[label] > bestScore) {
        bestScore = scores[label];
        selectedLabel = label;
      }
    }
  }
  if (selectedLabel >= 0) {
    for (let p = 0; p < n; p++) selected[p] = labels[p] === selectedLabel ? 1 : 0;
  }
  return {
    selected,
    labels,
    componentCount,
    selectedLabel,
    removedCount: Math.max(0, componentCount - (selectedLabel >= 0 ? 1 : 0)),
  };
}

function trimThinPeripheralAttachments(
  mask: Uint8Array,
  w: number,
  h: number,
  seed: number,
): { mask: Uint8Array; trimmed: boolean } {
  const originalArea = countPixels(mask);
  if (!originalArea) return { mask, trimmed: false };

  const radius = Math.max(2, Math.min(8, Math.ceil(Math.min(w, h) * 0.012)));
  let opened = openMask(mask, w, h, radius);
  const openedSeed = nearestMaskPixel(opened, w, h, seed, radius * 5);
  if (openedSeed === null) return { mask, trimmed: false };
  opened = componentContainingSeed(opened, w, h, openedSeed);
  const openedArea = countPixels(opened);
  if (openedArea < originalArea * 0.58) return { mask, trimmed: false };

  // Restaura a borda da lamina, mas nao apendices longos e estreitos como
  // galhos, dedos, arames ou peciolos de outra folha encostados na amostra.
  const support = dilateN(opened, w, h, radius * 2);
  const trimmed = new Uint8Array(mask.length);
  const box = boundingBox(opened, w, h);
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    if (support[p]) {
      trimmed[p] = 1;
      continue;
    }
    if (!box) continue;
    const x = p % w;
    const y = Math.floor(p / w);
    const verticalLeaf = box.bh >= box.bw;
    const axialAppendix = verticalLeaf
      ? Math.abs(x - (box.minX + box.maxX) / 2) <= Math.max(3, box.bw * 0.14) && (y < box.minY || y > box.maxY)
      : Math.abs(y - (box.minY + box.maxY) / 2) <= Math.max(3, box.bh * 0.14) && (x < box.minX || x > box.maxX);
    if (axialAppendix) trimmed[p] = 1;
  }
  const trimmedArea = countPixels(trimmed);
  const removedArea = originalArea - trimmedArea;
  if (
    trimmedArea < originalArea * 0.72 ||
    removedArea < Math.max(24, originalArea * 0.03)
  ) {
    return { mask, trimmed: false };
  }
  return { mask: trimmed, trimmed: true };
}

function pickSeed(
  allowed: Uint8Array,
  sharp: Float32Array,
  sharpThr: number,
  w: number,
  h: number,
): number | null {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  let best = -1;
  let bestScore = -Infinity;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!allowed[i] || sharp[i] < sharpThr) continue;
      const d = Math.hypot(x - cx, y - cy) / Math.hypot(cx, cy);
      const score = 1 - d;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
  }

  return best >= 0 ? best : null;
}

export function segmentLeaf(
  imageData: ImageData,
  width: number,
  height: number,
): LeafSegmentation {
  const w = width;
  const h = height;
  const n = w * h;
  const data = imageData.data;
  const issues: string[] = [];

  const L = new Float32Array(n);
  const A = new Float32Array(n);
  const B = new Float32Array(n);
  for (let i = 0, p = 0; p < n; p++, i += 4) {
    const [l, a, b] = rgbToLab(data[i], data[i + 1], data[i + 2]);
    L[p] = l;
    A[p] = a;
    B[p] = b;
  }

  const smoothed = bilateralSmoothLab({ L, A, B }, w, h);
  const grad = sobelMagnitude(smoothed.L, w, h);
  const sharp = localSharpness(smoothed.L, w, h);
  const gradThr = Math.max(6, percentile(grad, 0.86));
  const sharpThr = Math.max(1.2, percentile(sharp, 0.55));
  const background = estimateBorderBackground(smoothed, w, h);
  const backgroundDistance = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    backgroundDistance[p] = Math.min(
      ...background.models.map((model) => labDistance(smoothed.L[p], smoothed.A[p], smoothed.B[p], model)),
    );
  }

  // Transparencia e a unica exclusao absoluta nesta fase. Cor de pele, branco,
  // amarelo ou marrom nunca removem um pixel foliar por si so.
  const alphaMask = new Uint8Array(n);
  for (let i = 0, p = 0; p < n; p++, i += 4) {
    if (data[i + 3] < 100) continue;
    alphaMask[p] = 1;
  }

  const initialMask = buildPlantCandidateMask(
    data,
    alphaMask,
    smoothed,
    backgroundDistance,
    background.tolerance,
    grad,
    sharp,
    gradThr,
    sharpThr,
    w,
    h,
  );
  const backgroundRemovedMask = buildForegroundMask(
    data,
    alphaMask,
    smoothed,
    backgroundDistance,
    background.tolerance,
    grad,
    sharp,
    gradThr,
    sharpThr,
    initialMask,
    w,
    h,
  );
  const seed =
    pickSeed(initialMask, sharp, Math.max(0.45, sharpThr * 0.45), w, h) ??
    pickSeed(backgroundRemovedMask, sharp, Math.max(0.35, sharpThr * 0.3), w, h);

  if (seed === null) {
    const empty = new Uint8Array(n);
    return {
      leafMask: empty,
      width: w,
      height: h,
      leafArea: 0,
      confidence: 0,
      quality: 'baixo',
      issues: ['Nao foi possivel localizar a folha principal.'],
      lab: { L, a: A, b: B },
      diagnostics: {
        initialMask,
        backgroundRemovedMask,
        componentLabels: new Int32Array(n).fill(-1),
        componentCount: 0,
        selectedComponentLabel: -1,
        selectedComponentMask: empty.slice(),
        finalMask: empty.slice(),
        backgroundMask: Uint8Array.from(alphaMask, (value) => value ? 1 : 0),
        removedComponentCount: 0,
      },
    };
  }

  const components = selectMainPlantComponent(backgroundRemovedMask, w, h, seed);
  let leafMask = components.selected.slice();
  const closeRadius = Math.max(1, Math.min(6, Math.round(Math.min(w, h) * 0.008)));
  leafMask = closeMask(leafMask, w, h, closeRadius);
  const connectedSeed = nearestMaskPixel(leafMask, w, h, seed, Math.round(Math.min(w, h) * 0.12));
  if (connectedSeed !== null) leafMask = componentContainingSeed(leafMask, w, h, connectedSeed);
  leafMask = fillSmallHoles(leafMask, w, h, Math.max(12, Math.round(n * 0.0005)));
  let leafArea = countPixels(leafMask);

  const trimmed = trimThinPeripheralAttachments(leafMask, w, h, seed);
  if (trimmed.trimmed) {
    leafMask = fillSmallHoles(trimmed.mask, w, h, Math.max(12, Math.round(n * 0.0005)));
    const trimmedSeed = nearestMaskPixel(leafMask, w, h, seed, Math.round(Math.min(w, h) * 0.08));
    if (trimmedSeed !== null) leafMask = componentContainingSeed(leafMask, w, h, trimmedSeed);
    leafArea = countPixels(leafMask);
    issues.push('Estruturas estreitas ligadas a borda da folha foram removidas da mascara.');
  }

  if (components.removedCount > 0) {
    issues.push(`${components.removedCount} componente(s) externo(s) removido(s) da mascara.`);
  }

  let confidence = 0.9;
  const frac = leafArea / n;

  if (frac < 0.02) {
    confidence -= 0.45;
    issues.push('Folha muito pequena no enquadramento.');
  }
  if (frac > 0.9) {
    confidence -= 0.3;
    issues.push('A folha ocupa quase toda a imagem; o fundo pode ter sido incluido.');
  }

  const bb = boundingBox(leafMask, w, h);
  if (bb) {
    if (bb.minX <= 1 || bb.minY <= 1 || bb.maxX >= w - 2 || bb.maxY >= h - 2) {
      confidence -= 0.12;
      issues.push('A folha parece estar parcialmente fora do enquadramento.');
    }
    const solid = leafArea / Math.max(1, bb.bw * bb.bh);
    if (solid < 0.25) {
      confidence -= 0.25;
      issues.push('Contorno incompativel com uma lamina foliar; possivel vazamento para o fundo.');
    }
  }

  const globalSharp = percentile(sharp, 0.9);
  if (globalSharp < 2.5) {
    confidence -= 0.25;
    issues.push('Imagem desfocada.');
  }

  let over = 0;
  let under = 0;
  for (let p = 0; p < n; p++) {
    if (!leafMask[p]) continue;
    if (L[p] > 96) over++;
    if (L[p] < 12) under++;
  }
  if (leafArea > 0 && over / leafArea > 0.12) {
    confidence -= 0.15;
    issues.push('Reflexo intenso ou superexposicao sobre a folha.');
  }
  if (leafArea > 0 && under / leafArea > 0.18) {
    confidence -= 0.15;
    issues.push('Sombra severa ou subexposicao sobre a folha.');
  }

  if (leafArea > 0 && leafArea < n) {
    let inA = 0;
    let inB = 0;
    let inN = 0;
    let outA = 0;
    let outB = 0;
    let outN = 0;

    for (let p = 0; p < n; p++) {
      if (leafMask[p]) {
        inA += A[p];
        inB += B[p];
        inN++;
      } else {
        outA += A[p];
        outB += B[p];
        outN++;
      }
    }

    if (inN && outN) {
      const dist = Math.hypot(inA / inN - outA / outN, inB / inN - outB / outN);
      if (dist < 5) {
        confidence -= 0.18;
        issues.push('Fundo com coloracao muito semelhante a folha.');
      }
    }
  }

  confidence = Math.max(0, Math.min(0.98, confidence));
  const quality: 'alto' | 'moderado' | 'baixo' =
    confidence >= 0.75 ? 'alto' : confidence >= 0.5 ? 'moderado' : 'baixo';

  const backgroundMask = new Uint8Array(n);
  for (let p = 0; p < n; p++) backgroundMask[p] = leafMask[p] ? 0 : 1;

  return {
    leafMask,
    width: w,
    height: h,
    leafArea,
    confidence,
    quality,
    issues,
    lab: { L, a: A, b: B },
    diagnostics: {
      initialMask,
      backgroundRemovedMask,
      componentLabels: components.labels,
      componentCount: components.componentCount,
      selectedComponentLabel: components.selectedLabel,
      selectedComponentMask: components.selected,
      finalMask: leafMask.slice(),
      backgroundMask,
      removedComponentCount: components.removedCount,
    },
  };
}

import assert from 'node:assert/strict';
import { analyzeLeafDiseaseFromImageData } from '../client/src/lib/leafDiseaseAnalysis';

function makeImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

function createSyntheticLeaf() {
  const width = 180;
  const height = 220;
  const data = new Uint8ClampedArray(width * height * 4);
  const truthLeaf = new Uint8Array(width * height);
  const truthHand = new Uint8Array(width * height);
  const cx = width * 0.5;
  const cy = height * 0.43;
  const rx = width * 0.24;
  const ry = height * 0.32;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const i = p * 4;
      const brick = ((Math.floor(x / 18) + Math.floor(y / 12)) % 2) * 18;
      data[i] = 176 + brick;
      data[i + 1] = 151 + brick;
      data[i + 2] = 132 + brick;
      data[i + 3] = 255;
    }
  }

  for (let y = 142; y < 218; y++) {
    for (let x = 58; x < 118; x++) {
      const p = y * width + x;
      const i = p * 4;
      truthHand[p] = 1;
      data[i] = 205;
      data[i + 1] = 153;
      data[i + 2] = 121;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const leaf = nx * nx + ny * ny <= 1 && y > 28;
      if (!leaf) continue;

      const p = y * width + x;
      const i = p * 4;
      truthLeaf[p] = 1;
      truthHand[p] = 0;

      const noise = ((x * 17 + y * 11) % 23) - 11;
      const rightSide = x > cx + 7 && y > cy - 10;
      if (rightSide) {
        data[i] = 205 + noise;
        data[i + 1] = 189 + noise;
        data[i + 2] = 54;
      } else {
        data[i] = 74 + noise;
        data[i + 1] = 145 + noise;
        data[i + 2] = 69;
      }

      const spotA = Math.hypot(x - (cx + 22), y - (cy - 5)) < 9;
      const spotB = Math.hypot(x - (cx - 8), y - (cy + 34)) < 5;
      if (spotA || spotB) {
        data[i] = 92;
        data[i + 1] = 47;
        data[i + 2] = 28;
      }

      if (Math.abs(x - cx) < 2 && y > cy - 58 && y < cy + 60) {
        data[i] = 120;
        data[i + 1] = 173;
        data[i + 2] = 96;
      }
    }
  }

  return { imageData: makeImageData(data, width, height), width, height, truthLeaf, truthHand };
}

const startedAt = performance.now();
const { imageData, width, height, truthLeaf, truthHand } = createSyntheticLeaf();
const result = analyzeLeafDiseaseFromImageData(imageData, width, height);

let outside = 0;
let falseBackground = 0;
let backgroundTotal = 0;
let handSelected = 0;
let handTotal = 0;

for (let p = 0; p < result.leafMask.length; p++) {
  if (!result.leafMask[p] && (
    result.healthyMask[p] || result.chlorosisMask[p] || result.necrosisMask[p] ||
    result.removedMask[p] || result.uncertainMask[p]
  )) {
    outside++;
  }
  if (!truthLeaf[p]) {
    backgroundTotal++;
    if (result.leafMask[p]) falseBackground++;
  }
  if (truthHand[p]) {
    handTotal++;
    if (result.leafMask[p]) handSelected++;
  }
}

const sum =
  result.healthyPixels +
  result.chlorosisPixels +
  result.necrosisPixels +
  result.removedPixels +
  result.uncertainPixels;
const falseBackgroundRate = falseBackground / backgroundTotal;
const handRate = handSelected / handTotal;
const elapsedMs = Math.round((performance.now() - startedAt) * 10) / 10;

assert.equal(outside, 0, 'Nenhuma classe pode estar fora da leafMask');
assert.equal(sum, result.totalLeafArea, 'A soma das classes deve reconstruir a leafMask');
assert.ok(result.totalLeafArea > 1200, 'A area foliar sintetica deve ser detectada');
assert.ok(falseBackgroundRate < 0.05, `Fundo falso positivo alto: ${falseBackgroundRate}`);
assert.ok(handRate < 0.02, `Mao falsa positiva alta: ${handRate}`);
assert.ok(result.chlorosisPixels > 60, 'Clorose sintetica deve ser detectada');
assert.ok(result.necrosisPixels > 10, 'Necrose sintetica deve ser detectada');

const backgroundCases = [
  { name: 'branco', rgb: [246, 246, 246] as const },
  { name: 'preto', rgb: [12, 12, 12] as const },
  { name: 'solo', rgb: [126, 82, 48] as const },
  { name: 'verde uniforme', rgb: [25, 116, 48] as const },
];
const backgroundResults = backgroundCases.map(({ name, rgb }) => {
  const sample = createSyntheticLeaf();
  for (let p = 0; p < sample.truthLeaf.length; p++) {
    if (sample.truthLeaf[p]) continue;
    const i = p * 4;
    sample.imageData.data[i] = rgb[0];
    sample.imageData.data[i + 1] = rgb[1];
    sample.imageData.data[i + 2] = rgb[2];
  }
  const analysis = analyzeLeafDiseaseFromImageData(sample.imageData, sample.width, sample.height);
  let selectedOutside = 0;
  let visibleOutside = 0;
  for (let p = 0; p < analysis.leafMask.length; p++) {
    if (!sample.truthLeaf[p] && analysis.leafMask[p]) selectedOutside++;
    if (!sample.truthLeaf[p] && analysis.visibleLeafMask[p]) visibleOutside++;
  }
  const outsideRate = selectedOutside / Math.max(1, analysis.totalLeafArea);
  const visibleOutsideRate = visibleOutside / Math.max(1, analysis.visibleLeafArea);
  assert.ok(analysis.totalLeafArea > 1200, `Folha nao detectada sobre fundo ${name}`);
  assert.ok(outsideRate < 0.08, `Fundo ${name} entrou na mascara: ${outsideRate}`);
  return {
    name,
    outsideRate,
    visibleOutsideRate,
    totalLeafArea: analysis.totalLeafArea,
    visibleLeafArea: analysis.visibleLeafArea,
    removedPixels: analysis.removedPixels,
    confidence: analysis.confidence,
  };
});

const perforated = createSyntheticLeaf();
const holeX = Math.round(perforated.width * 0.5);
const holeY = Math.round(perforated.height * 0.42);
for (let y = 0; y < perforated.height; y++) {
  for (let x = 0; x < perforated.width; x++) {
    if (Math.hypot(x - holeX, y - holeY) > 6) continue;
    const p = y * perforated.width + x;
    const i = p * 4;
    const brick = ((Math.floor(x / 18) + Math.floor(y / 12)) % 2) * 18;
    perforated.imageData.data[i] = 176 + brick;
    perforated.imageData.data[i + 1] = 151 + brick;
    perforated.imageData.data[i + 2] = 132 + brick;
  }
}
const perforatedResult = analyzeLeafDiseaseFromImageData(perforated.imageData, perforated.width, perforated.height);
assert.ok(
  perforatedResult.removedPixels > 25,
  `Perfuracao interna deve ser estimada como area removida: ${perforatedResult.removedPixels} px; ${perforatedResult.issues.join(' | ')}`,
);
assert.ok(perforatedResult.removedPixels < perforatedResult.totalLeafArea * 0.12, 'Area removida superestimada');
assert.ok(perforatedResult.necrosisPixels > 10, 'Necrose real nao deve desaparecer ao detectar perfuracao');

const shadowed = createSyntheticLeaf();
for (let y = 0; y < shadowed.height; y++) {
  for (let x = 0; x < shadowed.width * 0.47; x++) {
    const p = y * shadowed.width + x;
    if (!shadowed.truthLeaf[p]) continue;
    const i = p * 4;
    shadowed.imageData.data[i] = Math.round(shadowed.imageData.data[i] * 0.58);
    shadowed.imageData.data[i + 1] = Math.round(shadowed.imageData.data[i + 1] * 0.58);
    shadowed.imageData.data[i + 2] = Math.round(shadowed.imageData.data[i + 2] * 0.58);
  }
}
const shadowResult = analyzeLeafDiseaseFromImageData(shadowed.imageData, shadowed.width, shadowed.height);
assert.ok(shadowResult.necrosisPercentage < 18, 'Sombra parcial foi confundida com necrose extensa');
assert.equal(
  shadowResult.healthyPixels + shadowResult.chlorosisPixels + shadowResult.necrosisPixels +
    shadowResult.removedPixels + shadowResult.uncertainPixels,
  shadowResult.totalLeafArea,
  'Classes sob sombra devem somar a area foliar',
);

console.log(JSON.stringify({
  ok: true,
  elapsedMs,
  totalLeafArea: result.totalLeafArea,
  healthyPixels: result.healthyPixels,
  chlorosisPixels: result.chlorosisPixels,
  necrosisPixels: result.necrosisPixels,
  removedPixels: result.removedPixels,
  uncertainPixels: result.uncertainPixels,
  severityPercentage: result.severityPercentage,
  confidence: result.confidence,
  falseBackgroundRate,
  handRate,
  backgroundResults,
  perforation: {
    removedPixels: perforatedResult.removedPixels,
    removedPercentage: perforatedResult.removedPercentage,
    necrosisPixels: perforatedResult.necrosisPixels,
  },
  shadow: {
    necrosisPercentage: shadowResult.necrosisPercentage,
    confidence: shadowResult.confidence,
  },
  timings: result.timings,
}, null, 2));

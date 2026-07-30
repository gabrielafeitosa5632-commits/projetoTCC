import { describe, expect, it } from 'vitest';
import { analyzeLeafDiseaseFromImageData } from './leafDiseaseAnalysis';
import { computeBinarySegmentationMetrics } from './segmentationMetrics';

type SyntheticImage = {
  imageData: ImageData;
  width: number;
  height: number;
  truthLeaf: Uint8Array;
  truthHand: Uint8Array;
};

function makeImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

function createSyntheticLeaf(): SyntheticImage {
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

describe('leaf disease segmentation', () => {
  it('keeps tissue classes inside leafMask and preserves the class sum', () => {
    const { imageData, width, height } = createSyntheticLeaf();
    const result = analyzeLeafDiseaseFromImageData(imageData, width, height);

    let outside = 0;
    for (let p = 0; p < result.leafMask.length; p++) {
      if (!result.leafMask[p] && (
        result.healthyMask[p] || result.chlorosisMask[p] || result.necrosisMask[p] ||
        result.uncertainMask[p]
      )) {
        outside++;
      }
    }

    const sum =
      result.healthyPixels +
      result.chlorosisPixels +
      result.necrosisPixels +
      result.uncertainPixels;

    expect(outside).toBe(0);
    expect(sum).toBe(result.totalLeafArea);
    expect(result.totalLeafArea).toBeGreaterThan(1200);
    expect(result.healthyPercentage + result.chlorosisPercentage + result.necrosisPercentage + result.uncertainPercentage)
      .toBeCloseTo(100, 1);
  });

  it('does not use brick background or hand pixels as leaf area in the synthetic case', () => {
    const { imageData, width, height, truthLeaf, truthHand } = createSyntheticLeaf();
    const result = analyzeLeafDiseaseFromImageData(imageData, width, height);

    let falseBackground = 0;
    let backgroundTotal = 0;
    let handSelected = 0;
    let handTotal = 0;

    for (let p = 0; p < result.leafMask.length; p++) {
      if (!truthLeaf[p]) {
        backgroundTotal++;
        if (result.leafMask[p]) falseBackground++;
      }
      if (truthHand[p]) {
        handTotal++;
        if (result.leafMask[p]) handSelected++;
      }
    }

    expect(falseBackground / backgroundTotal).toBeLessThan(0.05);
    expect(handSelected / handTotal).toBeLessThan(0.02);
  });

  it('detects both chlorosis and necrosis when they are inside the leaf', () => {
    const { imageData, width, height } = createSyntheticLeaf();
    const result = analyzeLeafDiseaseFromImageData(imageData, width, height);

    expect(result.chlorosisPixels).toBeGreaterThan(60);
    expect(result.necrosisPixels).toBeGreaterThan(10);
    expect(result.severityPercentage).toBeGreaterThan(1);
    expect(result.severityPercentage).toBeLessThan(95);
  });

  it('mantem uma folha saudavel predominantemente como tecido sadio', () => {
    const synthetic = createSyntheticLeaf();
    for (let p = 0; p < synthetic.truthLeaf.length; p++) {
      if (!synthetic.truthLeaf[p]) continue;
      const i = p * 4;
      const noise = (p % 9) - 4;
      synthetic.imageData.data[i] = 70 + noise;
      synthetic.imageData.data[i + 1] = 151 + noise;
      synthetic.imageData.data[i + 2] = 63 + noise;
    }
    const result = analyzeLeafDiseaseFromImageData(synthetic.imageData, synthetic.width, synthetic.height);
    expect(result.healthyPercentage).toBeGreaterThan(88);
    expect(result.severityPercentage).toBeLessThan(8);
  });

  it('nao transforma uma sombra verde em necrose', () => {
    const synthetic = createSyntheticLeaf();
    for (let p = 0; p < synthetic.truthLeaf.length; p++) {
      if (!synthetic.truthLeaf[p]) continue;
      const i = p * 4;
      synthetic.imageData.data[i] = 72;
      synthetic.imageData.data[i + 1] = 152;
      synthetic.imageData.data[i + 2] = 64;
    }
    for (let y = 0; y < synthetic.height; y++) {
      for (let x = 0; x < synthetic.width; x++) {
        const p = y * synthetic.width + x;
        if (!synthetic.truthLeaf[p] || x < synthetic.width / 2) continue;
        const i = p * 4;
        synthetic.imageData.data[i] = Math.round(synthetic.imageData.data[i] * 0.48);
        synthetic.imageData.data[i + 1] = Math.round(synthetic.imageData.data[i + 1] * 0.48);
        synthetic.imageData.data[i + 2] = Math.round(synthetic.imageData.data[i + 2] * 0.48);
      }
    }
    const result = analyzeLeafDiseaseFromImageData(synthetic.imageData, synthetic.width, synthetic.height);
    expect(result.necrosisPercentage).toBeLessThan(12);
    expect(result.totalLeafArea).toBeGreaterThan(1200);
  });

  it('preserva tecido marrom de uma folha parcialmente seca dentro da mascara', () => {
    const synthetic = createSyntheticLeaf();
    let dryPixels = 0;
    let selectedDry = 0;
    for (let y = 0; y < synthetic.height; y++) {
      for (let x = 0; x < synthetic.width; x++) {
        const p = y * synthetic.width + x;
        if (!synthetic.truthLeaf[p] || x < synthetic.width * 0.56) continue;
        const i = p * 4;
        dryPixels++;
        synthetic.imageData.data[i] = 102;
        synthetic.imageData.data[i + 1] = 58;
        synthetic.imageData.data[i + 2] = 29;
      }
    }
    const result = analyzeLeafDiseaseFromImageData(synthetic.imageData, synthetic.width, synthetic.height);
    for (let p = 0; p < synthetic.truthLeaf.length; p++) {
      if (synthetic.truthLeaf[p] && p % synthetic.width >= synthetic.width * 0.56 && result.leafMask[p]) selectedDry++;
    }
    expect(selectedDry / dryPixels).toBeGreaterThan(0.82);
    expect(result.necrosisPixels).toBeGreaterThan(40);
  });

  it('seleciona a folha principal quando existe um segundo componente vegetal', () => {
    const synthetic = createSyntheticLeaf();
    const secondary = new Uint8Array(synthetic.width * synthetic.height);
    for (let y = 12; y < 62; y++) {
      for (let x = 7; x < 40; x++) {
        const inside = ((x - 23) / 15) ** 2 + ((y - 37) / 22) ** 2 <= 1;
        if (!inside) continue;
        const p = y * synthetic.width + x;
        const i = p * 4;
        secondary[p] = 1;
        synthetic.imageData.data[i] = 50;
        synthetic.imageData.data[i + 1] = 132;
        synthetic.imageData.data[i + 2] = 45;
      }
    }
    const result = analyzeLeafDiseaseFromImageData(synthetic.imageData, synthetic.width, synthetic.height);
    let selectedSecondary = 0;
    let secondaryPixels = 0;
    for (let p = 0; p < secondary.length; p++) {
      if (!secondary[p]) continue;
      secondaryPixels++;
      if (result.leafMask[p]) selectedSecondary++;
    }
    expect(selectedSecondary / secondaryPixels).toBeLessThan(0.05);
    expect(result.segmentationDiagnostics.removedComponentCount).toBeGreaterThan(0);
  });

  it.each([
    ['branco', [246, 246, 246]],
    ['preto', [12, 12, 12]],
    ['solo', [126, 82, 48]],
    ['verde uniforme', [25, 116, 48]],
  ] as const)('mantem as classes dentro da folha sobre fundo %s', (_name, background) => {
    const synthetic = createSyntheticLeaf();
    for (let p = 0; p < synthetic.truthLeaf.length; p++) {
      if (synthetic.truthLeaf[p]) continue;
      const i = p * 4;
      synthetic.imageData.data[i] = background[0];
      synthetic.imageData.data[i + 1] = background[1];
      synthetic.imageData.data[i + 2] = background[2];
    }

    const result = analyzeLeafDiseaseFromImageData(synthetic.imageData, synthetic.width, synthetic.height);
    let outside = 0;
    for (let p = 0; p < result.leafMask.length; p++) {
      if (!synthetic.truthLeaf[p] && result.leafMask[p]) outside++;
    }
    expect(result.totalLeafArea).toBeGreaterThan(1200);
    expect(outside / result.totalLeafArea).toBeLessThan(0.08);
  });

  it('remove um galho marrom estreito encostado na borda da folha', () => {
    const synthetic = createSyntheticLeaf();
    const branch = new Uint8Array(synthetic.width * synthetic.height);
    const centerY = Math.round(synthetic.height * 0.43);
    const leafLeft = Math.round(synthetic.width * (0.5 - 0.24));

    for (let x = 3; x <= leafLeft + 3; x++) {
      const yCenter = centerY + Math.round(Math.sin(x / 8) * 5);
      for (let dy = -2; dy <= 2; dy++) {
        const y = yCenter + dy;
        const p = y * synthetic.width + x;
        if (synthetic.truthLeaf[p]) continue;
        const i = p * 4;
        branch[p] = 1;
        synthetic.imageData.data[i] = 105;
        synthetic.imageData.data[i + 1] = 61;
        synthetic.imageData.data[i + 2] = 34;
      }
    }

    const result = analyzeLeafDiseaseFromImageData(synthetic.imageData, synthetic.width, synthetic.height);
    let branchArea = 0;
    let selectedBranch = 0;
    for (let p = 0; p < branch.length; p++) {
      if (!branch[p]) continue;
      branchArea++;
      if (result.visibleLeafMask[p]) selectedBranch++;
    }

    expect(result.totalLeafArea).toBeGreaterThan(1200);
    expect(selectedBranch / branchArea).toBeLessThan(0.15);
  });

  it('separa uma perfuracao real do tecido necrotico', () => {
    const synthetic = createSyntheticLeaf();
    const cx = Math.round(synthetic.width * 0.5);
    const cy = Math.round(synthetic.height * 0.42);
    for (let y = 0; y < synthetic.height; y++) {
      for (let x = 0; x < synthetic.width; x++) {
        if (Math.hypot(x - cx, y - cy) > 6) continue;
        const p = y * synthetic.width + x;
        const i = p * 4;
        const brick = ((Math.floor(x / 18) + Math.floor(y / 12)) % 2) * 18;
        synthetic.imageData.data[i] = 176 + brick;
        synthetic.imageData.data[i + 1] = 151 + brick;
        synthetic.imageData.data[i + 2] = 132 + brick;
      }
    }

    const result = analyzeLeafDiseaseFromImageData(synthetic.imageData, synthetic.width, synthetic.height);
    expect(result.removedPixels).toBeGreaterThan(25);
    expect(result.removedPixels).toBeLessThan(result.totalLeafArea * 0.12);
    expect(result.necrosisPixels).toBeGreaterThan(10);
    expect(
      result.healthyPixels + result.chlorosisPixels + result.necrosisPixels +
      result.uncertainPixels,
    ).toBe(result.totalLeafArea);
    for (let p = 0; p < result.removedMask.length; p++) {
      if (result.removedMask[p]) expect(result.leafMask[p]).toBe(0);
    }
  });

  it('mede a mascara sintetica contra a anotacao manual', () => {
    const synthetic = createSyntheticLeaf();
    const result = analyzeLeafDiseaseFromImageData(synthetic.imageData, synthetic.width, synthetic.height);
    const metrics = computeBinarySegmentationMetrics(result.leafMask, synthetic.truthLeaf);

    expect(metrics.iou).toBeGreaterThan(0.72);
    expect(metrics.dice).toBeGreaterThan(0.82);
    expect(metrics.precision).toBeGreaterThan(0.82);
    expect(metrics.recall).toBeGreaterThan(0.82);
  });

  it('remove um arco marrom separado e nunca o classifica como tecido', () => {
    const synthetic = createSyntheticLeaf();
    const arc = new Uint8Array(synthetic.width * synthetic.height);
    const cx = 18;
    const cy = 115;
    for (let angle = -1.15; angle <= 1.15; angle += 0.012) {
      const x = Math.round(cx + Math.cos(angle) * 16);
      const y = Math.round(cy + Math.sin(angle) * 54);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px < 0 || py < 0 || px >= synthetic.width || py >= synthetic.height) continue;
          const p = py * synthetic.width + px;
          if (synthetic.truthLeaf[p]) continue;
          const i = p * 4;
          arc[p] = 1;
          synthetic.imageData.data[i] = 90;
          synthetic.imageData.data[i + 1] = 45;
          synthetic.imageData.data[i + 2] = 24;
        }
      }
    }

    const result = analyzeLeafDiseaseFromImageData(synthetic.imageData, synthetic.width, synthetic.height);
    let arcPixels = 0;
    let classifiedArc = 0;
    for (let p = 0; p < arc.length; p++) {
      if (!arc[p]) continue;
      arcPixels++;
      if (result.healthyMask[p] || result.chlorosisMask[p] || result.necrosisMask[p] || result.uncertainMask[p]) {
        classifiedArc++;
      }
    }
    expect(arcPixels).toBeGreaterThan(100);
    expect(classifiedArc).toBe(0);
    expect(result.segmentationDiagnostics.removedComponentCount).toBeGreaterThan(0);
  });
});

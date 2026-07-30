import { describe, expect, it } from 'vitest';
import {
  applyDamageOverlay,
  computeCaterpillarDefoliation,
  countMask,
  estimateDefoliationFromRemainingMask,
} from './caterpillarDefoliation';

function idx(width: number, x: number, y: number) {
  return y * width + x;
}

function ellipseMask(width: number, height: number, cx: number, cy: number, rx: number, ry: number) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inside = ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1;
      if (inside) mask[idx(width, x, y)] = 1;
    }
  }
  return mask;
}

function removeCircle(mask: Uint8Array, width: number, height: number, cx: number, cy: number, radius: number) {
  const out = new Uint8Array(mask);
  const r2 = radius ** 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) out[idx(width, x, y)] = 0;
    }
  }
  return out;
}

function makeImage(
  width: number,
  height: number,
  leafMask: Uint8Array,
  spots: Array<{ cx: number; cy: number; radius: number; color: [number, number, number] }> = [],
) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = idx(width, x, y);
      const offset = p * 4;
      data[offset] = 238;
      data[offset + 1] = 240;
      data[offset + 2] = 231;
      data[offset + 3] = 255;

      if (x < 24 || x > width - 25 || y < 18) {
        data[offset] = 45;
        data[offset + 1] = 126;
        data[offset + 2] = 49;
      }

      if (x > 18 && x < 74 && y > height - 40 && y < height - 12) {
        data[offset] = 178;
        data[offset + 1] = 132;
        data[offset + 2] = 101;
      }

      if (leafMask[p]) {
        data[offset] = 74;
        data[offset + 1] = 158;
        data[offset + 2] = 45;
      }
    }
  }

  for (const spot of spots) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = idx(width, x, y);
        if (!leafMask[p]) continue;
        if ((x - spot.cx) ** 2 + (y - spot.cy) ** 2 > spot.radius ** 2) continue;
        const offset = p * 4;
        data[offset] = spot.color[0];
        data[offset + 1] = spot.color[1];
        data[offset + 2] = spot.color[2];
      }
    }
  }

  return { data, width, height };
}

function expectDamageInsideLeafRegion(result: ReturnType<typeof computeCaterpillarDefoliation>) {
  for (let i = 0; i < result.damageMask.length; i++) {
    if (result.damageMask[i]) expect(result.leafRegionMask[i]).toBe(1);
    if (result.damageMask[i]) expect(result.remainingLeafMask[i]).toBe(0);
  }
}

describe('caterpillar defoliation masks', () => {
  it('case 1: intact leaf stays near zero defoliation', () => {
    const width = 160;
    const height = 120;
    const leaf = ellipseMask(width, height, 80, 60, 42, 30);

    const result = estimateDefoliationFromRemainingMask(leaf, width, height);

    expect(result.percentualDesfolha).toBeLessThan(0.8);
    expect(countMask(result.damageMask)).toBeLessThanOrEqual(Math.round(result.areaFoliarOriginalEstimada * 0.008));
    expect(result.areaFoliarRemanescente + result.areaFoliarConsumida).toBe(result.areaFoliarOriginalEstimada);
  });

  it('case 2: one internal hole is the only orange damage area', () => {
    const width = 160;
    const height = 120;
    const leaf = removeCircle(ellipseMask(width, height, 80, 60, 42, 30), width, height, 80, 60, 7);

    const result = estimateDefoliationFromRemainingMask(leaf, width, height);

    expect(result.damageMask[idx(width, 80, 60)]).toBe(1);
    expect(result.percentualDesfolha).toBeGreaterThan(1);
    expect(result.percentualDesfolha).toBeLessThan(8);
    expect(result.areaFoliarRemanescente + result.areaFoliarConsumida).toBe(result.areaFoliarOriginalEstimada);
  });

  it('case 3: multiple internal perforations are marked without using leaf color as damage', () => {
    const width = 180;
    const height = 130;
    let leaf = ellipseMask(width, height, 90, 65, 50, 34);
    leaf = removeCircle(leaf, width, height, 72, 55, 5);
    leaf = removeCircle(leaf, width, height, 95, 70, 6);
    leaf = removeCircle(leaf, width, height, 110, 58, 5);

    const result = estimateDefoliationFromRemainingMask(leaf, width, height);

    expect(result.damageMask[idx(width, 72, 55)]).toBe(1);
    expect(result.damageMask[idx(width, 95, 70)]).toBe(1);
    expect(result.damageMask[idx(width, 110, 58)]).toBe(1);
    expect(result.percentualDesfolha).toBeGreaterThan(1.5);
    expect(result.percentualDesfolha).toBeLessThan(10);
  });

  it('case 4: edge bite is reconstructed as missing tissue only', () => {
    const width = 180;
    const height = 130;
    const leaf = removeCircle(ellipseMask(width, height, 90, 65, 52, 35), width, height, 134, 65, 8);

    const result = estimateDefoliationFromRemainingMask(leaf, width, height);

    expect(result.damageMask[idx(width, 134, 65)]).toBe(1);
    expect(result.percentualDesfolha).toBeGreaterThan(0.4);
    expect(result.areaFoliarRemanescente + result.areaFoliarConsumida).toBe(result.areaFoliarOriginalEstimada);
  });

  it('case 5: severe area loss produces an elevated but bounded estimate', () => {
    const width = 200;
    const height = 150;
    let leaf = ellipseMask(width, height, 100, 75, 58, 42);
    leaf = removeCircle(leaf, width, height, 148, 70, 15);
    leaf = removeCircle(leaf, width, height, 55, 80, 15);
    leaf = removeCircle(leaf, width, height, 104, 112, 14);
    leaf = removeCircle(leaf, width, height, 95, 72, 9);

    const result = estimateDefoliationFromRemainingMask(leaf, width, height, { sensitivity: 'sensivel' });

    expect(result.percentualDesfolha).toBeGreaterThan(8);
    expect(result.percentualDesfolha).toBeLessThan(55);
    expect(result.areaFoliarRemanescente + result.areaFoliarConsumida).toBe(result.areaFoliarOriginalEstimada);
  });

  it('case 6: hand and vegetation background are ignored outside the selected main leaf', () => {
    const width = 180;
    const height = 140;
    const intactLeaf = ellipseMask(width, height, 96, 70, 44, 32);
    const leafWithHole = removeCircle(intactLeaf, width, height, 96, 70, 6);
    const image = makeImage(width, height, leafWithHole);

    const result = computeCaterpillarDefoliation(image, width, height);

    expect(result.damageMask[idx(width, 96, 70)]).toBe(1);
    expect(result.remainingLeafMask[idx(width, 30, height - 24)]).toBe(0);
    expect(result.damageMask[idx(width, 30, height - 24)]).toBe(0);
    expect(result.leafRegionMask[idx(width, 30, height - 24)]).toBe(0);
    expect(result.remainingLeafMask[idx(width, 8, 12)]).toBe(0);
    expect(result.damageMask[idx(width, 8, 12)]).toBe(0);
    expect(result.leafRegionMask[idx(width, 8, 12)]).toBe(0);
    expect(result.areaFoliarOriginalEstimada).toBeLessThan(width * height * 0.35);
    expectDamageInsideLeafRegion(result);
  });

  it('case 7: disease-like spots without missing tissue are not classified as defoliation', () => {
    const width = 180;
    const height = 140;
    const leaf = ellipseMask(width, height, 92, 70, 48, 34);
    const image = makeImage(width, height, leaf, [
      { cx: 83, cy: 63, radius: 6, color: [102, 70, 28] },
      { cx: 108, cy: 78, radius: 5, color: [124, 88, 35] },
    ]);

    const result = computeCaterpillarDefoliation(image, width, height);

    expect(result.damageMask[idx(width, 83, 63)]).toBe(0);
    expect(result.damageMask[idx(width, 108, 78)]).toBe(0);
    expect(result.percentualDesfolha).toBeLessThan(1.5);
    expectDamageInsideLeafRegion(result);
  });

  it('case 8: orange overlay draws the damage contour instead of filling the hole', () => {
    const width = 40;
    const height = 40;
    const damage = new Uint8Array(width * height);
    for (let y = 10; y <= 30; y++) {
      for (let x = 10; x <= 30; x++) damage[idx(width, x, y)] = 1;
    }
    const data = new Uint8ClampedArray(width * height * 4).fill(90);
    for (let p = 0; p < width * height; p++) data[p * 4 + 3] = 255;

    const overlaid = applyDamageOverlay({ data, width, height }, damage, width, height);
    const center = idx(width, 20, 20) * 4;
    const edge = idx(width, 10, 20) * 4;

    expect(Array.from(overlaid.slice(center, center + 3))).toEqual([90, 90, 90]);
    expect(Array.from(overlaid.slice(edge, edge + 3))).toEqual([255, 102, 0]);
  });
});

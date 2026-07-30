import { describe, expect, it } from 'vitest';
import { absoluteSeverityError, computeBinarySegmentationMetrics } from './segmentationMetrics';

describe('metricas para validacao com anotacao manual', () => {
  it('calcula IoU, Dice, precisao e revocacao', () => {
    const predicted = Uint8Array.from([1, 1, 1, 0, 0, 0]);
    const reference = Uint8Array.from([1, 1, 0, 1, 0, 0]);
    const metrics = computeBinarySegmentationMetrics(predicted, reference);

    expect(metrics.truePositive).toBe(2);
    expect(metrics.falsePositive).toBe(1);
    expect(metrics.falseNegative).toBe(1);
    expect(metrics.iou).toBeCloseTo(0.5, 8);
    expect(metrics.dice).toBeCloseTo(2 / 3, 8);
    expect(metrics.precision).toBeCloseTo(2 / 3, 8);
    expect(metrics.recall).toBeCloseTo(2 / 3, 8);
  });

  it('calcula erro absoluto da severidade em pontos percentuais', () => {
    expect(absoluteSeverityError(17.6, 15.2)).toBeCloseTo(2.4, 8);
  });
});

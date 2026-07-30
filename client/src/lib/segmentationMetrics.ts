export interface BinarySegmentationMetrics {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
  iou: number;
  dice: number;
  precision: number;
  recall: number;
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : numerator / denominator;
}

/** Compara uma mascara prevista com uma anotacao manual binaria de mesmo tamanho. */
export function computeBinarySegmentationMetrics(
  predicted: Uint8Array,
  reference: Uint8Array,
): BinarySegmentationMetrics {
  if (predicted.length !== reference.length) {
    throw new Error('A mascara prevista e a mascara de referencia devem ter o mesmo tamanho.');
  }

  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let trueNegative = 0;
  for (let p = 0; p < predicted.length; p++) {
    const pred = predicted[p] !== 0;
    const truth = reference[p] !== 0;
    if (pred && truth) truePositive++;
    else if (pred) falsePositive++;
    else if (truth) falseNegative++;
    else trueNegative++;
  }

  return {
    truePositive,
    falsePositive,
    falseNegative,
    trueNegative,
    iou: safeRatio(truePositive, truePositive + falsePositive + falseNegative),
    dice: safeRatio(2 * truePositive, 2 * truePositive + falsePositive + falseNegative),
    precision: safeRatio(truePositive, truePositive + falsePositive),
    recall: safeRatio(truePositive, truePositive + falseNegative),
  };
}

export function absoluteSeverityError(measuredPercentage: number, referencePercentage: number): number {
  return Math.abs(measuredPercentage - referencePercentage);
}

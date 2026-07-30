import { describe, expect, it } from 'vitest';
import { formatSeverityPercentage } from './AnalysisContext';

describe('apresentacao do percentual de severidade', () => {
  it.each([
    [0, '0,00%'],
    [5, '5,00%'],
    [17.6, '17,60%'],
    [100, '100,00%'],
    [Number.NaN, '0,00%'],
  ] as const)('formata %s sem atribuir categoria agronomica', (valor, esperado) => {
    expect(formatSeverityPercentage(valor)).toBe(esperado);
  });
});

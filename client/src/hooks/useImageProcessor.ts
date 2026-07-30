/**
 * Integra os pipelines de doença foliar e injúria entomológica à interface.
 * A análise de doença é local, adaptativa, memoizada e limitada em resolução.
 */
import { useCallback } from 'react';
import {
  type AnalysisFieldInfo,
  type AnalysisResult,
  type AnalysisSettings,
} from '@/contexts/AnalysisContext';
import { nanoid } from 'nanoid';
import { analyzeLeafDisease } from '@/lib/leafDiseaseAnalysis';
import {
  analyzeCaterpillarDefoliation,
  DAMAGE_INTEREST_AREAS,
  type CaterpillarDamageResult,
  type DamageInterestAreaId,
  type DefoliationSensitivity,
} from '@/lib/caterpillarDefoliation';
import {
  isSegmentationApiEnabled,
  segmentLeafWithApi,
  type SegmentationApiResponse,
} from '@/lib/segmentationApi';

export { DAMAGE_INTEREST_AREAS } from '@/lib/caterpillarDefoliation';
export type { CaterpillarDamageResult, DamageInterestAreaId } from '@/lib/caterpillarDefoliation';

export interface DiseaseProcessingControl {
  signal?: AbortSignal;
  onProgress?: (progress: number, stage: string) => void;
}

const DISEASE_CACHE_LIMIT = 1;
const diseaseAnalysisCache = new Map<string, AnalysisResult>();

function makeDiseaseCacheKey(imageDataUrl: string, cultura: string): string {
  const size = imageDataUrl.length;
  const head = imageDataUrl.slice(0, 96);
  const middle = imageDataUrl.slice(Math.max(0, Math.floor(size / 2) - 48), Math.floor(size / 2) + 48);
  const tail = imageDataUrl.slice(Math.max(0, size - 96));
  return JSON.stringify({ cultura, size, head, middle, tail });
}

function withAnalysisMetadata(
  analysis: AnalysisResult,
  observacoes?: string,
  field?: AnalysisFieldInfo,
): AnalysisResult {
  return {
    ...analysis,
    id: nanoid(8),
    timestamp: new Date(),
    observacoes,
    field: field && Object.values(field).some(Boolean) ? field : undefined,
  };
}

function damageLevelFromPercent(percent: number): CaterpillarDamageResult['nivel'] {
  if (percent <= 0) return 'saudavel';
  if (percent <= 5) return 'baixa';
  if (percent <= 25) return 'media';
  return 'alta';
}

function caterpillarResultFromApi(
  api: SegmentationApiResponse,
  imageDataUrl: string,
  cultura: string,
  observacoes: string | undefined,
  areaInteresse: DamageInterestAreaId,
  sensitivity: DefoliationSensitivity,
): CaterpillarDamageResult {
  const fallbackArea = {
    expectedLeafAreaPx: api.metrics.expectedLeafAreaPx,
    presentLeafAreaPx: api.metrics.presentLeafAreaPx,
    removedAreaPx: api.metrics.removedAreaPx,
    defoliationPercent: api.metrics.defoliationPercent,
  };
  const areasInteresse = DAMAGE_INTEREST_AREAS.map((definition) => {
    const area = api.areas?.find((candidate) => candidate.id === definition.id) || fallbackArea;
    const total = Math.max(0, Math.round(area.expectedLeafAreaPx));
    const visible = Math.max(0, Math.round(area.presentLeafAreaPx));
    const removed = Math.max(0, Math.round(area.removedAreaPx));
    return {
      id: definition.id,
      label: definition.label,
      shortLabel: definition.shortLabel,
      areaFoliarTotal: total,
      areaFoliarVisivel: visible,
      areaDanificada: removed,
      areaPreservada: Math.max(0, total - removed),
      danoPercentual: area.defoliationPercent,
    };
  });
  const selected = areasInteresse.find((area) => area.id === areaInteresse) || areasInteresse[0];
  const images = api.images;
  const selectedSensitivity = sensitivity === 'conservador' || sensitivity === 'sensivel'
    ? sensitivity
    : 'padrao';

  return {
    id: nanoid(8),
    timestamp: new Date(),
    cultura,
    observacoes,
    areaInteresse: selected.id,
    areaFoliarTotal: selected.areaFoliarTotal,
    areaFoliarVisivel: selected.areaFoliarVisivel,
    areaDanificada: selected.areaDanificada,
    areaFurosInternos: Math.round(api.metrics.internalHoleAreaPx),
    areaPerdaMarginal: Math.round(api.metrics.marginalLossAreaPx),
    areaPreservada: selected.areaPreservada,
    danoPercentual: selected.danoPercentual,
    areasInteresse,
    nivel: damageLevelFromPercent(selected.danoPercentual),
    confianca: api.confidence,
    imageDataUrl,
    processedImageDataUrl: images.overlay,
    visualizacoes: {
      folhaIsolada: images.whiteBackground,
      areaPresente: images.presentArea || images.leafMask,
      areaRemovida: images.removedAreaMask,
      contornoEstimado: images.expectedContour || images.expectedLeafMask,
      sobreposicao: images.overlay,
    },
    ajusteMascara: selectedSensitivity,
    ajusteAutomatico: sensitivity === 'automatico',
    avisosSegmentacao: api.warnings,
  };
}

export function useImageProcessor() {
  const processImage = useCallback(async (
    imageDataUrl: string,
    cultura: string,
    settings: AnalysisSettings,
    observacoes?: string,
    field?: AnalysisFieldInfo,
    control: DiseaseProcessingControl = {},
  ): Promise<AnalysisResult> => {
    // Os controles históricos de limiar permanecem compatíveis com a interface,
    // mas não governam o classificador adaptativo por imagem.
    void settings;

    const cacheKey = makeDiseaseCacheKey(imageDataUrl, cultura);
    const cached = diseaseAnalysisCache.get(cacheKey);
    if (cached) {
      control.onProgress?.(100, 'Resultado recuperado do cache');
      return withAnalysisMetadata(cached, observacoes, field);
    }

    const analysis = await analyzeLeafDisease(imageDataUrl, {
      workingMaxSide: 896,
      signal: control.signal,
      onProgress: control.onProgress,
      debug: true,
    });

    if (!analysis.reliable) {
      console.warn('[PhytoPathometric] Resultado de baixa confiança.', analysis.issues);
    }

    let pixelsOutsideLeaf = 0;
    for (let p = 0; p < analysis.leafMask.length; p++) {
      if (
        !analysis.leafMask[p] &&
        (analysis.healthyMask[p] || analysis.chlorosisMask[p] || analysis.necrosisMask[p] ||
          analysis.uncertainMask[p])
      ) pixelsOutsideLeaf++;
    }
    if (pixelsOutsideLeaf > 0) {
      throw new Error(`${pixelsOutsideLeaf} pixels classificados fora da máscara foliar.`);
    }

    const classSum = analysis.healthyPixels + analysis.chlorosisPixels + analysis.necrosisPixels +
      analysis.uncertainPixels;
    if (classSum !== analysis.totalLeafArea) {
      throw new Error(`Soma das classes (${classSum}) difere da área foliar (${analysis.totalLeafArea}).`);
    }

    const areaLesionada = analysis.chlorosisPixels + analysis.necrosisPixels;
    const result: AnalysisResult = {
      id: nanoid(8),
      timestamp: new Date(),
      cultura,
      severidade: analysis.severityPercentage,
      areaTotal: analysis.totalLeafArea,
      areaLesionada,
      areaSaudavel: analysis.healthyPixels,
      imageDataUrl,
      processedImageDataUrl: analysis.processedImageDataUrl,
      visualizacoes: {
        fundoRemovido: analysis.visualizations.backgroundRemovedImageDataUrl,
        mascaraFoliar: analysis.visualizations.leafMaskImageDataUrl,
        sobreposicao: analysis.visualizations.overlayImageDataUrl,
        mapaSegmentado: analysis.visualizations.segmentationMapImageDataUrl,
        contornos: analysis.visualizations.contourImageDataUrl,
        classes: {
          tecidoSadio: analysis.visualizations.classImageDataUrls.healthy,
          clorose: analysis.visualizations.classImageDataUrls.chlorosis,
          necrose: analysis.visualizations.classImageDataUrls.necrosis,
          areaRemovida: analysis.visualizations.classImageDataUrls.removed,
          naoClassificada: analysis.visualizations.classImageDataUrls.uncertain,
        },
        diagnostico: {
          mascaraInicial: analysis.visualizations.debugImageDataUrls.initialMask,
          fundoRemovido: analysis.visualizations.debugImageDataUrls.backgroundRemovedMask,
          componentes: analysis.visualizations.debugImageDataUrls.components,
          componentePrincipal: analysis.visualizations.debugImageDataUrls.selectedComponent,
          mascaraFinal: analysis.visualizations.debugImageDataUrls.finalMask,
          fundoExcluido: analysis.visualizations.debugImageDataUrls.background,
        },
      },
      segmentacao: {
        areaFoliarVisivel: analysis.visibleLeafArea,
        areaFoliarEstimada: analysis.estimatedLeafArea,
        areaAusente: analysis.removedPixels,
        areaNecrose: analysis.necrosisPixels,
        areaClorose: analysis.chlorosisPixels,
        areaIncerta: analysis.uncertainPixels,
        componentesRemovidos: analysis.segmentationDiagnostics.removedComponentCount,
        confiancaSegmentacao: analysis.confidence,
        metodo: analysis.method,
        temposMs: {
          leitura: analysis.timings.decodeMs,
          segmentacao: analysis.timings.segmentationMs,
          normalizacao: analysis.timings.normalizationMs,
          classificacao: analysis.timings.classificationMs,
          posProcessamento: analysis.timings.postprocessMs,
          sobreposicao: analysis.timings.overlayMs,
          total: analysis.timings.totalMs,
        },
        alertas: analysis.issues,
      },
      observacoes,
      field: field && Object.values(field).some(Boolean) ? field : undefined,
    };

    diseaseAnalysisCache.set(cacheKey, { ...result, observacoes: undefined, field: undefined });
    while (diseaseAnalysisCache.size > DISEASE_CACHE_LIMIT) {
      const oldestKey = diseaseAnalysisCache.keys().next().value;
      if (!oldestKey) break;
      diseaseAnalysisCache.delete(oldestKey);
    }

    return result;
  }, []);

  const processCaterpillarDamage = useCallback(async (
    imageDataUrl: string,
    cultura: string,
    observacoes?: string,
    areaInteresse: DamageInterestAreaId = 'folhaInteira',
    maskSensitivity: DefoliationSensitivity = 'automatico',
  ): Promise<CaterpillarDamageResult> => {
    if (isSegmentationApiEnabled()) {
      try {
        const api = await segmentLeafWithApi(imageDataUrl, { sensitivity: maskSensitivity });
        return caterpillarResultFromApi(api, imageDataUrl, cultura, observacoes, areaInteresse, maskSensitivity);
      } catch (error) {
        console.warn('[PhytoPathometric] API Python indisponível; usando fallback automático offline.', error);
      }
    }

    return analyzeCaterpillarDefoliation(
      imageDataUrl,
      cultura,
      observacoes,
      areaInteresse,
      maskSensitivity,
    );
  }, []);

  return { processImage, processCaterpillarDamage };
}

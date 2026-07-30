import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "@/contexts/AnalysisContext";
import { compactAnalysisForHistory } from "./analysisStorage";

describe("analysis history memory footprint", () => {
  it("keeps report images and metrics but removes diagnostic visualizations", () => {
    const analysis = {
      id: "analysis-1",
      timestamp: new Date("2026-07-25T12:00:00Z"),
      cultura: "Soja",
      severidade: 12.5,
      areaTotal: 1000,
      areaLesionada: 125,
      areaSaudavel: 875,
      imageDataUrl: "data:image/jpeg;base64,original",
      processedImageDataUrl: "data:image/png;base64,processed",
      visualizacoes: {
        fundoRemovido: "large-1",
        mascaraFoliar: "large-2",
        sobreposicao: "large-3",
        mapaSegmentado: "large-4",
        contornos: "large-5",
        classes: {
          tecidoSadio: "large-6",
          clorose: "large-7",
          necrose: "large-8",
          areaRemovida: "large-9",
          naoClassificada: "large-10",
        },
      },
    } satisfies AnalysisResult;

    const historyItem = compactAnalysisForHistory(analysis);

    expect(historyItem.visualizacoes).toBeUndefined();
    expect(historyItem.imageDataUrl).toBe(analysis.imageDataUrl);
    expect(historyItem.processedImageDataUrl).toBe(
      analysis.processedImageDataUrl
    );
    expect(historyItem.severidade).toBe(analysis.severidade);
  });
});

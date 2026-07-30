/**
 * PhytoPathometric — AgTech Dashboard Moderno
 * Context: Gerencia estado global de análises, histórico e configurações
 * Colors: Emerald forest green primary, cream background
 * Font: Plus Jakarta Sans + Syne
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  clearAnalysisHistory,
  compactAnalysisForHistory,
  loadAnalysisHistory,
  saveAnalysisHistory,
} from '@/lib/analysisStorage';

export interface AnalysisFieldInfo {
  propriedadeId?: string;
  propriedadeNome?: string;
  municipio?: string;
  uf?: string;
  talhao?: string;
  cultivar?: string;
  estadioFenologico?: string;
  safra?: string;
}

export interface AnalysisVisualizations {
  fundoRemovido: string;
  mascaraFoliar: string;
  sobreposicao: string;
  mapaSegmentado: string;
  contornos: string;
  classes: {
    tecidoSadio: string;
    clorose: string;
    necrose: string;
    areaRemovida: string;
    naoClassificada: string;
  };
  diagnostico?: {
    mascaraInicial: string;
    fundoRemovido: string;
    componentes: string;
    componentePrincipal: string;
    mascaraFinal: string;
    fundoExcluido: string;
  };
}

export interface AnalysisResult {
  id: string;
  timestamp: Date;
  cultura: string;
  severidade: number;
  areaTotal: number;
  areaLesionada: number;
  areaSaudavel: number;
  segmentacao?: {
    areaFoliarVisivel: number;
    areaFoliarEstimada: number;
    areaAusente: number;
    areaFurosInternos?: number;
    areaPerdaMarginal?: number;
    percentualDesfolha?: number;
    areaNecrose: number;
    areaClorose: number;
    areaIncerta?: number;
    componentesRemovidos?: number;
    confiancaSegmentacao?: number;
    amostraReferenciaSaudavel?: number;
    ruidoRemovido?: number;
    metodo?: string;
    temposMs?: {
      leitura?: number;
      segmentacao?: number;
      normalizacao?: number;
      classificacao?: number;
      posProcessamento?: number;
      sobreposicao?: number;
      total?: number;
    };
    alertas?: string[];
  };
  imageDataUrl?: string;
  processedImageDataUrl?: string;
  visualizacoes?: AnalysisVisualizations;
  observacoes?: string;
  field?: AnalysisFieldInfo;
}

export interface AnalysisSettings {
  hsvMinH: number;
  hsvMaxH: number;
  hsvMinS: number;
  hsvMaxS: number;
  hsvMinV: number;
  hsvMaxV: number;
  labLMin: number;
  labLMax: number;
  labAMin: number;
  labAMax: number;
  labBMin: number;
  labBMax: number;
}

interface AnalysisContextType {
  currentAnalysis: AnalysisResult | null;
  history: AnalysisResult[];
  isAnalyzing: boolean;
  settings: AnalysisSettings;
  setCurrentAnalysis: (analysis: AnalysisResult | null) => void;
  addToHistory: (analysis: AnalysisResult) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
  setIsAnalyzing: (v: boolean) => void;
  updateSettings: (s: Partial<AnalysisSettings>) => void;
  exportCSV: () => void;
  exportXLSX: () => void;
}

const defaultSettings: AnalysisSettings = {
  hsvMinH: 25, hsvMaxH: 85,
  hsvMinS: 30, hsvMaxS: 255,
  hsvMinV: 30, hsvMaxV: 255,
  labLMin: 20, labLMax: 90,
  labAMin: -20, labAMax: 40,
  labBMin: -10, labBMax: 50,
};

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [settings, setSettings] = useState<AnalysisSettings>(defaultSettings);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load history from SQLite on native platforms, with browser fallback.
  useEffect(() => {
    let cancelled = false;
    loadAnalysisHistory()
      .then((items) => {
        if (!cancelled) {
          setHistory(items);
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist full analyses, including images, when SQLite is available.
  useEffect(() => {
    if (!historyLoaded) return;
    saveAnalysisHistory(history).catch((error) => {
      console.warn('Could not save analysis history.', error);
    });
  }, [history, historyLoaded]);

  const addToHistory = useCallback((analysis: AnalysisResult) => {
    const historyItem = compactAnalysisForHistory(analysis);
    setHistory(prev => [historyItem, ...prev.filter(item => item.id !== analysis.id)].slice(0, 100));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    clearAnalysisHistory().catch((error) => {
      console.warn('Could not clear persisted history.', error);
    });
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateSettings = useCallback((s: Partial<AnalysisSettings>) => {
    setSettings(prev => ({ ...prev, ...s }));
  }, []);

  const csvCell = (value: unknown) => {
    const text = String(value ?? '').replace(/\r?\n/g, ' ');
    return /[",;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const xlsCell = (value: unknown) => String(value ?? '').replace(/\r?\n|\t/g, ' ');

  const exportCSV = useCallback(() => {
    if (history.length === 0) return;
    const headers = ['ID', 'Data', 'Hora', 'Cultura', 'Propriedade', 'Município', 'UF', 'Talhão', 'Cultivar', 'Estádio Fenológico', 'Safra', 'Severidade foliar (%)', 'Área foliar válida (px)', 'Área lesionada (px)', 'Área saudável (px)', 'Observações'];
    const rows = history.map(item => [
      item.id,
      new Date(item.timestamp).toLocaleDateString('pt-BR'),
      new Date(item.timestamp).toLocaleTimeString('pt-BR'),
      item.cultura,
      item.field?.propriedadeNome || '',
      item.field?.municipio || '',
      item.field?.uf || '',
      item.field?.talhao || '',
      item.field?.cultivar || '',
      item.field?.estadioFenologico || '',
      item.field?.safra || '',
      item.severidade.toFixed(2),
      item.areaTotal,
      item.areaLesionada,
      item.areaSaudavel,
      item.observacoes || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phytopathometric_historico_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  const exportXLSX = useCallback(() => {
    if (history.length === 0) return;
    // Simple TSV export as XLSX fallback (opens in Excel)
    const headers = ['ID', 'Data', 'Hora', 'Cultura', 'Propriedade', 'Município', 'UF', 'Talhão', 'Cultivar', 'Estádio Fenológico', 'Safra', 'Severidade foliar (%)', 'Área foliar válida (px)', 'Área lesionada (px)', 'Área saudável (px)', 'Observações'];
    const rows = history.map(item => [
      item.id,
      new Date(item.timestamp).toLocaleDateString('pt-BR'),
      new Date(item.timestamp).toLocaleTimeString('pt-BR'),
      item.cultura,
      item.field?.propriedadeNome || '',
      item.field?.municipio || '',
      item.field?.uf || '',
      item.field?.talhao || '',
      item.field?.cultivar || '',
      item.field?.estadioFenologico || '',
      item.field?.safra || '',
      item.severidade.toFixed(2),
      item.areaTotal,
      item.areaLesionada,
      item.areaSaudavel,
      item.observacoes || '',
    ]);
    const tsv = [headers, ...rows].map(row => row.map(xlsCell).join('\t')).join('\n');
    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phytopathometric_historico_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  return (
    <AnalysisContext.Provider value={{
      currentAnalysis, history, isAnalyzing, settings,
      setCurrentAnalysis, addToHistory, clearHistory, removeFromHistory,
      setIsAnalyzing, updateSettings, exportCSV, exportXLSX,
    }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider');
  return ctx;
}

export function formatSeverityPercentage(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return `${safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

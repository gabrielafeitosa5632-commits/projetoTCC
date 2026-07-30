import { useMemo, useState } from 'react';
import { Download, Eye, Image as ImageIcon, Layers3, ScanLine } from 'lucide-react';
import type { AnalysisResult } from '@/contexts/AnalysisContext';
import { formatSeverityPercentage } from '@/contexts/AnalysisContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type ViewId =
  | 'original'
  | 'leafMask'
  | 'backgroundRemoved'
  | 'overlay'
  | 'map'
  | 'contours'
  | 'healthy'
  | 'chlorosis'
  | 'necrosis'
  | 'removed'
  | 'uncertain'
  | 'debugInitial'
  | 'debugBackgroundRemoved'
  | 'debugComponents'
  | 'debugSelected'
  | 'debugFinal'
  | 'debugBackground';

interface LeafAnalysisViewerProps {
  result: AnalysisResult;
}

const PALETTE = {
  healthy: '#16a34a',
  chlorosis: '#facc15',
  necrosis: '#7c2d12',
  removed: '#f97316',
  uncertain: '#94a3b8',
};

export function LeafAnalysisViewer({ result }: LeafAnalysisViewerProps) {
  const [view, setView] = useState<ViewId>('overlay');
  const visuals = result.visualizacoes;
  const segmentation = result.segmentacao;

  const views = useMemo(() => {
    const classImages = visuals?.classes;
    const debug = visuals?.diagnostico;
    return [
      { id: 'original' as const, group: 'main', label: 'Original', icon: ImageIcon, src: result.imageDataUrl },
      { id: 'leafMask' as const, group: 'main', label: 'Máscara da folha', icon: ScanLine, src: visuals?.mascaraFoliar },
      { id: 'backgroundRemoved' as const, group: 'main', label: 'Fundo branco', icon: ScanLine, src: visuals?.fundoRemovido },
      { id: 'overlay' as const, group: 'main', label: 'Sobreposição', icon: Layers3, src: visuals?.sobreposicao ?? result.processedImageDataUrl },
      { id: 'map' as const, group: 'main', label: 'Mapa', icon: Eye, src: visuals?.mapaSegmentado },
      { id: 'contours' as const, group: 'main', label: 'Contornos', icon: ScanLine, src: visuals?.contornos },
      { id: 'healthy' as const, group: 'class', label: 'Tecido sadio', icon: Eye, src: classImages?.tecidoSadio },
      { id: 'chlorosis' as const, group: 'class', label: 'Clorose', icon: Eye, src: classImages?.clorose },
      { id: 'necrosis' as const, group: 'class', label: 'Necrose', icon: Eye, src: classImages?.necrose },
      { id: 'uncertain' as const, group: 'class', label: 'Região incerta', icon: Eye, src: classImages?.naoClassificada },
      { id: 'removed' as const, group: 'class', label: 'Área removida (separada)', icon: Eye, src: classImages?.areaRemovida },
      { id: 'debugInitial' as const, group: 'debug', label: 'Máscara inicial', icon: Eye, src: debug?.mascaraInicial },
      { id: 'debugBackgroundRemoved' as const, group: 'debug', label: 'Após remover fundo', icon: Eye, src: debug?.fundoRemovido },
      { id: 'debugComponents' as const, group: 'debug', label: 'Componentes', icon: Eye, src: debug?.componentes },
      { id: 'debugSelected' as const, group: 'debug', label: 'Componente principal', icon: Eye, src: debug?.componentePrincipal },
      { id: 'debugFinal' as const, group: 'debug', label: 'Máscara final', icon: Eye, src: debug?.mascaraFinal },
      { id: 'debugBackground' as const, group: 'debug', label: 'Fundo excluído', icon: Eye, src: debug?.fundoExcluido },
    ].filter((item) => Boolean(item.src));
  }, [result.imageDataUrl, result.processedImageDataUrl, visuals]);

  const selected = views.find((item) => item.id === view) ?? views[0];
  const total = Math.max(1, result.areaTotal);
  const metrics = [
    { label: 'Tecido sadio', pixels: result.areaSaudavel, color: PALETTE.healthy },
    { label: 'Clorose', pixels: segmentation?.areaClorose ?? 0, color: PALETTE.chlorosis },
    { label: 'Necrose', pixels: segmentation?.areaNecrose ?? 0, color: PALETTE.necrosis },
    { label: 'Região incerta', pixels: segmentation?.areaIncerta ?? 0, color: PALETTE.uncertain },
  ];

  const downloadCurrent = () => {
    if (!selected?.src) return;
    const anchor = document.createElement('a');
    anchor.href = selected.src;
    anchor.download = `phytopathometric-${selected.id}-${result.id}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    toast.success('Imagem do resultado salva.');
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-950 px-4 py-3 text-white">
        <div>
          <p className="text-sm font-bold">Segmentação foliar</p>
          <p className="mt-0.5 text-[10px] text-emerald-100">
            Fundo excluído dos cálculos · classes restritas à máscara da folha
          </p>
        </div>
        <div className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">
          Confiança {Math.round((segmentation?.confiancaSegmentacao ?? 0) * 100)}%
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3 [scrollbar-width:none]">
        {views.filter((item) => item.group === 'main').map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex flex-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                selected?.id === item.id
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <Icon size={12} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] p-3">
        {selected?.src && (
          <img
            src={selected.src}
            alt={`Visualização: ${selected.label}`}
            className="mx-auto max-h-[26rem] w-full rounded-xl bg-white object-contain shadow-sm"
          />
        )}
      </div>

      <div className="space-y-3 p-3">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Visualizar classe isolada</p>
          <div className="flex flex-wrap gap-2">
            {views.filter((item) => item.group === 'class').map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${
                  selected?.id === item.id
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {views.some((item) => item.group === 'debug') && (
          <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-slate-600">
              Diagnóstico da segmentação
            </summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {views.filter((item) => item.group === 'debug').map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${
                    selected?.id === item.id
                      ? 'border-blue-700 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-slate-500">
              Componentes removidos: {segmentation?.componentesRemovidos ?? 0}
            </p>
          </details>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: metric.color }} />
                <span className="text-[10px] font-semibold leading-tight text-slate-600">{metric.label}</span>
              </div>
              <p className="mt-1 font-display text-base font-bold text-slate-950">
                {((metric.pixels / total) * 100).toFixed(1)}%
              </p>
              <p className="text-[9px] text-slate-500">{metric.pixels.toLocaleString('pt-BR')} px²</p>
            </div>
          ))}
        </div>

        {(segmentation?.areaAusente ?? 0) > 0 && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-[10px] text-orange-900">
            <span className="font-bold">Área removida estimada separadamente:</span>{' '}
            {(segmentation?.areaAusente ?? 0).toLocaleString('pt-BR')} px². Ela não foi somada à severidade foliar.
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2">
          <div className="text-[10px] text-emerald-900">
            <span className="font-bold">Área foliar válida:</span> {result.areaTotal.toLocaleString('pt-BR')} px²
            <span className="mx-1.5">·</span>
            <span className="font-bold">Severidade foliar:</span> {formatSeverityPercentage(result.severidade)}
          </div>
          <Button type="button" size="sm" onClick={downloadCurrent} className="h-8 flex-none gap-1.5 px-3 text-[11px]">
            <Download size={13} />
            Salvar
          </Button>
        </div>
      </div>
    </section>
  );
}

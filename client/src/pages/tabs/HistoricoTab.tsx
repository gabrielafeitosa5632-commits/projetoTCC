import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, BarChart2, List, FileText, FileSpreadsheet, Search, X, SlidersHorizontal, FileDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatSeverityPercentage, useAnalysis, AnalysisResult } from '@/contexts/AnalysisContext';
import { useProfile } from '@/contexts/ProfileContext';
import { SeverityGauge } from '@/components/SeverityGauge';
import { downloadAnalysisPdf } from '@/lib/pdfReport';
import { downloadAnalysisDoc } from '@/lib/docReport';

type ViewMode = 'list' | 'chart';

function HistoryItem({
  item,
  onRemove,
  onExportPdf,
  onExportDoc,
}: {
  item: AnalysisResult;
  onRemove: () => void;
  onExportPdf: () => void;
  onExportDoc: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div layout className="card-phyto border-l-[3px] border-l-emerald-600">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: '#ecfdf5', color: '#0f766e' }}>
          {formatSeverityPercentage(item.severidade)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{item.cultura}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 font-medium text-emerald-800">Percentual medido</span>
          </div>
          <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString('pt-BR')}</p>
          {item.field?.propriedadeNome && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700">
              <MapPin size={9} />{item.field.propriedadeNome}{item.field.talhao ? ` · ${item.field.talhao}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onExportPdf} className="p-1.5 rounded-lg hover:bg-emerald-50 text-muted-foreground hover:text-emerald-700 transition-colors">
            <FileDown size={13} />
          </button>
          <button onClick={onExportDoc} className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-700 transition-colors">
            <FileText size={13} />
          </button>
          <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <SlidersHorizontal size={13} />
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-border">
            <div className="flex justify-center">
              <SeverityGauge value={item.severidade} size={80} showLabel={false} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-secondary/40 rounded-xl p-2">
                <p className="text-[10px] text-muted-foreground">Propriedade</p>
                <p className="font-semibold">{item.field?.propriedadeNome || 'Sem vínculo'}</p>
              </div>
              <div className="bg-secondary/40 rounded-xl p-2">
                <p className="text-[10px] text-muted-foreground">Talhão</p>
                <p className="font-semibold">{item.field?.talhao || 'Não informado'}</p>
              </div>
              <div className="bg-secondary/40 rounded-xl p-2">
                <p className="text-[10px] text-muted-foreground">Cultivar</p>
                <p className="font-semibold">{item.field?.cultivar || 'Não informada'}</p>
              </div>
              <div className="bg-secondary/40 rounded-xl p-2">
                <p className="text-[10px] text-muted-foreground">Estádio / Safra</p>
                <p className="font-semibold">{item.field?.estadioFenologico || '-'} · {item.field?.safra || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="bg-secondary/40 rounded-xl p-2">
                <p className="text-[10px] text-muted-foreground">Area Total</p>
                <p className="text-xs font-bold">{item.areaTotal.toLocaleString()} px</p>
              </div>
              <div className="bg-red-50 rounded-xl p-2">
                <p className="text-[10px] text-muted-foreground">Lesionada</p>
                <p className="text-xs font-bold text-red-600">{item.areaLesionada.toLocaleString()} px</p>
              </div>
              <div className="bg-green-50 rounded-xl p-2">
                <p className="text-[10px] text-muted-foreground">Saudavel</p>
                <p className="text-xs font-bold text-green-600">{item.areaSaudavel.toLocaleString()} px</p>
              </div>
            </div>
            {item.observacoes && <p className="text-xs text-muted-foreground mt-2 italic">{item.observacoes}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function HistoricoTab() {
  const { history, removeFromHistory, clearHistory, exportCSV, exportXLSX } = useAnalysis();
  const { profile } = useProfile();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [busca, setBusca] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);

  const culturas = useMemo(() => [...new Set(history.map(h => h.cultura))], [history]);

  const filtrado = useMemo(() => history.filter(item => {
    const matchBusca = !busca || item.cultura.toLowerCase().includes(busca.toLowerCase());
    return matchBusca;
  }), [history, busca]);

  const chartData = [...filtrado].reverse().slice(-20).map((item, i) => ({
    index: i + 1,
    severidade: item.severidade,
    cultura: item.cultura,
    date: new Date(item.timestamp).toLocaleDateString('pt-BR'),
  }));
  const chartWidth = 320;
  const chartHeight = 180;
  const chartPadding = { left: 26, right: 14, top: 14, bottom: 26 };
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const chartPoints = chartData.map((item, index) => {
    const x = chartPadding.left + (chartData.length <= 1 ? chartInnerWidth / 2 : (index / (chartData.length - 1)) * chartInnerWidth);
    const y = chartPadding.top + chartInnerHeight - (Math.min(100, Math.max(0, item.severidade)) / 100) * chartInnerHeight;
    return { ...item, x, y };
  });
  const linePath = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = chartPoints.length > 0
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${chartPadding.top + chartInnerHeight} L ${chartPoints[0].x} ${chartPadding.top + chartInnerHeight} Z`
    : '';

  const avgSeveridade = filtrado.length > 0 ? filtrado.reduce((acc, item) => acc + item.severidade, 0) / filtrado.length : 0;
  const maxSeveridade = filtrado.length > 0 ? Math.max(...filtrado.map(item => item.severidade)) : 0;
  const trend = chartData.length >= 2 ? chartData[chartData.length - 1].severidade - chartData[0].severidade : 0;
  const trendLabel = trend > 5 ? '↑ aumento' : trend < -5 ? '↓ reducao' : '→ estavel';
  const trendColor = trend > 5 ? '#EF4444' : trend < -5 ? '#22C55E' : '#6B7280';
  const filtroAtivo = Boolean(busca);

  const handleExportPdf = async (item: AnalysisResult) => {
    try {
      await downloadAnalysisPdf(item, { profile, logoUrl: '/logo-new.jpeg' });
      toast.success('Relatório PDF gerado!');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível gerar o PDF desta análise.');
    }
  };

  const handleExportDoc = async (item: AnalysisResult) => {
    try {
      await downloadAnalysisDoc(item, { profile, logoUrl: '/logo-new.jpeg' });
      toast.success('Relatório DOC gerado!');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível gerar o DOC desta análise.');
    }
  };

  return (
    <div className="flex flex-col gap-4">

      {/* HEADER */}
      <div className="card-phyto" style={{ background: 'linear-gradient(135deg, oklch(0.22 0.07 155), oklch(0.32 0.09 155))' }}>
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 size={16} className="text-green-300" />
          <span className="text-green-300 text-xs font-semibold uppercase tracking-wider">Historico de Analises</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: filtrado.length.toString(), sub: history.length !== filtrado.length ? `de ${history.length}` : 'analises' },
            { label: 'Media', value: formatSeverityPercentage(avgSeveridade), sub: 'severidade' },
            { label: 'Maxima', value: formatSeverityPercentage(maxSeveridade), sub: 'registrada' },
            { label: 'Tendencia', value: trendLabel, sub: 'evolucao', color: trendColor },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-[9px] text-green-300 uppercase tracking-wide">{stat.label}</p>
              <p className="text-white font-bold text-xs mt-0.5" style={stat.color ? { color: stat.color } : {}}>{stat.value}</p>
              <p className="text-green-300 text-[9px]">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FILTROS */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cultura..." className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
            {busca && <button onClick={() => setBusca('')}><X size={12} className="text-muted-foreground" /></button>}
          </div>
          <button onClick={() => setShowFiltros(v => !v)}
            className={`px-3 py-2 rounded-xl border transition-colors flex items-center gap-1.5 text-sm font-medium ${showFiltros || filtroAtivo ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border bg-background text-foreground'}`}>
            <SlidersHorizontal size={14} />
            {filtroAtivo && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>
        </div>

        <AnimatePresence>
          {showFiltros && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
              {culturas.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Cultura Rapida</p>
                  <div className="flex flex-wrap gap-1.5">
                    {culturas.map(c => (
                      <button key={c} onClick={() => setBusca(busca === c ? '' : c)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${busca === c ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-secondary text-foreground border-border'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {filtroAtivo && (
                <button onClick={() => setBusca('')} className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <X size={11} />Limpar filtros
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* VIEW TOGGLE + EXPORT */}
      <div className="flex gap-2">
        <div className="flex-1 flex rounded-xl border border-border overflow-hidden">
          <button onClick={() => setViewMode('list')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-background text-foreground hover:bg-secondary'}`}>
            <List size={13} />Lista
          </button>
          <button onClick={() => setViewMode('chart')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${viewMode === 'chart' ? 'bg-emerald-600 text-white' : 'bg-background text-foreground hover:bg-secondary'}`}>
            <BarChart2 size={13} />Grafico
          </button>
        </div>
        <button onClick={() => { exportCSV(); toast.success('CSV exportado!'); }} className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-secondary transition-colors text-xs font-medium flex items-center gap-1">
          <FileText size={13} />CSV
        </button>
        <button onClick={() => { exportXLSX(); toast.success('XLS exportado!'); }} className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-secondary transition-colors text-xs font-medium flex items-center gap-1">
          <FileSpreadsheet size={13} />XLS
        </button>
      </div>

      {/* GRAFICO */}
      {viewMode === 'chart' && filtrado.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-700 to-lime-600 px-4 py-3 text-white">
            <p className="text-sm font-bold">Evolucao da Severidade</p>
            <p className="text-[11px] text-emerald-100">Percentual medido sobre a área foliar válida</p>
          </div>
          <div className="px-3 pt-4 pb-2">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[230px] w-full overflow-visible" role="img" aria-label="Evolucao da severidade">
              <defs>
                <linearGradient id="severityLineGradientSvg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="severityAreaGradientSvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f766e" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity="0.03" />
                </linearGradient>
              </defs>

              {[0, 20, 40, 60, 80, 100].map((tick) => {
                const y = chartPadding.top + chartInnerHeight - (tick / 100) * chartInnerHeight;
                return (
                  <g key={tick}>
                    <line x1={chartPadding.left} x2={chartPadding.left + chartInnerWidth} y1={y} y2={y} stroke="#DDE7DC" strokeDasharray="4 4" />
                    <text x={chartPadding.left - 7} y={y + 3} textAnchor="end" className="fill-slate-500 text-[9px]">{tick}</text>
                  </g>
                );
              })}

              <line
                x1={chartPadding.left}
                x2={chartPadding.left + chartInnerWidth}
                y1={chartPadding.top + chartInnerHeight - (avgSeveridade / 100) * chartInnerHeight}
                y2={chartPadding.top + chartInnerHeight - (avgSeveridade / 100) * chartInnerHeight}
                stroke="#2563EB"
                strokeDasharray="5 5"
              />
              <text
                x={chartPadding.left + chartInnerWidth - 2}
                y={chartPadding.top + chartInnerHeight - (avgSeveridade / 100) * chartInnerHeight - 4}
                textAnchor="end"
                className="fill-blue-700 text-[9px] font-bold"
              >
                Media {avgSeveridade.toFixed(1)}%
              </text>

              {areaPath && <path d={areaPath} fill="url(#severityAreaGradientSvg)" />}
              {linePath && <path d={linePath} fill="none" stroke="url(#severityLineGradientSvg)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}

              {chartPoints.map((point) => (
                <g key={`${point.index}-${point.date}`}>
                  <circle cx={point.x} cy={point.y} r="5" fill="#0f766e" stroke="#ffffff" strokeWidth="2" />
                  <title>{`${point.date} - ${point.cultura}: ${point.severidade.toFixed(1)}%`}</title>
                </g>
              ))}

              {chartPoints.map((point, index) => (
                <text
                  key={`${point.index}-label`}
                  x={point.x}
                  y={chartHeight - 7}
                  textAnchor={index === 0 ? 'start' : index === chartPoints.length - 1 ? 'end' : 'middle'}
                  className="fill-slate-500 text-[8px]"
                >
                  {point.date.slice(0, 5)}
                </text>
              ))}
            </svg>
          </div>
          <div className="border-t border-emerald-50 bg-emerald-50/50 px-3 py-2 text-center text-[9px] text-emerald-900">
            A interpretação agronômica varia conforme a cultura e a doença avaliada.
          </div>
        </div>
      )}

      {/* LISTA */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filtrado.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart2 size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">{history.length === 0 ? 'Nenhuma analise realizada' : 'Nenhum resultado para os filtros'}</p>
              <p className="text-xs mt-1 opacity-70">{history.length === 0 ? 'Vá para Analisar e tire a primeira foto' : 'Tente outros filtros'}</p>
            </div>
          ) : (
            filtrado.map(item => (
              <HistoryItem
                key={item.id}
                item={item}
                onRemove={() => removeFromHistory(item.id)}
                onExportPdf={() => handleExportPdf(item)}
                onExportDoc={() => handleExportDoc(item)}
              />
            ))
          )}
        </div>
      )}

      {history.length > 0 && (
        <Button variant="outline" onClick={() => { clearHistory(); toast.success('Historico limpo!'); }} className="w-full text-red-500 border-red-200 hover:bg-red-50">
          <Trash2 size={13} className="mr-1.5" />Limpar Historico ({history.length})
        </Button>
      )}
    </div>
  );
}

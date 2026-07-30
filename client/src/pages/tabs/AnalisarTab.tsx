/**
 * PhytoPathometric — AnalisarTab
 * Main analysis tab: image capture, upload, processing and results
 * Design: AgTech Dashboard Moderno — Emerald/Green palette
 * Font: Plus Jakarta Sans + Syne
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Camera, CircleStop, Copy, FileCheck2, FileDown, FileText, Leaf, Loader2, Mail, MapPin, MessageCircle, Microscope, RotateCcw, Share2, ShieldCheck, Smartphone, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatSeverityPercentage, type AnalysisFieldInfo, useAnalysis } from '@/contexts/AnalysisContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { SeverityGauge } from '@/components/SeverityGauge';
import { CameraPreview } from '@/components/CameraPreview';
import { downloadAnalysisPdf } from '@/lib/pdfReport';
import { downloadAnalysisDoc } from '@/lib/docReport';
import { LeafAnalysisViewer } from '@/components/LeafAnalysisViewer';
import { prepareImageFile } from '@/lib/imagePreparation';

const CULTURAS = [
  'Soja', 'Milho', 'Feijão', 'Café', 'Trigo', 'Cana-de-açúcar',
  'Arroz', 'Algodão', 'Tomate', 'Batata', 'Outra',
];

const FEATURE_CARDS = [
  { icon: Camera, title: 'Captura', label: 'Foto da folha' },
  { icon: Microscope, title: 'Analise', label: 'Modelo adaptativo' },
  { icon: BarChart3, title: 'Severidade', label: 'Percentual' },
];

const WORKFLOW_STEPS = [
  { icon: Camera, title: '1. Capturar', text: 'Use a camera ou selecione uma imagem da galeria.' },
  { icon: Leaf, title: '2. Segmentar', text: 'O app separa area saudavel e lesoes foliares.' },
  { icon: FileCheck2, title: '3. Resultado', text: 'Veja a severidade com base na area foliar detectada.' },
];

function getDefaultSafra() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 6 ? `${year}/${String(year + 1).slice(-2)}` : `${year - 1}/${String(year).slice(-2)}`;
}

export function AnalisarTab() {
  const { settings, setCurrentAnalysis, addToHistory, isAnalyzing, setIsAnalyzing } = useAnalysis();
  const { profile, propriedades, propriedadeSelecionada, setPropriedadeSelecionada } = useProfile();
  const { processImage } = useImageProcessor();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cultura, setCultura] = useState('Soja');
  const [observacoes, setObservacoes] = useState('');
  const [propriedadeId, setPropriedadeId] = useState(propriedadeSelecionada || '');
  const [talhao, setTalhao] = useState('');
  const [cultivar, setCultivar] = useState('');
  const [estadioFenologico, setEstadioFenologico] = useState('');
  const [safra, setSafra] = useState(getDefaultSafra);
  const [result, setResult] = useState<ReturnType<typeof useAnalysis>['currentAnalysis']>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCameraHint, setShowCameraHint] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ value: 0, stage: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedPropriedade = useMemo(
    () => propriedades.find(prop => prop.id === propriedadeId) || null,
    [propriedades, propriedadeId],
  );

  const fieldInfo = useMemo<AnalysisFieldInfo>(() => ({
    propriedadeId: selectedPropriedade?.id,
    propriedadeNome: selectedPropriedade?.nome,
    municipio: selectedPropriedade?.municipio,
    uf: selectedPropriedade?.uf,
    talhao: talhao.trim() || undefined,
    cultivar: cultivar.trim() || undefined,
    estadioFenologico: estadioFenologico.trim() || undefined,
    safra: safra.trim() || undefined,
  }), [selectedPropriedade, talhao, cultivar, estadioFenologico, safra]);

  useEffect(() => {
    setPropriedadeId(propriedadeSelecionada || '');
  }, [propriedadeSelecionada]);

  useEffect(() => {
    if (!selectedPropriedade?.talhoes.length) return;
    if (!talhao || !selectedPropriedade.talhoes.includes(talhao)) {
      setTalhao(selectedPropriedade.talhoes[0] || '');
    }
  }, [selectedPropriedade, talhao]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      return;
    }
    try {
      const preparedImage = await prepareImageFile(file);
      setSelectedImage(preparedImage);
      setResult(null);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar esta imagem.');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedImage) {
      toast.error('Selecione uma imagem primeiro.');
      return;
    }
    setIsAnalyzing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setAnalysisProgress({ value: 1, stage: 'Preparando a imagem' });
    try {
      const analysis = await processImage(
        selectedImage,
        cultura,
        settings,
        observacoes || undefined,
        fieldInfo,
        {
          signal: controller.signal,
          onProgress: (value, stage) => setAnalysisProgress({ value, stage }),
        },
      );
      setResult(analysis);
      setCurrentAnalysis(analysis);
      addToHistory(analysis);
      if ((analysis.segmentacao?.confiancaSegmentacao ?? 1) < 0.55 || analysis.segmentacao?.alertas?.length) {
        toast.warning(`Confira a máscara segmentada. Severidade estimada: ${analysis.severidade.toFixed(1)}%`);
      } else {
        toast.success(`Análise concluída! Severidade: ${analysis.severidade.toFixed(1)}%`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.info('Análise cancelada com segurança.');
        return;
      }
      console.error(err);
      toast.error('Erro ao processar imagem. Tente novamente.');
    } finally {
      abortControllerRef.current = null;
      setIsAnalyzing(false);
    }
  }, [selectedImage, cultura, settings, observacoes, fieldInfo, processImage, setIsAnalyzing, setCurrentAnalysis, addToHistory]);

  const handleShare = useCallback((via: 'whatsapp' | 'email' | 'copiar') => {
    if (!result) return;
    const texto = `*PhytoPathometric — Resultado da Análise*
🌿 Cultura: ${result.cultura}
📊 Severidade foliar: ${formatSeverityPercentage(result.severidade)}
📐 Área foliar válida: ${result.areaTotal.toLocaleString('pt-BR')} px²
✅ Tecido sadio: ${result.areaSaudavel.toLocaleString('pt-BR')} px²
⚠️ Área lesionada: ${result.areaLesionada.toLocaleString('pt-BR')} px²
📅 Data: ${new Date(result.timestamp).toLocaleString('pt-BR')}
📍 Propriedade: ${result.field?.propriedadeNome || 'Não informada'}
🧭 Talhão: ${result.field?.talhao || 'Não informado'}
🌱 Cultivar: ${result.field?.cultivar || 'Não informada'}
🗓️ Safra: ${result.field?.safra || 'Não informada'}
🔑 ID: ${result.id}
${result.observacoes ? `📝 Obs: ${result.observacoes}` : ''}
_Analisado com PhytoPathometric — Segmentação foliar adaptativa_`;

    if (via === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    } else if (via === 'email') {
      const assunto = encodeURIComponent(`Análise Fitopatométrica — ${result.cultura} — ${result.severidade.toFixed(1)}%`);
      window.open(`mailto:?subject=${assunto}&body=${encodeURIComponent(texto)}`, '_blank');
    } else {
      navigator.clipboard.writeText(texto);
      toast.success('Resultado copiado para a área de transferência!');
    }
  }, [result]);

  const handleExportPdf = useCallback(async () => {
    if (!result) return;
    try {
      await downloadAnalysisPdf(result, { profile, logoUrl: '/logo-new.jpeg' });
      toast.success('Relatório PDF gerado!');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível gerar o PDF.');
    }
  }, [result, profile]);

  const handleExportDoc = useCallback(async () => {
    if (!result) return;
    try {
      await downloadAnalysisDoc(result, { profile, logoUrl: '/logo-new.jpeg' });
      toast.success('Relatório DOC gerado!');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível gerar o DOC.');
    }
  }, [result, profile]);

  const handleReset = useCallback(() => {
    abortControllerRef.current?.abort();
    setSelectedImage(null);
    setResult(null);
    setObservacoes('');
    setAnalysisProgress({ value: 0, stage: '' });
  }, []);

  const handleCancelAnalysis = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <section className="relative overflow-hidden rounded-2xl bg-[#073522] p-5 text-white shadow-lg shadow-emerald-950/15">
        <div className="absolute inset-y-0 right-0 w-36 bg-lime-300/10" />
        <div className="relative flex items-start gap-4">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-white/30">
            <img src="/logo-new.jpeg" alt="PhytoPathometric" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-lime-300/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-lime-200">
              <ShieldCheck size={12} />
              Diagnostico foliar
            </div>
            <h2 className="font-display text-xl font-bold leading-tight">Analise de severidade por imagem</h2>
            <p className="mt-1 text-sm leading-relaxed text-emerald-100">
              Capture uma folha, calcule a area lesionada e acompanhe o resultado por cultura.
            </p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {FEATURE_CARDS.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-xl border border-white/10 bg-white/8 px-2 py-3 text-center">
                <Icon size={18} className="mx-auto text-lime-300" />
                <p className="mt-1 text-[11px] font-bold leading-tight">{feature.title}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-emerald-100">{feature.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {WORKFLOW_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon size={16} />
              </div>
              <p className="text-[11px] font-bold text-emerald-950">{step.title}</p>
              <p className="mt-1 text-[10px] leading-snug text-slate-600">{step.text}</p>
            </div>
          );
        })}
      </section>

      {/* Cultura selector */}
      <div className="card-phyto">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          <Leaf size={12} className="inline mr-1" />Cultura Avaliada
        </Label>
        <div className="flex flex-wrap gap-2">
          {CULTURAS.map(c => (
            <button
              key={c}
              onClick={() => setCultura(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border ${
                cultura === c
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-secondary text-secondary-foreground border-border hover:border-primary/40'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Field metadata */}
      <div className="card-phyto">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          <MapPin size={12} className="inline mr-1" />Identificação de Campo
        </Label>

        <div className="grid grid-cols-1 gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Propriedade</span>
              <select
                value={propriedadeId}
                onChange={(event) => {
                  setPropriedadeId(event.target.value);
                  setPropriedadeSelecionada(event.target.value || null);
                }}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="">Sem vínculo</option>
                {propriedades.map(prop => (
                  <option key={prop.id} value={prop.id}>{prop.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Talhão</span>
              {selectedPropriedade?.talhoes.length ? (
                <select
                  value={talhao}
                  onChange={(event) => setTalhao(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  {selectedPropriedade.talhoes.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={talhao}
                  onChange={event => setTalhao(event.target.value)}
                  placeholder="Ex: T1"
                  className="h-10 text-xs"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cultivar</span>
              <Input value={cultivar} onChange={event => setCultivar(event.target.value)} placeholder="Ex: BMX" className="h-10 text-xs" />
            </div>
            <div>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Estádio</span>
              <Input value={estadioFenologico} onChange={event => setEstadioFenologico(event.target.value)} placeholder="Ex: R3" className="h-10 text-xs" />
            </div>
            <div>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Safra</span>
              <Input value={safra} onChange={event => setSafra(event.target.value)} placeholder="2026/27" className="h-10 text-xs" />
            </div>
          </div>

          {selectedPropriedade && (
            <p className="text-[11px] text-emerald-700">
              {selectedPropriedade.nome} — {selectedPropriedade.municipio}/{selectedPropriedade.uf}
            </p>
          )}
        </div>
      </div>

      {/* Image capture area */}
      <div className="card-phyto">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">
          <Camera size={12} className="inline mr-1" />Imagem Foliar
        </Label>

        {!selectedImage ? (
          <div
            className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-5 flex flex-col items-center gap-3 transition-colors duration-200 hover:border-emerald-300"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-emerald-100">
              <Leaf size={40} className="text-emerald-700" />
              <span className="absolute left-3 top-3 h-5 w-5 rounded-tl-lg border-l-2 border-t-2 border-emerald-700" />
              <span className="absolute right-3 top-3 h-5 w-5 rounded-tr-lg border-r-2 border-t-2 border-emerald-700" />
              <span className="absolute bottom-3 left-3 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-emerald-700" />
              <span className="absolute bottom-3 right-3 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-emerald-700" />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-emerald-950 text-base">Capturar folha para analise</p>
              <p className="text-slate-600 text-xs mt-1">Centralize a folha e evite sombras fortes</p>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2 border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} />
                Galeria
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2 border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
                onClick={() => {
                  try {
                    setShowCameraPreview(true);
                  } catch {
                    setShowCameraHint(true);
                    fileInputRef.current?.click();
                  }
                }}
              >
                <Smartphone size={14} />
                Câmera ao Vivo
              </Button>
            </div>
            {showCameraHint && (
              <p className="text-xs text-muted-foreground text-center">
                Use a câmera do dispositivo para capturar a folha
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl bg-black/5">
              <img
                src={selectedImage}
                alt="Imagem selecionada"
                className="block max-h-72 max-w-full select-none object-contain"
                draggable={false}
              />
              <button
                onClick={handleReset}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
              >
                <RotateCcw size={14} className="text-white" />
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
      </div>

      {/* Observations */}
      <div className="card-phyto">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          Observações (opcional)
        </Label>
        <Textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          placeholder="Condições de campo, variedade, data de coleta..."
          className="text-sm resize-none min-h-[72px]"
          rows={3}
        />
      </div>

      {/* Analyze button */}
      <Button
        onClick={handleAnalyze}
        disabled={!selectedImage || isAnalyzing}
        className="w-full h-12 text-base font-semibold gap-2 rounded-xl"
        style={{ background: 'linear-gradient(135deg, oklch(0.32 0.09 155), oklch(0.42 0.12 155))' }}
      >
        {isAnalyzing ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Processando imagem...
          </>
        ) : (
          <>
            <Microscope size={18} />
            Analisar Folha
          </>
        )}
      </Button>

      {isAnalyzing && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-emerald-950">
            <span>{analysisProgress.stage || 'Processando localmente'}</span>
            <span>{Math.round(analysisProgress.value)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
              style={{ width: `${Math.max(2, analysisProgress.value)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={handleCancelAnalysis}
            className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-800"
          >
            <CircleStop size={12} />
            Cancelar com segurança
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleExportPdf}
          disabled={!result}
          className="h-11 gap-2 rounded-xl border-emerald-200 bg-white text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileDown size={16} />
          PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleExportDoc}
          disabled={!result}
          className="h-11 gap-2 rounded-xl border-blue-200 bg-white text-sm font-semibold text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText size={16} />
          DOC escrito
        </Button>
      </div>

      {/* Camera preview modal */}
      <AnimatePresence>
        {showCameraPreview && (
          <CameraPreview
            onCapture={(dataUrl) => {
              setSelectedImage(dataUrl);
              setResult(null);
            }}
            onClose={() => setShowCameraPreview(false)}
            isLoading={isAnalyzing}
          />
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <LeafAnalysisViewer result={result} />

            {/* Severity gauge */}
            <div
              className="flex flex-col items-center rounded-2xl border p-6 shadow-sm"
              style={{
                borderColor: '#a7f3d0',
                background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)',
              }}
            >
              <SeverityGauge
                value={result.severidade}
                size={180}
                animated
              />
              <p className="text-sm text-muted-foreground mt-3 text-center max-w-xs">
                A interpretação agronômica do percentual pode variar conforme a cultura e a doença avaliada.
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Área foliar válida', value: result.areaTotal.toLocaleString('pt-BR'), unit: 'px²', color: 'text-foreground' },
                { label: 'Tecido sadio', value: result.areaSaudavel.toLocaleString('pt-BR'), unit: 'px²', color: 'text-green-600' },
                { label: 'Lesionada', value: result.areaLesionada.toLocaleString('pt-BR'), unit: 'px²', color: 'text-red-500' },
              ].map(m => (
                <div key={m.label} className="card-phyto text-center py-3">
                  <p className={`font-display font-bold text-lg ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.unit}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Details toggle */}
            <button
              onClick={() => setShowDetails(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
            >
              <span>Detalhes da análise</span>
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card-phyto space-y-2 text-sm overflow-hidden"
                >
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID da análise</span>
                    <span className="font-mono text-xs font-medium">{result.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data/Hora</span>
                    <span className="font-medium">{new Date(result.timestamp).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cultura</span>
                    <span className="font-medium">{result.cultura}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/50 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Propriedade</span>
                      <p className="font-medium">{result.field?.propriedadeNome || 'Sem vínculo'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Talhão</span>
                      <p className="font-medium">{result.field?.talhao || 'Não informado'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cultivar</span>
                      <p className="font-medium">{result.field?.cultivar || 'Não informada'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estádio/Safra</span>
                      <p className="font-medium">{result.field?.estadioFenologico || '-'} · {result.field?.safra || '-'}</p>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fórmula</span>
                    <span className="font-medium text-xs">({result.areaLesionada} / {result.areaTotal}) × 100</span>
                  </div>
                  {result.segmentacao && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Necrose detectada</span>
                        <span className="font-medium text-xs">{result.segmentacao.areaNecrose.toLocaleString('pt-BR')} px²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clorose detectada</span>
                        <span className="font-medium text-xs">{result.segmentacao.areaClorose.toLocaleString('pt-BR')} px²</span>
                      </div>
                      {typeof result.segmentacao.areaIncerta === 'number' && result.segmentacao.areaIncerta > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Área incerta</span>
                          <span className="font-medium text-xs">{result.segmentacao.areaIncerta.toLocaleString('pt-BR')} px²</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Área foliar estimada</span>
                        <span className="font-medium text-xs">{result.segmentacao.areaFoliarEstimada.toLocaleString('pt-BR')} px²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Área ausente/recortada</span>
                        <span className="font-medium text-xs">{result.segmentacao.areaAusente.toLocaleString('pt-BR')} px²</span>
                      </div>
                      {typeof result.segmentacao.areaFurosInternos === 'number' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Perfurações internas</span>
                          <span className="font-medium text-xs">{result.segmentacao.areaFurosInternos.toLocaleString('pt-BR')} px²</span>
                        </div>
                      )}
                      {typeof result.segmentacao.areaPerdaMarginal === 'number' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Perda marginal estimada</span>
                          <span className="font-medium text-xs">{result.segmentacao.areaPerdaMarginal.toLocaleString('pt-BR')} px²</span>
                        </div>
                      )}
                      {typeof result.segmentacao.confiancaSegmentacao === 'number' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confiança da segmentação</span>
                          <span className="font-medium text-xs">{(result.segmentacao.confiancaSegmentacao * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      {typeof result.segmentacao.temposMs?.total === 'number' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tempo total</span>
                          <span className="font-medium text-xs">{result.segmentacao.temposMs.total.toFixed(0)} ms</span>
                        </div>
                      )}
                      {result.segmentacao.alertas?.length ? (
                        <div>
                          <span className="text-muted-foreground">Alertas</span>
                          <p className="mt-1 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                            {result.segmentacao.alertas.join(' ')}
                          </p>
                        </div>
                      ) : null}
                      {typeof result.segmentacao.amostraReferenciaSaudavel === 'number' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amostra de tecido sadio</span>
                          <span className="font-medium text-xs">{result.segmentacao.amostraReferenciaSaudavel.toFixed(1)}%</span>
                        </div>
                      )}
                      {typeof result.segmentacao.ruidoRemovido === 'number' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ruído removido</span>
                          <span className="font-medium text-xs">{result.segmentacao.ruidoRemovido.toLocaleString('pt-BR')} px²</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método</span>
                    <span className="font-medium text-xs">{result.segmentacao?.metodo || 'HSV + CIELAB'}</span>
                  </div>
                  {result.observacoes && (
                    <div>
                      <span className="text-muted-foreground">Observações</span>
                      <p className="mt-1 text-xs bg-secondary rounded-lg p-2">{result.observacoes}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Share buttons */}
            <div className="card-phyto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <Share2 size={12} />Compartilhar Resultado
              </p>
              <div className="grid grid-cols-5 gap-2">
                <button
                  onClick={handleExportPdf}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  <FileDown size={20} className="text-emerald-700" />
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">PDF</span>
                </button>
                <button
                  onClick={handleExportDoc}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                >
                  <FileText size={20} className="text-blue-600" />
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">DOC</span>
                </button>
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors"
                >
                  <MessageCircle size={20} className="text-green-600" />
                  <span className="text-[11px] font-semibold text-green-700 dark:text-green-400">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShare('email')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                >
                  <Mail size={20} className="text-blue-600" />
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">E-mail</span>
                </button>
                <button
                  onClick={() => handleShare('copiar')}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary border border-border hover:bg-accent transition-colors"
                >
                  <Copy size={20} className="text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground">Copiar</span>
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Bug,
  Camera,
  CheckCircle2,
  Leaf,
  Loader2,
  PieChart,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CameraPreview } from '@/components/CameraPreview';
import { DefoliationAnalysisViewer } from '@/components/DefoliationAnalysisViewer';
import { prepareImageFile } from '@/lib/imagePreparation';
import { SeverityGauge } from '@/components/SeverityGauge';
import { useAnalysis } from '@/contexts/AnalysisContext';
import {
  DAMAGE_INTEREST_AREAS,
  useImageProcessor,
  type CaterpillarDamageResult,
  type DamageInterestAreaId,
} from '@/hooks/useImageProcessor';
import type { DefoliationSensitivity } from '@/lib/caterpillarDefoliation';

const CULTURAS = [
  'Soja', 'Milho', 'Feijão', 'Café', 'Trigo', 'Cana-de-açúcar',
  'Arroz', 'Algodão', 'Tomate', 'Batata', 'Outra',
];

const DAMAGE_STEPS = [
  { icon: Activity, title: 'Remanescente', label: 'Folha atual' },
  { icon: Bug, title: 'Consumida', label: 'Tecido ausente' },
  { icon: PieChart, title: 'Desfolha', label: 'Percentual' },
];

const DEFOLIATION_REFERENCES = [
  { value: 5, title: 'Leve', color: '#16A34A', bg: '#F0FDF4' },
  { value: 15, title: 'Inicial', color: '#65A30D', bg: '#F7FEE7' },
  { value: 35, title: 'Moderada', color: '#D97706', bg: '#FFFBEB' },
  { value: 45, title: 'Alta', color: '#EA580C', bg: '#FFF7ED' },
];

const MASK_SENSITIVITY_OPTIONS: Array<{ value: DefoliationSensitivity; label: string; description: string }> = [
  { value: 'automatico', label: 'Automático', description: 'Escolha técnica' },
  { value: 'conservador', label: 'Conservador', description: 'Menos bordas' },
  { value: 'padrao', label: 'Padrão', description: 'Equilíbrio' },
  { value: 'sensivel', label: 'Sensível', description: 'Mais bordas' },
];

function getClosestDefoliationReference(value: number) {
  return DEFOLIATION_REFERENCES.reduce((closest, current) => (
    Math.abs(current.value - value) < Math.abs(closest.value - value) ? current : closest
  ));
}

function getMaskAdjustmentLabel(value: CaterpillarDamageResult['ajusteMascara']) {
  if (value === 'conservador') return 'conservador';
  if (value === 'sensivel') return 'sensível';
  return 'padrão';
}

export function InjuriasEntomologicasTab() {
  const { isAnalyzing, setIsAnalyzing } = useAnalysis();
  const { processCaterpillarDamage } = useImageProcessor();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cultura, setCultura] = useState('Soja');
  const [areaInteresse, setAreaInteresse] = useState<DamageInterestAreaId>('folhaInteira');
  const [sensibilidadeMascara, setSensibilidadeMascara] = useState<DefoliationSensitivity>('automatico');
  const [observacoes, setObservacoes] = useState('');
  const [result, setResult] = useState<CaterpillarDamageResult | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedImage) {
      toast.error('Selecione uma imagem primeiro.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await processCaterpillarDamage(
        selectedImage,
        cultura,
        observacoes || undefined,
        areaInteresse,
        sensibilidadeMascara,
      );
      setResult(analysis);
      const selectedArea = DAMAGE_INTEREST_AREAS.find((area) => area.id === areaInteresse);
      const message = `${selectedArea?.label ?? 'Área selecionada'}: ${analysis.danoPercentual.toFixed(1)}% de desfolha.`;
      if (analysis.confianca < 0.55 || analysis.avisosSegmentacao.length > 0) {
        toast.warning(`${message} A seleção automática teve baixa confiança; tente outra foto com a folha centralizada.`);
      } else {
        toast.success(message);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar injúria entomológica. Tente outra foto.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage, cultura, observacoes, areaInteresse, sensibilidadeMascara, processCaterpillarDamage, setIsAnalyzing]);

  const handleReset = useCallback(() => {
    setSelectedImage(null);
    setResult(null);
    setObservacoes('');
  }, []);

  const handleAreaChange = useCallback((areaId: DamageInterestAreaId) => {
    setAreaInteresse(areaId);
    setResult(null);
  }, []);

  const handleSensitivityChange = useCallback((value: DefoliationSensitivity) => {
    setSensibilidadeMascara(value);
    setResult(null);
  }, []);

  const selectedArea = DAMAGE_INTEREST_AREAS.find((area) => area.id === areaInteresse) ?? DAMAGE_INTEREST_AREAS[0];
  const closestDefoliation = result ? getClosestDefoliationReference(result.danoPercentual) : null;

  return (
    <div className="flex flex-col gap-4 pb-4">
      <section className="relative overflow-hidden rounded-2xl bg-[#2c2117] p-5 text-white shadow-lg shadow-amber-950/15">
        <div className="absolute inset-y-0 right-0 w-40 bg-orange-300/12" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-800 ring-1 ring-white/25">
            <Bug size={34} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-orange-300/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-100">
              <ShieldAlert size={12} />
              Entomologia foliar
            </div>
            <h2 className="font-display text-xl font-bold leading-tight">Análise de Injúrias Entomológicas</h2>
            <p className="mt-1 text-sm leading-relaxed text-orange-50">
              Quantificação de área consumida por lagartas na região selecionada.
            </p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {DAMAGE_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-xl border border-white/10 bg-white/8 px-2 py-3 text-center">
                <Icon size={18} className="mx-auto text-orange-200" />
                <p className="mt-1 text-[11px] font-bold leading-tight">{step.title}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-orange-50">{step.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="card-phyto">
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Leaf size={12} className="mr-1 inline" />Cultura Avaliada
        </Label>
        <div className="flex flex-wrap gap-2">
          {CULTURAS.map((crop) => (
            <button
              key={crop}
              onClick={() => setCultura(crop)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                cultura === crop
                  ? 'border-orange-700 bg-orange-700 text-white shadow-sm'
                  : 'border-border bg-secondary text-secondary-foreground hover:border-orange-300'
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      <div className="card-phyto">
        <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Activity size={12} className="mr-1 inline" />Área de Interesse
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {DAMAGE_INTEREST_AREAS.map((area) => {
            const isActive = areaInteresse === area.id;
            return (
              <button
                key={area.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleAreaChange(area.id)}
                className={`min-h-[74px] rounded-xl border px-3 py-2 text-left transition-all duration-150 ${
                  isActive
                    ? 'border-orange-700 bg-orange-50 text-orange-950 shadow-sm'
                    : 'border-border bg-white text-slate-800 hover:border-orange-300 hover:bg-orange-50/45'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold leading-tight">{area.label}</span>
                  {isActive && <CheckCircle2 size={14} className="flex-shrink-0 text-orange-700" />}
                </span>
                <span className="mt-1 block text-[10px] leading-snug text-muted-foreground">{area.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-phyto">
        <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldAlert size={12} className="mr-1 inline" />Ajuste da máscara
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {MASK_SENSITIVITY_OPTIONS.map((option) => {
            const isActive = sensibilidadeMascara === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleSensitivityChange(option.value)}
                className={`min-h-[58px] rounded-xl border px-2 py-2 text-center transition-all duration-150 ${
                  isActive
                    ? 'border-orange-700 bg-orange-50 text-orange-950 shadow-sm'
                    : 'border-border bg-white text-slate-800 hover:border-orange-300 hover:bg-orange-50/45'
                }`}
              >
                <span className="block text-[11px] font-bold leading-tight">{option.label}</span>
                <span className="mt-1 block text-[9px] leading-tight text-muted-foreground">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-phyto">
        <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <PieChart size={12} className="mr-1 inline" />Escala Visual de Desfolha
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {DEFOLIATION_REFERENCES.map((reference) => {
            const isClosest = closestDefoliation?.value === reference.value;
            return (
              <div
                key={reference.value}
                className={`rounded-xl border px-2 py-2 text-center transition-all ${
                  isClosest ? 'border-orange-700 shadow-sm' : 'border-border'
                }`}
                style={{ backgroundColor: reference.bg }}
              >
                <p className="font-display text-base font-bold leading-none" style={{ color: reference.color }}>
                  {reference.value}%
                </p>
                <p className="mt-1 text-[9px] font-semibold text-slate-700">{reference.title}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-phyto">
        <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Camera size={12} className="mr-1 inline" />Imagem Foliar
        </Label>

        {!selectedImage ? (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-5 transition-colors duration-200 hover:border-orange-300"
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-orange-100">
              <Bug size={42} className="text-orange-700" />
            </div>
            <div className="text-center">
              <p className="font-display text-base font-bold text-slate-950">Registrar injúria na folha</p>
              <p className="mt-1 text-xs text-slate-600">Use uma folha isolada e bem iluminada</p>
            </div>
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2 border-orange-200 bg-white text-orange-800 hover:bg-orange-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} />
                Galeria
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2 border-orange-700 bg-orange-700 text-white hover:bg-orange-800"
                onClick={() => {
                  try {
                    setShowCameraPreview(true);
                  } catch {
                    cameraInputRef.current?.click();
                  }
                }}
              >
                <Smartphone size={14} />
                Câmera
              </Button>
            </div>
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
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 transition-colors hover:bg-black/70"
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
          onChange={(event) => event.target.files?.[0] && handleFileSelect(event.target.files[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => event.target.files?.[0] && handleFileSelect(event.target.files[0])}
        />
      </div>

      <div className="card-phyto">
        <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Observações (opcional)
        </Label>
        <Textarea
          value={observacoes}
          onChange={(event) => setObservacoes(event.target.value)}
          placeholder="Talhão, estádio da cultura, espécie suspeita, nível de desfolha..."
          className="min-h-[72px] resize-none text-sm"
          rows={3}
        />
      </div>

      <Button
        onClick={handleAnalyze}
        disabled={!selectedImage || isAnalyzing}
        className="h-12 w-full gap-2 rounded-xl text-base font-semibold"
        style={{ background: 'linear-gradient(135deg, #9A3412, #C2410C)' }}
      >
        {isAnalyzing ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Calculando desfolha...
          </>
        ) : (
          <>
            <Bug size={18} />
            Segmentar Desfolha
          </>
        )}
      </Button>

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

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <DefoliationAnalysisViewer result={result} />

            <div
              className="flex flex-col items-center rounded-2xl border p-6 shadow-sm"
              style={{
                borderColor: '#fed7aa',
                background: 'linear-gradient(180deg, #ffffff 0%, #fff7ed 100%)',
              }}
            >
              <SeverityGauge
                value={result.danoPercentual}
                size={180}
                animated
                label="Dano foliar"
                color="#c2410c"
              />
              <p className="mt-3 max-w-xs text-center text-sm text-muted-foreground">
                {result.danoPercentual.toFixed(1)}% da área {selectedArea.label.toLowerCase()} foi estimada como área foliar consumida.
              </p>
              {closestDefoliation && (
                <div className="mt-3 rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-bold text-orange-800">
                  Faixa mais próxima: {closestDefoliation.value}% · {closestDefoliation.title}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Área foliar original estimada', value: result.areaFoliarTotal, color: 'text-slate-900' },
                { label: 'Área foliar remanescente', value: result.areaFoliarVisivel, color: 'text-emerald-700' },
                { label: 'Furos internos', value: result.areaFurosInternos, color: 'text-orange-600' },
                { label: 'Perda marginal', value: result.areaPerdaMarginal, color: 'text-orange-600' },
                { label: 'Área foliar consumida', value: result.areaDanificada, color: 'text-orange-700' },
                { label: 'Percentual de desfolha', value: `${result.danoPercentual.toFixed(2)}%`, color: 'text-orange-700', unit: '' },
              ].map((metric) => (
                <div key={metric.label} className="card-phyto py-3 text-center">
                  <p className={`font-display text-lg font-bold ${metric.color}`}>
                    {typeof metric.value === 'number' ? metric.value.toLocaleString('pt-BR') : metric.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{metric.unit ?? 'px²'}</p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>

            <div className="card-phyto space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Activity size={12} />Percentual por área
              </p>
              <div className="grid grid-cols-2 gap-2">
                {result.areasInteresse.map((area) => {
                  const isActive = area.id === result.areaInteresse;
                  return (
                    <div
                      key={area.id}
                      className={`rounded-xl border px-3 py-2 ${
                        isActive ? 'border-orange-700 bg-orange-50' : 'border-border bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold text-slate-900">{area.shortLabel}</p>
                        <p className="text-xs font-bold text-orange-700">{area.danoPercentual.toFixed(1)}%</p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-orange-600"
                          style={{ width: `${Math.min(100, area.danoPercentual)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <CheckCircle2 size={14} className="flex-shrink-0 text-orange-700" />
              <p className="text-xs font-medium text-orange-800">
                Confiança da análise: {(result.confianca * 100).toFixed(0)}% · Seleção automática · Estratégia {result.ajusteAutomatico ? 'adaptativa' : 'selecionada'}: {getMaskAdjustmentLabel(result.ajusteMascara)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

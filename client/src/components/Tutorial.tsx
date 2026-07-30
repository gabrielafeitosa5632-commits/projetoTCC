import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, BarChart2, MapPin, UserCircle, Settings, X, ChevronRight, Leaf } from "lucide-react";

const TUTORIAL_KEY = "phyto_tutorial_done";

const steps = [
  {
    icon: Leaf,
    color: "#1B4332",
    bg: "#F0FDF4",
    titulo: "Bem-vindo ao PhytoPathometric!",
    descricao: "O app de analise fitopatometrica mais completo para o campo. Vamos te mostrar como usar em 4 passos rapidos.",
  },
  {
    icon: Camera,
    color: "#0369A1",
    bg: "#EFF6FF",
    titulo: "Analise sua cultura",
    descricao: "Na aba Analisar, tire uma foto ou carregue uma imagem da folha. O app detecta automaticamente as lesoes e calcula a severidade.",
  },
  {
    icon: BarChart2,
    color: "#B45309",
    bg: "#FFFBEB",
    titulo: "Acompanhe o historico",
    descricao: "Todas as analises ficam salvas no Historico. Filtre por cultura e acompanhe a evolucao do percentual medido ao longo do tempo.",
  },
  {
    icon: MapPin,
    color: "#7C3AED",
    bg: "#F5F3FF",
    titulo: "Doencas da sua regiao",
    descricao: "Em Configuracoes, selecione seu estado para ver as doencas com maior incidencia na sua regiao e receber alertas sazonais.",
  },
  {
    icon: UserCircle,
    color: "#0F766E",
    bg: "#F0FDFA",
    titulo: "Configure seu perfil",
    descricao: "Cadastre seus dados de agronomista e suas propriedades. Eles aparecem automaticamente nos relatorios exportados.",
  },
];

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  const handleClose = () => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg bg-card rounded-3xl shadow-2xl overflow-hidden mb-4"
        >
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-emerald-600" : "w-1.5 bg-border"}`} />
                ))}
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-4 py-2">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ backgroundColor: current.bg }}>
                <Icon size={36} style={{ color: current.color }} />
              </div>
              <div className="space-y-2">
                <h2 className="font-display font-bold text-xl text-foreground">{current.titulo}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{current.descricao}</p>
              </div>
            </div>

            <div className="flex gap-3">
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                  Voltar
                </button>
              )}
              <button
                onClick={() => isLast ? handleClose() : setStep(s => s + 1)}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: current.color }}
              >
                {isLast ? "Comecar!" : "Proximo"}
                {!isLast && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function useTutorial() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_KEY);
    if (!done) setShow(true);
  }, []);
  return { show, close: () => { localStorage.setItem(TUTORIAL_KEY, "true"); setShow(false); } };
}

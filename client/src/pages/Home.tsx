import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav, TabId } from '@/components/BottomNav';
import { AnalisarTab } from './tabs/AnalisarTab';
import { InjuriasEntomologicasTab } from './tabs/InjuriasEntomologicasTab';
import { HistoricoTab } from './tabs/HistoricoTab';
import { PerfilTab } from './tabs/PerfilTab';
import { AnalysisProvider } from '@/contexts/AnalysisContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { Leaf, Microscope, WifiOff } from 'lucide-react';

const TAB_TITLES: Record<TabId, string> = {
  analisar: 'Lesões foliares',
  injurias: 'Análise de Injúrias Entomológicas',
  historico: 'Histórico técnico',
  perfil: 'Perfil e propriedades',
};

const tabVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -40 : 40, opacity: 0 }),
};

const TAB_ORDER: TabId[] = ['analisar', 'injurias', 'historico', 'perfil'];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('analisar');
  const [direction, setDirection] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const handleTabChange = (tab: TabId) => {
    const currentIdx = TAB_ORDER.indexOf(activeTab);
    const newIdx = TAB_ORDER.indexOf(tab);
    setDirection(newIdx > currentIdx ? 1 : -1);
    setActiveTab(tab);
  };

  return (
    <ProfileProvider>
    <AnalysisProvider>
      <div className="min-h-screen bg-[#f3f7f1] flex flex-col">

        <AnimatePresence>
          {isOffline && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-2 py-1.5">
              <WifiOff size={12} />
              Modo offline - processamento local ativo
            </motion.div>
          )}
        </AnimatePresence>

        <header className="sticky top-0 z-40 bg-[#062c1f] text-white shadow-lg shadow-emerald-950/15">
          <div className="max-w-lg mx-auto px-4 pt-3 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white overflow-hidden flex-shrink-0 ring-1 ring-white/20">
                <img src="/logo-new.jpeg" alt="PhytoPathometric" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display font-bold text-lg leading-tight truncate">PhytoPathometric</h1>
                <p className="text-[11px] text-emerald-100 leading-tight">
                  Segmentação foliar por imagem
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                {isOffline
                  ? <><span className="w-2 h-2 rounded-full bg-amber-300" /><span className="text-[10px] text-amber-100 font-semibold">Offline</span></>
                  : <><span className="w-2 h-2 rounded-full bg-lime-300 animate-pulse" /><span className="text-[10px] text-emerald-50 font-semibold">Ativo</span></>
                }
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { icon: Microscope, label: 'Segmentação precisa' },
                { icon: Leaf, label: TAB_TITLES[activeTab] },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-center gap-1.5 rounded-xl bg-white/9 px-2 py-2 text-[10px] font-semibold text-emerald-50">
                    <Icon size={13} className="text-lime-300" />
                    <span className="truncate">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-28 scroll-smooth">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div key={activeTab} custom={direction} variants={tabVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2, ease: 'easeInOut' }}>
                {activeTab === 'analisar' && <AnalisarTab />}
                {activeTab === 'injurias' && <InjuriasEntomologicasTab />}
                {activeTab === 'historico' && <HistoricoTab />}
                {activeTab === 'perfil' && <PerfilTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </AnalysisProvider>
    </ProfileProvider>
  );
}


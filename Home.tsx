import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav, TabId } from '@/components/BottomNav';
import { AnalisarTab } from './tabs/AnalisarTab';
import { HistoricoTab } from './tabs/HistoricoTab';
import { SobreTab } from './tabs/SobreTab';
import { ConfiguracoesTab } from './tabs/ConfiguracoesTab';
import { PerfilTab } from './tabs/PerfilTab';
import { AnalysisProvider } from '@/contexts/AnalysisContext';
import { Tutorial, useTutorial } from '@/components/Tutorial';
import { WifiOff } from 'lucide-react';

const TAB_TITLES: Record<TabId, string> = {
  analisar: 'Analisar',
  historico: 'Historico',
  sobre: 'Sobre',
  configuracoes: 'Configuracoes',
  perfil: 'Perfil',
};

const tabVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -40 : 40, opacity: 0 }),
};

const TAB_ORDER: TabId[] = ['analisar', 'historico', 'perfil', 'configuracoes', 'sobre'];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('analisar');
  const [direction, setDirection] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { show: showTutorial, close: closeTutorial } = useTutorial();

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
    <AnalysisProvider>
      {showTutorial && <Tutorial onClose={closeTutorial} />}
      <div className="min-h-screen bg-background flex flex-col">

        {/* Banner offline */}
        <AnimatePresence>
          {isOffline && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-2 py-1.5">
              <WifiOff size={12} />
              Modo offline — analises salvas localmente
            </motion.div>
          )}
        </AnimatePresence>

        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border/60">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
              <img src="/logo-new.jpeg" alt="PhytoPathometric" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h1 className="font-display font-bold text-base text-foreground leading-tight">PhytoPathometric</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">{TAB_TITLES[activeTab]}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {isOffline
                ? <><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] text-amber-600 font-medium">Offline</span></>
                : <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] text-muted-foreground font-medium">Ativo</span></>
              }
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-24 overflow-y-auto h-[calc(100vh-57px-64px)] scroll-smooth">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div key={activeTab} custom={direction} variants={tabVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2, ease: 'easeInOut' }}>
                {activeTab === 'analisar' && <AnalisarTab />}
                {activeTab === 'historico' && <HistoricoTab />}
                {activeTab === 'sobre' && <SobreTab />}
                {activeTab === 'configuracoes' && <ConfiguracoesTab />}
                {activeTab === 'perfil' && <PerfilTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </AnalysisProvider>
  );
}


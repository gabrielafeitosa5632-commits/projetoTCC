import { Bug, Camera, ClipboardList, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
export type TabId = 'analisar' | 'injurias' | 'historico' | 'perfil';
interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}
const tabs = [
  { id: 'analisar' as TabId, label: 'Doenças', icon: Camera },
  { id: 'injurias' as TabId, label: 'Lagartas', icon: Bug },
  { id: 'historico' as TabId, label: 'Histórico', icon: ClipboardList },
  { id: 'perfil' as TabId, label: 'Perfil', icon: UserRound },
];
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      <div className="max-w-lg mx-auto px-3 pb-3">
        <div className="flex items-center justify-around rounded-2xl border border-emerald-100 bg-white/95 px-1 py-1.5 shadow-lg shadow-emerald-950/10 backdrop-blur">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-xl transition-all duration-200 relative min-w-[46px]"
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl bg-[oklch(0.90_0.08_145)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <Icon
                  size={20}
                  className="transition-colors duration-200"
                  style={{ color: isActive ? 'oklch(0.27 0.09 155)' : 'oklch(0.48 0.04 155)' }}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span
                  className="text-[9px] font-semibold transition-colors duration-200"
                  style={{ color: isActive ? 'oklch(0.27 0.09 155)' : 'oklch(0.48 0.04 155)' }}
                >
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
}

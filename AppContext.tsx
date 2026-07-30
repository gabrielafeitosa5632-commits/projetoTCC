// context/AppContext.tsx
// Context global: localidade selecionada acessível em qualquer tela

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AppContextValue {
  selectedStateCode: string | null;
  setSelectedStateCode: (code: string | null) => void;
}

const AppContext = createContext<AppContextValue>({
  selectedStateCode: null,
  setSelectedStateCode: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedStateCode, setSelectedStateCodeState] = useState<string | null>(() => {
    try {
      return localStorage.getItem("phyto_state") || null;
    } catch {
      return null;
    }
  });

  const setSelectedStateCode = (code: string | null) => {
    setSelectedStateCodeState(code);
    try {
      if (code) localStorage.setItem("phyto_state", code);
      else localStorage.removeItem("phyto_state");
    } catch {}
  };

  return (
    <AppContext.Provider value={{ selectedStateCode, setSelectedStateCode }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);

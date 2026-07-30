import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type AgronomistaProfile, type Propriedade, profileVazio } from "@/lib/profileTypes";
import { accountStorageKey, readAccountStorageItem } from "@/lib/localAuth";
import { useAuth } from "@/contexts/AuthContext";
import { nanoid } from "nanoid";

interface ProfileContextValue {
  profile: AgronomistaProfile;
  updateProfile: (p: Partial<AgronomistaProfile>) => void;
  propriedades: Propriedade[];
  addPropriedade: (p: Omit<Propriedade, "id">) => void;
  updatePropriedade: (id: string, p: Partial<Propriedade>) => void;
  removePropriedade: (id: string) => void;
  propriedadeSelecionada: string | null;
  setPropriedadeSelecionada: (id: string | null) => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) throw new Error("ProfileProvider requires an authenticated user");

  const profileKey = accountStorageKey("phyto_profile", user.id);
  const propertiesKey = accountStorageKey("phyto_props", user.id);
  const selectedPropertyKey = accountStorageKey("phyto_prop_sel", user.id);

  const [profile, setProfile] = useState<AgronomistaProfile>(() => {
    try {
      return JSON.parse(readAccountStorageItem("phyto_profile", user.id) || "null") || {
        ...profileVazio,
        nome: user.name,
        email: user.email,
      };
    } catch {
      return { ...profileVazio, nome: user.name, email: user.email };
    }
  });
  const [propriedades, setPropriedades] = useState<Propriedade[]>(() => {
    try { return JSON.parse(readAccountStorageItem("phyto_props", user.id) || "[]"); } catch { return []; }
  });
  const [propriedadeSelecionada, setPropriedadeSelecionada] = useState<string | null>(() => {
    try { return readAccountStorageItem("phyto_prop_sel", user.id); } catch { return null; }
  });

  useEffect(() => { try { localStorage.setItem(profileKey, JSON.stringify(profile)); } catch {} }, [profile, profileKey]);
  useEffect(() => { try { localStorage.setItem(propertiesKey, JSON.stringify(propriedades)); } catch {} }, [propriedades, propertiesKey]);
  useEffect(() => {
    try {
      if (propriedadeSelecionada) localStorage.setItem(selectedPropertyKey, propriedadeSelecionada);
      else localStorage.removeItem(selectedPropertyKey);
    } catch {}
  }, [propriedadeSelecionada, selectedPropertyKey]);

  const updateProfile = (p: Partial<AgronomistaProfile>) => setProfile(prev => ({ ...prev, ...p }));
  const addPropriedade = (p: Omit<Propriedade, "id">) => setPropriedades(prev => [...prev, { ...p, id: nanoid(8) }]);
  const updatePropriedade = (id: string, p: Partial<Propriedade>) => setPropriedades(prev => prev.map(x => x.id === id ? { ...x, ...p } : x));
  const removePropriedade = (id: string) => setPropriedades(prev => prev.filter(x => x.id !== id));

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, propriedades, addPropriedade, updatePropriedade, removePropriedade, propriedadeSelecionada, setPropriedadeSelecionada }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

// hooks/useAppSettings.ts
// Gerencia configurações globais: tema e localidade selecionada

import { useState, useEffect } from "react";

export type Theme = "light" | "dark";

export interface AppLocation {
  state: string;
  stateCode: string;
  city?: string;
}

const STORAGE_KEY = "phyto_settings";

interface AppSettings {
  theme: Theme;
  location: AppLocation | null;
}

const defaultSettings: AppSettings = {
  theme: "light",
  location: null,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Aplica classe no root para o tema
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings]);

  const setTheme = (theme: Theme) =>
    setSettings((s) => ({ ...s, theme }));

  const setLocation = (location: AppLocation | null) =>
    setSettings((s) => ({ ...s, location }));

  return { settings, setTheme, setLocation };
}

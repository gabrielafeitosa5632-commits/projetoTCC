// components/SettingsPanel.tsx
// Painel de configurações: tema claro/escuro + localidade

import { useState } from "react";
import { Moon, Sun, MapPin, ChevronDown, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { ALL_STATES, type RegionDiseaseData } from "../data/diseasesByRegion";

interface SettingsPanelProps {
  onLocationChange?: (stateCode: string | null) => void;
  selectedStateCode?: string | null;
}

export function SettingsPanel({ onLocationChange, selectedStateCode }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [stateOpen, setStateOpen] = useState(false);

  const selectedState = ALL_STATES.find((s) => s.code === selectedStateCode);

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSelectState = (code: string) => {
    onLocationChange?.(code === selectedStateCode ? null : code);
    setStateOpen(false);
  };

  // Agrupa estados por região para o dropdown
  const byRegion = ALL_STATES.reduce<Record<string, typeof ALL_STATES>>(
    (acc, s) => {
      if (!acc[s.region]) acc[s.region] = [];
      acc[s.region].push(s);
      return acc;
    },
    {}
  );

  const regionOrder = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

  return (
    <div className="space-y-6 p-4">
      {/* ─── Tema ─── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Aparência</p>
          <p className="text-xs text-muted-foreground">
            {theme === "dark" ? "Modo escuro ativo" : "Modo claro ativo"}
          </p>
        </div>
        <button
          onClick={handleThemeToggle}
          className={[
            "relative inline-flex h-10 w-20 items-center justify-between rounded-full px-2 transition-colors duration-300",
            theme === "dark"
              ? "bg-slate-700 border border-slate-600"
              : "bg-amber-100 border border-amber-300",
          ].join(" ")}
          aria-label="Alternar tema"
        >
          <Sun
            className={`h-5 w-5 transition-opacity ${
              theme === "dark" ? "opacity-30 text-yellow-400" : "opacity-100 text-amber-500"
            }`}
          />
          <Moon
            className={`h-5 w-5 transition-opacity ${
              theme === "dark" ? "opacity-100 text-slate-200" : "opacity-30 text-slate-500"
            }`}
          />
          <span
            className={[
              "absolute h-7 w-7 rounded-full shadow-md transition-transform duration-300",
              theme === "dark"
                ? "translate-x-10 bg-slate-200"
                : "translate-x-0 bg-white",
            ].join(" ")}
          />
        </button>
      </div>

      <hr className="border-border" />

      {/* ─── Localidade ─── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-medium text-foreground">Localidade</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Selecione seu estado para ver as doenças com maior incidência na sua região.
        </p>

        {/* Dropdown de estado */}
        <div className="relative mt-2">
          <button
            onClick={() => setStateOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition hover:bg-muted"
          >
            <span className={selectedState ? "text-foreground" : "text-muted-foreground"}>
              {selectedState ? `${selectedState.name} (${selectedState.code})` : "Selecione seu estado…"}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${stateOpen ? "rotate-180" : ""}`}
            />
          </button>

          {stateOpen && (
            <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-xl">
              {/* Opção para limpar */}
              <button
                onClick={() => { onLocationChange?.(null); setStateOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Nenhum (sem filtro)
              </button>
              <hr className="border-border" />

              {regionOrder.map((region) => (
                <div key={region}>
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                    {region}
                  </p>
                  {byRegion[region]?.map((state) => (
                    <button
                      key={state.code}
                      onClick={() => handleSelectState(state.code)}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-muted"
                    >
                      <span>
                        {state.name}
                        <span className="ml-1.5 text-xs text-muted-foreground">({state.code})</span>
                      </span>
                      {selectedStateCode === state.code && (
                        <Check className="h-4 w-4 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badge do estado selecionado */}
        {selectedState && (
          <div className="mt-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
              📍 {selectedState.name} — Região {selectedState.region}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Doenças prioritárias desta região serão destacadas no app.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

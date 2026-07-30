// components/RegionalDiseases.tsx
// Exibe as principais doenças fitopatológicas do estado selecionado

import { AlertTriangle, Leaf, Calendar, FlaskConical, MapPin } from "lucide-react";
import { DISEASE_BY_STATE, type Disease } from "../data/diseasesByRegion";

interface RegionalDiseasesProps {
  stateCode: string | null;
}

const severityConfig = {
  alta: {
    label: "Alta",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    dot: "bg-red-500",
    cardBorder: "border-l-red-500",
  },
  média: {
    label: "Média",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-500",
    cardBorder: "border-l-amber-500",
  },
  baixa: {
    label: "Baixa",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    dot: "bg-green-500",
    cardBorder: "border-l-green-500",
  },
};

function DiseaseCard({ disease }: { disease: Disease }) {
  const sev = severityConfig[disease.severity];
  return (
    <div
      className={[
        "rounded-lg border border-border bg-card p-4 shadow-sm border-l-4",
        sev.cardBorder,
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-card-foreground leading-tight">
          {disease.name}
        </h3>
        <span
          className={[
            "flex-shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            sev.className,
          ].join(" ")}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
          {sev.label}
        </span>
      </div>

      {/* Crop + Pathogen */}
      <div className="mt-2 flex flex-wrap gap-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Leaf className="h-3.5 w-3.5 text-emerald-600" />
          <span>{disease.crop}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <FlaskConical className="h-3.5 w-3.5 text-violet-500" />
          <span className="italic">{disease.pathogen}</span>
        </div>
      </div>

      {/* Season */}
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5 text-blue-500" />
        <span>Pico: {disease.season}</span>
      </div>

      {/* Description */}
      <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
        {disease.description}
      </p>
    </div>
  );
}

export function RegionalDiseases({ stateCode }: RegionalDiseasesProps) {
  if (!stateCode) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <MapPin className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhuma localidade selecionada
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Selecione seu estado nas configurações para ver as doenças com maior incidência na sua região.
        </p>
      </div>
    );
  }

  const regionData = DISEASE_BY_STATE[stateCode];
  if (!regionData) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
        <p className="text-sm text-muted-foreground">
          Dados não disponíveis para este estado ainda.
        </p>
      </div>
    );
  }

  const highSeverity = regionData.topDiseases.filter((d) => d.severity === "alta");
  const others = regionData.topDiseases.filter((d) => d.severity !== "alta");

  return (
    <div className="space-y-4 px-4 pb-6">
      {/* Header da região */}
      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              {regionData.state} — Região {regionData.region}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Culturas principais: {regionData.mainCrops.slice(0, 3).join(", ")}
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de alta severidade */}
      {highSeverity.length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-xs font-medium text-red-700 dark:text-red-300">
            {highSeverity.length} doença{highSeverity.length > 1 ? "s" : ""} de alta severidade nesta região. Monitoramento constante recomendado.
          </p>
        </div>
      )}

      {/* Cards de doenças ordenados por severidade */}
      <div className="space-y-3">
        {[...highSeverity, ...others].map((disease) => (
          <DiseaseCard key={disease.id} disease={disease} />
        ))}
      </div>

      <p className="text-[11px] text-center text-muted-foreground/60 pt-2">
        Dados baseados em literatura fitopatológica e Embrapa. Consulte um agrônomo para diagnóstico preciso.
      </p>
    </div>
  );
}

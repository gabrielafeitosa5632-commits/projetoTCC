import { useMemo, useState } from "react";
import { Download, Eye, Leaf, ScanLine } from "lucide-react";
import { toast } from "sonner";
import type { CaterpillarDamageResult } from "@/lib/caterpillarDefoliation";
import { Button } from "@/components/ui/button";

type ViewId = "isolated" | "present" | "removed" | "estimated" | "overlay";

export function DefoliationAnalysisViewer({
  result,
}: {
  result: CaterpillarDamageResult;
}) {
  const [view, setView] = useState<ViewId>("overlay");
  const views = useMemo(
    () => [
      {
        id: "isolated" as const,
        label: "Folha isolada",
        icon: Leaf,
        src: result.visualizacoes.folhaIsolada,
      },
      {
        id: "present" as const,
        label: "Área presente",
        icon: Eye,
        src: result.visualizacoes.areaPresente,
      },
      {
        id: "removed" as const,
        label: "Área removida",
        icon: Eye,
        src: result.visualizacoes.areaRemovida,
      },
      {
        id: "estimated" as const,
        label: "Contorno estimado",
        icon: ScanLine,
        src: result.visualizacoes.contornoEstimado,
      },
      {
        id: "overlay" as const,
        label: "Sobreposição",
        icon: ScanLine,
        src: result.visualizacoes.sobreposicao,
      },
    ],
    [result.visualizacoes]
  );
  const selected = views.find(item => item.id === view) || views[4];

  const downloadCurrent = () => {
    const anchor = document.createElement("a");
    anchor.href = selected.src;
    anchor.download = `phytopathometric-desfolha-${selected.id}-${result.id}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    toast.success("Imagem da desfolha salva.");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-orange-100 bg-[#3a2416] px-4 py-3 text-white">
        <div>
          <p className="text-sm font-bold">
            Segmentação automática da desfolha
          </p>
          <p className="mt-0.5 text-[10px] text-orange-100">
            Fundo branco após o cálculo · laranja somente em tecido efetivamente
            removido
          </p>
        </div>
        <div className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">
          Confiança {Math.round(result.confianca * 100)}%
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3 [scrollbar-width:none]">
        {views.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex flex-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                selected.id === item.id
                  ? "border-orange-700 bg-orange-700 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <Icon size={12} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="bg-slate-50 p-3">
        <img
          src={selected.src}
          alt={`Visualização: ${selected.label}`}
          className="mx-auto max-h-[26rem] w-full rounded-xl bg-white object-contain shadow-sm"
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-orange-100 px-3 py-2.5">
        <div className="text-[10px] text-orange-950">
          <span className="font-bold">Furos:</span>{" "}
          {result.areaFurosInternos.toLocaleString("pt-BR")} px²
          <span className="mx-1.5">·</span>
          <span className="font-bold">Margem:</span>{" "}
          {result.areaPerdaMarginal.toLocaleString("pt-BR")} px²
        </div>
        <Button
          type="button"
          size="sm"
          onClick={downloadCurrent}
          className="h-8 flex-none gap-1.5 bg-orange-700 px-3 text-[11px] hover:bg-orange-800"
        >
          <Download size={13} />
          Salvar
        </Button>
      </div>
    </section>
  );
}

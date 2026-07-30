import { Settings, Info, Moon, Sun, MapPin, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { estadosData, regioes, getEstadosByRegiao } from '@/lib/locationDiseases';

const incidenciaCor: Record<string, string> = {
  Alta: 'bg-red-100 text-red-700 border-red-200',
  Media: 'bg-amber-100 text-amber-700 border-amber-200',
  Baixa: 'bg-green-100 text-green-700 border-green-200',
};

export function ConfiguracoesTab() {
  const { theme, toggleTheme, switchable } = useTheme();
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('Centro-Oeste');
  const [ufSelecionada, setUfSelecionada] = useState<string>('MT');

  const estadosDaRegiao = getEstadosByRegiao(regiaoSelecionada);
  const estadoAtual = estadosData.find(e => e.uf === ufSelecionada);

  return (
    <div className="flex flex-col gap-4 pb-4">

      <div className="card-phyto" style={{ background: 'linear-gradient(135deg, oklch(0.22 0.07 155), oklch(0.32 0.09 155))' }}>
        <div className="flex items-center gap-2 mb-1">
          <Settings size={16} className="text-green-300" />
          <span className="text-green-300 text-xs font-semibold uppercase tracking-wider">Personalizacao e Parametros</span>
        </div>
        <p className="text-white font-display font-bold text-lg">Configuracoes</p>
        <p className="text-green-200 text-xs mt-0.5">Tema, localização e método de análise</p>
      </div>

      <div className="card-phyto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <h3 className="font-display font-semibold text-sm">Tema</h3>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-amber-500" />}
            <div>
              <p className="text-sm font-semibold">{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</p>
              <p className="text-[10px] text-muted-foreground">{theme === 'dark' ? 'Fundo preto ativado' : 'Fundo branco ativado'}</p>
            </div>
          </div>
          {switchable && toggleTheme ? (
            <button
              onClick={() => { toggleTheme(); toast.success(theme === 'dark' ? 'Modo claro ativado!' : 'Modo escuro ativado!'); }}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-blue-500' : 'bg-amber-400'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          ) : (
            <span className="text-[10px] text-muted-foreground">Fixo</span>
          )}
        </div>
      </div>

      <div className="card-phyto">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={14} className="text-emerald-600" />
          <h3 className="font-display font-semibold text-sm">Doencas por Localizacao</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Principais doencas de acordo com seu estado</p>
        <div className="mb-2">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Regiao</Label>
          <div className="flex flex-wrap gap-1.5">
            {regioes.map(r => (
              <button key={r} onClick={() => { setRegiaoSelecionada(r); const p = getEstadosByRegiao(r); if (p.length > 0) setUfSelecionada(p[0].uf); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${regiaoSelecionada === r ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-secondary text-foreground border-border hover:border-emerald-400'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Estado</Label>
          <div className="flex flex-wrap gap-1.5">
            {estadosDaRegiao.map(e => (
              <button key={e.uf} onClick={() => setUfSelecionada(e.uf)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${ufSelecionada === e.uf ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-secondary text-foreground border-border hover:border-emerald-400'}`}>
                {e.uf}
              </button>
            ))}
          </div>
        </div>
        {estadoAtual && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">{estadoAtual.estado} — Top {estadoAtual.doencas.length} doencas</p>
            {estadoAtual.doencas.map((d, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl border border-border bg-secondary/20">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                  <AlertTriangle size={10} className="text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-semibold">{d.doenca}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${incidenciaCor[d.incidencia]}`}>{d.incidencia}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">{d.patogeno}</p>
                  <p className="text-[10px] text-muted-foreground">{d.culturas.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
        <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          A segmentação agora é adaptativa. Os controles HSV fixos foram removidos porque não participavam do cálculo e podiam sugerir uma calibração inexistente.
        </p>
      </div>

      <div className="card-phyto space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <h3 className="font-display font-semibold text-sm">Máscara foliar robusta</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          A API usa BiRefNet/ISNet via rembg, seguida de GrabCut, contorno ativo, watershed e morfologia do scikit-image. Sem API, o APK aplica o modo offline CIELAB com modelo do fundo, textura, conectividade e remoção de estruturas estreitas.
        </p>
      </div>

      <div className="card-phyto space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <h3 className="font-display font-semibold text-sm">Classificação de lesões — CIELAB</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          L*, a* e b* são normalizados dentro da máscara da folha. Protótipos adaptativos e distância CIEDE2000 distinguem tecido sadio, clorose e necrose; HSV atua somente como evidência auxiliar contra sombras e reflexos.
        </p>
      </div>

      <div className="card-phyto">
        <h3 className="font-display font-semibold text-sm mb-2">Protocolo de captura recomendado</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Fotografe uma única folha centralizada, sem mão ou galho sobre a lâmina, com luz difusa, câmera paralela e fundo fosco uniforme que contraste com a folha. Mantenha distância e iluminação constantes entre amostras do experimento.
        </p>
      </div>
    </div>
  );
}


/**
 * PhytoPathometric — SobreTab
 * About tab: app info, severity scale, methodology, references
 * Design: AgTech Dashboard Moderno — Emerald/Green palette
 */
import { motion } from 'framer-motion';
import { BookOpen, FlaskConical, Microscope, Leaf, GraduationCap, BarChart2, Info, ExternalLink } from 'lucide-react';
const PIPELINE_STEPS = [
  { icon: '📷', title: 'Captura', desc: 'Frame capturado por câmera integrada ou USB' },
  { icon: '🔵', title: 'Pré-processamento', desc: 'Orientação EXIF, redução de ruído e normalização da iluminação' },
  { icon: '✂️', title: 'Remoção do fundo', desc: 'Modelo adaptativo das bordas em CIELAB, sem depender apenas da cor verde' },
  { icon: '🟢', title: 'Máscara foliar', desc: 'Componente principal por cromaticidade, textura, conectividade e morfologia controlada' },
  { icon: '🔬', title: 'Classificação CIELAB', desc: 'Tecido sadio, clorose, necrose e região incerta somente dentro da máscara final' },
  { icon: '📊', title: 'Cálculo', desc: 'Severidade = (clorose + necrose) / área foliar válida × 100' },
  { icon: '💾', title: 'Exportação', desc: 'Histórico salvo localmente, exportável em CSV e XLS' },
];

const REFERENCES = [
  'BERGAMIN FILHO et al. Manual de Fitopatologia, 5ª ed. 2018.',
  'TAIZ et al. Fisiologia e Desenvolvimento Vegetal, 6ª ed. 2017.',
  'GONZALEZ & WOODS. Digital Image Processing, 4ª ed. 2018.',
  'BRADSKI & KAEHLER. Learning OpenCV. O\'Reilly, 2008.',
  'VAN DER WALT et al. scikit-image: image processing in Python. PeerJ, 2014.',
  'VALE et al. QUANT: software for plant disease severity. ICPP, 2003.',
];

export function SobreTab() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center py-6 gap-3"
      >
        <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg">
          <img src="/logo-new.jpeg" alt="PhytoPathometric logo" className="w-full h-full object-contain" />
        </div>
        <div className="text-center">
          <h1 className="font-display font-bold text-2xl text-foreground">PhytoPathometric</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Quantificação Automatizada de Doenças Foliares</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold border border-border">
              v1.0.0
            </span>
            <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold border border-border">
              Código Aberto
            </span>
          </div>
        </div>
      </motion.div>

      {/* About card */}
      <div className="card-phyto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Info size={15} className="text-primary" />
          </div>
          <h2 className="font-display font-semibold text-base">Sobre o Aplicativo</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O <strong className="text-foreground">PhytoPathometric</strong> é uma solução de código aberto desenvolvida em Python/Web, integrando visão computacional e interface gráfica para análise fitopatométrica automatizada em tempo real. Derivado dos termos gregos <em>phyto</em> (planta), <em>pathos</em> (doença) e <em>metron</em> (medida).
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          Desenvolvido no âmbito do <strong className="text-foreground">PIBITI/IFB</strong> — Instituto Federal de Educação, Ciência e Tecnologia de Brasília, área de Fitossanidade – Fitopatologia (CNPq: 5.01.02.00-0).
        </p>
      </div>

      {/* Percent measurement */}
      <div className="card-phyto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <BarChart2 size={15} className="text-primary" />
          </div>
          <h2 className="font-display font-semibold text-base">Medição percentual</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O aplicativo apresenta diretamente a severidade foliar em percentual, além dos percentuais de tecido sadio,
          clorose, necrose e região incerta. A área removida é informada separadamente e não entra na severidade.
        </p>
        <p className="text-xs text-muted-foreground mt-3 italic">
          A interpretação agronômica do percentual pode variar conforme a cultura e a doença avaliada.
        </p>
      </div>

      {/* Pipeline */}
      <div className="card-phyto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <FlaskConical size={15} className="text-primary" />
          </div>
          <h2 className="font-display font-semibold text-base">Pipeline de Processamento</h2>
        </div>
        <div className="space-y-2">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-sm flex-shrink-0">
                {step.icon}
              </div>
              <div>
                <p className="font-semibold text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology */}
      <div className="card-phyto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Microscope size={15} className="text-primary" />
          </div>
          <h2 className="font-display font-semibold text-base">Fundamento Científico</h2>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-1">Máscara foliar — Fundo removido antes do cálculo</p>
            <p className="leading-relaxed">
              O processamento local estima o fundo nas bordas em CIELAB, cria uma máscara ampla que preserva tecidos verdes, amarelos e marrons, seleciona o componente foliar principal e elimina componentes externos. Nenhuma classe é contada fora da máscara final.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-1">Espaço CIELAB — Detecção de Lesões</p>
            <p className="leading-relaxed">
              A classificação usa CIELAB D65: L* (luminosidade), a* (verde–vermelho) e b* (azul–amarelo), protótipos adaptativos e distância perceptual ponderada. HSV é evidência auxiliar para distinguir pigmentação, sombras e reflexos.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-1">Validação</p>
            <p className="leading-relaxed">
              Para uso no TCC, o aplicativo deve ser validado em fotografias reais anotadas, separadas dos dados de desenvolvimento. Reporte Dice/IoU por classe, sensibilidade, precisão, erro absoluto da severidade e concordância frente a avaliadores treinados ou software de referência.
            </p>
          </div>
        </div>
      </div>

      {/* Hero image */}
      <div className="rounded-2xl overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663512328442/XxLnxAvbycpbCn2WXiTMvD/hero-leaf-analysis-8yVvnseGjjkeDxZZdsVdTB.webp"
          alt="Folha com lesões foliares"
          className="w-full h-40 object-cover"
        />
        <div className="bg-secondary px-4 py-2">
          <p className="text-xs text-muted-foreground italic">
            Exemplo de folha com lesões necróticas e cloróticas — alvo de análise do PhytoPathometric
          </p>
        </div>
      </div>

      {/* Culturas */}
      <div className="card-phyto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Leaf size={15} className="text-primary" />
          </div>
          <h2 className="font-display font-semibold text-base">Culturas Suportadas</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Soja', 'Milho', 'Feijão', 'Café', 'Trigo', 'Cana-de-açúcar', 'Arroz', 'Algodão', 'Tomate', 'Batata'].map(c => (
            <span key={c} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* References */}
      <div className="card-phyto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <BookOpen size={15} className="text-primary" />
          </div>
          <h2 className="font-display font-semibold text-base">Referências</h2>
        </div>
        <div className="space-y-2">
          {REFERENCES.map((ref, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
              {ref}
            </p>
          ))}
        </div>
      </div>

      {/* Institution */}
      <div className="card-phyto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <GraduationCap size={15} className="text-primary" />
          </div>
          <h2 className="font-display font-semibold text-base">Instituição</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">IFB</strong> — Instituto Federal de Educação, Ciência e Tecnologia de Brasília<br />
          Pró-Reitoria de Pesquisa e Inovação (PRPI)<br />
          Programa PIBITI — CNPq<br />
          Área: Ciências Agrárias / Fitossanidade – Fitopatologia
        </p>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          PhytoPathometric v1.0.0 · Código Aberto · IFB/PIBITI 2026–2027
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Processamento local reproduzível com CIELAB D65, HSV, textura e conectividade espacial
        </p>
      </div>
    </div>
  );
}


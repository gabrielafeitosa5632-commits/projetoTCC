import { useState } from "react";
import { User, Building2, BadgeCheck, Mail, Phone, Plus, Trash2, MapPin, ChevronDown, ChevronUp, Pencil, Check, X, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { type Propriedade } from "@/lib/profileTypes";

const ufs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function InputField({ label, value, onChange, placeholder, icon: Icon }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
        <Icon size={10} />{label}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
    </div>
  );
}

function PropriedadeCard({ prop, onSelect, selected, onRemove, onEdit }: { prop: Propriedade; onSelect: () => void; selected: boolean; onRemove: () => void; onEdit: () => void }) {
  return (
    <div className={`p-3 rounded-xl border transition-all ${selected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : "border-border bg-secondary/20"}`}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={onSelect} className="flex-1 text-left">
          <div className="flex items-center gap-1.5">
            {selected && <Check size={12} className="text-emerald-600 flex-shrink-0" />}
            <p className="text-sm font-semibold text-foreground">{prop.nome}</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin size={9} />{prop.municipio} — {prop.uf}</p>
          {prop.talhoes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {prop.talhoes.map((t, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">{t}</span>
              ))}
            </div>
          )}
        </button>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil size={12} /></button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
}

function NovaPropriedadeForm({ onSave, onCancel, initial }: { onSave: (p: Omit<Propriedade, "id">) => void; onCancel: () => void; initial?: Propriedade }) {
  const [nome, setNome] = useState(initial?.nome || "");
  const [municipio, setMunicipio] = useState(initial?.municipio || "");
  const [uf, setUf] = useState(initial?.uf || "MT");
  const [talhaoInput, setTalhaoInput] = useState("");
  const [talhoes, setTalhoes] = useState<string[]>(initial?.talhoes || []);
  const addTalhao = () => { if (talhaoInput.trim()) { setTalhoes(prev => [...prev, talhaoInput.trim()]); setTalhaoInput(""); } };
  return (
    <div className="p-3 rounded-xl border-2 border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-3">
      <p className="text-xs font-semibold text-emerald-700">{initial ? "Editar Propriedade" : "Nova Propriedade"}</p>
      <div className="space-y-2">
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da fazenda/propriedade"
          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
        <div className="flex gap-2">
          <input value={municipio} onChange={e => setMunicipio(e.target.value)} placeholder="Municipio"
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          <select value={uf} onChange={e => setUf(e.target.value)} className="px-2 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none">
            {ufs.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input value={talhaoInput} onChange={e => setTalhaoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTalhao()} placeholder="Adicionar talhao (Enter)"
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          <button onClick={addTalhao} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700"><Plus size={14} /></button>
        </div>
        {talhoes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {talhoes.map((t, i) => (
              <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                {t}<button onClick={() => setTalhoes(prev => prev.filter((_, j) => j !== i))}><X size={8} /></button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { if (!nome.trim()) { toast.error("Informe o nome da propriedade"); return; } onSave({ nome, municipio, uf, talhoes }); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Check size={13} className="mr-1" />{initial ? "Salvar" : "Adicionar"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1"><X size={13} className="mr-1" />Cancelar</Button>
      </div>
    </div>
  );
}

export function PerfilTab() {
  const { user, logout } = useAuth();
  const { profile, updateProfile, propriedades, addPropriedade, updatePropriedade, removePropriedade, propriedadeSelecionada, setPropriedadeSelecionada } = useProfile();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [propExpanded, setPropExpanded] = useState(true);
  const profileCompleto = !!(profile.nome && profile.crea);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="card-phyto" style={{ background: "linear-gradient(135deg, oklch(0.22 0.07 155), oklch(0.32 0.09 155))" }}>
        <div className="flex items-center gap-2 mb-1">
          <User size={16} className="text-green-300" />
          <span className="text-green-300 text-xs font-semibold uppercase tracking-wider">Agronomista e Propriedades</span>
        </div>
        <p className="text-white font-display font-bold text-lg">Perfil</p>
        <p className="text-green-200 text-xs mt-0.5">Dados que aparecem nos relatorios exportados</p>
      </div>

      <div className="card-phyto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck size={21} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Conta conectada</p>
              <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await logout();
                toast.success("Sessão encerrada com segurança.");
              } catch {
                toast.error("Não foi possível encerrar a sessão. Tente novamente.");
              }
            }}
            className="flex-shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            data-testid="logout-button"
          >
            <LogOut size={13} />
            Sair
          </Button>
        </div>
        <p className="mt-3 border-t border-border/60 pt-3 text-[10px] leading-4 text-muted-foreground">
          Sua senha é protegida pelo serviço de contas e os dados deste aparelho permanecem separados por usuário.
        </p>
      </div>

      <div className="card-phyto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="font-display font-semibold text-sm">Dados do Agronomista</h3>
          </div>
          {profileCompleto && <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><BadgeCheck size={12} />Completo</span>}
        </div>
        <InputField label="Nome completo" value={profile.nome} onChange={(v: string) => updateProfile({ nome: v })} placeholder="Ex: Gabriela Feitosa" icon={User} />
        <InputField label="CREA" value={profile.crea} onChange={(v: string) => updateProfile({ crea: v })} placeholder="Ex: CREA-MT 123456/D" icon={BadgeCheck} />
        <InputField label="Empresa / Consultoria" value={profile.empresa} onChange={(v: string) => updateProfile({ empresa: v })} placeholder="Ex: AgroConsult MT" icon={Building2} />
        <InputField label="E-mail" value={profile.email} onChange={(v: string) => updateProfile({ email: v })} placeholder="email@exemplo.com" icon={Mail} />
        <InputField label="Telefone" value={profile.telefone} onChange={(v: string) => updateProfile({ telefone: v })} placeholder="(65) 99999-9999" icon={Phone} />
        <Button size="sm" onClick={() => { if (!profile.nome) { toast.error("Informe ao menos o nome"); return; } toast.success("Perfil salvo!"); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
          <Check size={13} className="mr-1.5" />Salvar Perfil
        </Button>
      </div>

      <div className="card-phyto">
        <button onClick={() => setPropExpanded(v => !v)} className="w-full flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="font-display font-semibold text-sm">Propriedades / Fazendas</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{propriedades.length}</span>
          </div>
          {propExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </button>
        {propExpanded && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Selecione a propriedade ativa para vincular as analises</p>
            {propriedades.length === 0 && !showForm && (
              <div className="text-center py-6 text-muted-foreground">
                <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Nenhuma propriedade cadastrada</p>
              </div>
            )}
            {propriedades.map(prop => editId === prop.id ? (
              <NovaPropriedadeForm key={prop.id} initial={prop}
                onSave={p => { updatePropriedade(prop.id, p); setEditId(null); toast.success("Propriedade atualizada!"); }}
                onCancel={() => setEditId(null)} />
            ) : (
              <PropriedadeCard key={prop.id} prop={prop} selected={propriedadeSelecionada === prop.id}
                onSelect={() => { const sel = propriedadeSelecionada === prop.id ? null : prop.id; setPropriedadeSelecionada(sel); toast.success(sel ? prop.nome + " selecionada" : "Selecao removida"); }}
                onRemove={() => { removePropriedade(prop.id); if (propriedadeSelecionada === prop.id) setPropriedadeSelecionada(null); toast.success("Propriedade removida"); }}
                onEdit={() => setEditId(prop.id)} />
            ))}
            {showForm && <NovaPropriedadeForm onSave={p => { addPropriedade(p); setShowForm(false); toast.success("Propriedade adicionada!"); }} onCancel={() => setShowForm(false)} />}
            {!showForm && !editId && (
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="w-full gap-1.5 border-dashed border-emerald-400 text-emerald-700 hover:bg-emerald-50">
                <Plus size={13} />Nova Propriedade
              </Button>
            )}
          </div>
        )}
      </div>

      {profileCompleto && (
        <div className="card-phyto bg-secondary/30">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Preview — Cabecalho do Relatorio</p>
          <div className="bg-background rounded-lg p-3 border border-border space-y-0.5">
            <p className="text-xs font-bold text-foreground">{profile.nome}</p>
            {profile.crea && <p className="text-[11px] text-muted-foreground">{profile.crea}</p>}
            {profile.empresa && <p className="text-[11px] text-muted-foreground">{profile.empresa}</p>}
            {profile.email && <p className="text-[11px] text-muted-foreground">{profile.email}</p>}
            {propriedadeSelecionada && (() => { const p = propriedades.find(x => x.id === propriedadeSelecionada); return p ? <p className="text-[11px] text-emerald-600 font-medium mt-1">Propriedade: {p.nome} — {p.municipio}/{p.uf}</p> : null; })()}
          </div>
        </div>
      )}
    </div>
  );
}

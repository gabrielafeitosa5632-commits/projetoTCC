# 🛠️ Guia de Integração — Melhorias PhytoPathometric

## O que foi criado

| Arquivo | Destino no projeto | Função |
|---|---|---|
| `diseasesByRegion.ts` | `client/src/data/` | Base de dados de doenças por estado |
| `AppContext.tsx` | `client/src/context/` | Estado global de localidade |
| `useAppSettings.ts` | `client/src/hooks/` | Hook de configurações (tema + localidade) |
| `SettingsPanel.tsx` | `client/src/components/` | UI de configurações |
| `RegionalDiseases.tsx` | `client/src/components/` | Listagem de doenças regionais |

---

## PASSO 1 — Copiar os arquivos

```bash
# Na raiz do projeto:
cp diseasesByRegion.ts   client/src/data/diseasesByRegion.ts
cp AppContext.tsx         client/src/context/AppContext.tsx
cp useAppSettings.ts     client/src/hooks/useAppSettings.ts
cp SettingsPanel.tsx     client/src/components/SettingsPanel.tsx
cp RegionalDiseases.tsx  client/src/components/RegionalDiseases.tsx
```

---

## PASSO 2 — Configurar o ThemeProvider (next-themes já está instalado)

No arquivo `client/src/main.tsx`, envolva o app com os providers:

```tsx
import { ThemeProvider } from "next-themes";
import { AppProvider } from "./context/AppContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <AppProvider>
      <App />
    </AppProvider>
  </ThemeProvider>
);
```

---

## PASSO 3 — Garantir suporte a dark mode no Tailwind

No arquivo `client/src/index.css`, confirme que existe:

```css
/* Tailwind v4 — já deve estar configurado, mas verifique: */
@import "tailwindcss";
```

No `vite.config.ts` (já existe), o tailwindcss plugin cuida do dark mode via classe `.dark` no `<html>`.

Se necessário, adicione ao `tailwind.config` (se usar v3):
```js
darkMode: "class",
```

---

## PASSO 4 — Adicionar a tela de Configurações

Se o app usa navegação por abas (bottom tabs), adicione uma aba "Configurações":

```tsx
// Onde ficam suas abas (ex: App.tsx ou router)
import { SettingsPanel } from "./components/SettingsPanel";
import { useAppContext } from "./context/AppContext";

function SettingsScreen() {
  const { selectedStateCode, setSelectedStateCode } = useAppContext();
  return (
    <div className="min-h-screen bg-background">
      <h1 className="px-4 pt-6 pb-2 text-xl font-bold text-foreground">Configurações</h1>
      <SettingsPanel
        selectedStateCode={selectedStateCode}
        onLocationChange={setSelectedStateCode}
      />
    </div>
  );
}
```

---

## PASSO 5 — Adicionar a seção de Doenças Regionais

Em qualquer tela (Home, Análise, ou uma aba dedicada):

```tsx
import { RegionalDiseases } from "./components/RegionalDiseases";
import { useAppContext } from "./context/AppContext";

function HomeScreen() {
  const { selectedStateCode } = useAppContext();
  return (
    <div>
      {/* ... conteúdo existente ... */}
      
      <section>
        <h2 className="px-4 py-3 text-base font-semibold text-foreground">
          🌿 Doenças na sua região
        </h2>
        <RegionalDiseases stateCode={selectedStateCode} />
      </section>
    </div>
  );
}
```

---

## PASSO 6 — Badge de localidade no header (opcional)

Para mostrar o estado selecionado no topo do app:

```tsx
import { useAppContext } from "./context/AppContext";
import { MapPin } from "lucide-react";

function Header() {
  const { selectedStateCode } = useAppContext();
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <h1 className="text-lg font-bold text-foreground">PhytoPathometric</h1>
      {selectedStateCode && (
        <div className="flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1">
          <MapPin className="h-3 w-3 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {selectedStateCode}
          </span>
        </div>
      )}
    </header>
  );
}
```

---

## Resultado final

✅ **Tema escuro/claro** — toggle com ícone sol/lua, persiste entre sessões  
✅ **Filtro de localidade** — dropdown por região brasileira, persiste no localStorage  
✅ **Doenças por região** — cards com patógeno, severidade, cultura e época de pico  
✅ **Compatível com Capacitor** — funciona no Android (localStorage disponível via WebView)  

---

## Estados com dados disponíveis

| Região | Estados |
|---|---|
| Norte | AM, PA, TO |
| Nordeste | BA, PE, CE |
| Centro-Oeste | MT, GO, MS |
| Sudeste | SP, MG, RJ, ES |
| Sul | RS, SC, PR |

> Para adicionar mais estados, edite `diseasesByRegion.ts` seguindo o padrão existente.

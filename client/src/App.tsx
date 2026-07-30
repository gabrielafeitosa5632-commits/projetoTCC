import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { AuthScreen } from "./components/AuthScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedContent() {
  const { isPasswordRecovery, loading, user } = useAuth();
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#010b06]">
        <div className="text-center text-emerald-100">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-800 border-t-emerald-400" />
          <p className="text-sm text-emerald-200/60">Verificando sua conta...</p>
        </div>
      </main>
    );
  }
  if (isPasswordRecovery) return <AuthScreen />;
  return user ? <Router /> : <AuthScreen />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <AuthProvider>
          <Toaster position="top-center" richColors />
          <AuthenticatedContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

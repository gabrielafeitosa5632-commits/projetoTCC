import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AuthError } from "@/lib/localAuth";

type AuthMode = "login" | "register" | "reset";

const fieldClass =
  "h-14 w-full rounded-2xl border border-emerald-950/10 bg-[#f3f7ff] pl-12 pr-12 text-[15px] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15";

export function AuthScreen() {
  const {
    authLinkError,
    isCloudAuth,
    isPasswordRecovery,
    login,
    register,
    requestPasswordReset,
    updatePassword,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPasswordRecovery) {
      setMode("reset");
      setPassword("");
      setConfirmPassword("");
      setError("");
    }
  }, [isPasswordRecovery]);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (mode !== "login" && password !== confirmPassword) {
      setError("As senhas informadas não são iguais.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "reset") {
        await updatePassword(password);
        toast.success("Sua nova senha foi salva.");
      } else if (mode === "register") {
        const result = await register(name, email, password);
        if (result.requiresEmailConfirmation) {
          toast.success("Conta criada! Confirme o link enviado ao seu e-mail.");
          changeMode("login");
        } else {
          toast.success(
            `Conta criada. Bem-vindo, ${result.user.name.split(" ")[0]}!`,
          );
        }
      } else {
        const user = await login(email, password);
        toast.success(`Bem-vindo de volta, ${user.name.split(" ")[0]}!`);
      }
    } catch (authError) {
      setError(
        authError instanceof AuthError
          ? authError.message
          : "Não foi possível acessar a conta. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    setError("");
    setBusy(true);
    try {
      await requestPasswordReset(email);
      toast.success(
        "Enviamos o link de recuperação. Verifique seu e-mail e a caixa de spam.",
      );
    } catch (authError) {
      setError(
        authError instanceof AuthError
          ? authError.message
          : "Não foi possível enviar o link de recuperação.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#010b06] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 66% 38%, rgba(13,112,57,.20), transparent 28%), radial-gradient(circle at 18% 82%, rgba(33,153,84,.09), transparent 34%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />

      <div className="relative mx-auto flex min-h-screen w-full items-center justify-center px-5 py-8">
        <section className="w-full max-w-[480px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8 text-center">
                <div className="mx-auto mb-6 h-28 w-28 overflow-hidden rounded-[32px] border border-white/15 bg-emerald-900 shadow-2xl shadow-emerald-950/70 ring-1 ring-emerald-400/10 sm:h-32 sm:w-32">
                  <img
                    src="/phyto-login-logo.png"
                    alt="Logo PhytoPathometric"
                    className="h-full w-full object-cover"
                  />
                </div>
                <h2 className="font-display text-3xl font-bold">
                  {mode === "login"
                    ? "Bem-vindo de volta"
                    : mode === "register"
                      ? "Crie sua conta"
                      : "Crie uma nova senha"}
                </h2>
                <p className="mt-2 text-sm text-emerald-200/50">
                  {mode === "login"
                    ? "Entre na sua conta"
                    : mode === "register"
                      ? "Cadastre seus dados de acesso"
                      : "Escolha a nova senha da sua conta"}
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="rounded-[30px] border border-emerald-700/30 bg-[#03170d]/88 p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8"
                data-testid="auth-form"
              >
                {mode === "register" && (
                  <label className="mb-5 block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-emerald-300/60">
                      Nome completo
                    </span>
                    <span className="relative block">
                      <User className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-emerald-800/65" />
                      <input
                        value={name}
                        onChange={event => setName(event.target.value)}
                        className={fieldClass}
                        type="text"
                        autoComplete="name"
                        placeholder="Seu nome"
                        required
                        minLength={2}
                        data-testid="auth-name"
                      />
                    </span>
                  </label>
                )}

                {mode !== "reset" && (
                  <label className="mb-5 block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-emerald-300/60">
                      E-mail
                    </span>
                    <span className="relative block">
                      <Mail className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-emerald-800/65" />
                      <input
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        className={fieldClass}
                        type="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoComplete="email"
                        placeholder="nome@exemplo.com"
                        required
                        data-testid="auth-email"
                      />
                    </span>
                  </label>
                )}

                <label className="mb-5 block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-emerald-300/60">
                    {mode === "reset" ? "Nova senha" : "Senha"}
                  </span>
                  <span className="relative block">
                    <LockKeyhole className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-emerald-800/65" />
                    <input
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      className={fieldClass}
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder={mode === "reset" ? "Digite a nova senha" : "Digite sua senha"}
                      required
                      minLength={mode === "login" ? undefined : 8}
                      data-testid="auth-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(current => !current)}
                      className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-emerald-800/65 transition hover:bg-emerald-100"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </span>
                  {mode !== "login" && (
                    <span className="mt-2 block text-[11px] leading-4 text-emerald-200/45">
                      Use no mínimo 8 caracteres, incluindo uma letra e um número.
                    </span>
                  )}
                </label>

                {mode === "login" && isCloudAuth && (
                  <button
                    type="button"
                    onClick={handlePasswordResetRequest}
                    disabled={busy}
                    className="-mt-2 mb-5 block w-full text-right text-xs font-semibold text-emerald-400 transition hover:text-emerald-300 disabled:opacity-50"
                  >
                    Esqueci minha senha
                  </button>
                )}

                {mode !== "login" && (
                  <label className="mb-5 block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-emerald-300/60">
                      Confirmar {mode === "reset" ? "nova senha" : "senha"}
                    </span>
                    <span className="relative block">
                      <LockKeyhole className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-emerald-800/65" />
                      <input
                        value={confirmPassword}
                        onChange={event => setConfirmPassword(event.target.value)}
                        className={fieldClass}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Repita sua senha"
                        required
                        data-testid="auth-confirm-password"
                      />
                    </span>
                  </label>
                )}

                <div aria-live="polite" className="min-h-6">
                  {(error || authLinkError) && (
                    <p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-200" role="alert">
                      {error || authLinkError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 text-base font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/25 disabled:cursor-wait disabled:opacity-70"
                  data-testid="auth-submit"
                >
                  {busy && <LoaderCircle className="h-5 w-5 animate-spin" />}
                  {busy
                    ? "Aguarde..."
                    : mode === "login"
                      ? "Entrar"
                      : mode === "register"
                        ? "Criar conta"
                        : "Salvar nova senha"}
                </button>

                {mode !== "reset" && (
                  <>
                    <div className="my-6 flex items-center gap-4 text-xs text-emerald-200/35">
                      <span className="h-px flex-1 bg-emerald-700/20" />
                      <span>ou</span>
                      <span className="h-px flex-1 bg-emerald-700/20" />
                    </div>

                    <p className="text-center text-sm text-emerald-200/45">
                      {mode === "login" ? "Não tem conta?" : "Já possui uma conta?"}{" "}
                      <button
                        type="button"
                        onClick={() => changeMode(mode === "login" ? "register" : "login")}
                        className="font-bold text-emerald-400 transition hover:text-emerald-300"
                        data-testid="auth-toggle-mode"
                      >
                        {mode === "login" ? "Criar conta grátis" : "Entrar"}
                      </button>
                    </p>
                  </>
                )}
              </form>

              {mode === "register" && (
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className="mx-auto mt-6 flex items-center gap-2 text-sm text-emerald-200/45 transition hover:text-emerald-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao login
                </button>
              )}

              <p className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] text-emerald-200/35">
                <ShieldCheck className="h-4 w-4" />
                {isCloudAuth
                  ? "Conta online protegida; suas análises permanecem neste aparelho."
                  : "Modo local ativo; a conta online ainda não foi configurada."}
              </p>
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

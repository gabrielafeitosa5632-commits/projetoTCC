import {
  activateAccountScope,
  authenticateLocalAccount,
  AuthError,
  clearAuthSession,
  registerLocalAccount,
  restoreAuthSession,
  type AuthUser,
} from "@/lib/localAuth";
import {
  authRedirectUrl,
  isSupabaseConfigured,
  listenForNativeAuthLinks,
  mapSupabaseAuthError,
  supabase,
  toAuthUser,
} from "@/lib/supabase";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface RegistrationResult {
  user: AuthUser;
  requiresEmailConfirmation: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isCloudAuth: boolean;
  isPasswordRecovery: boolean;
  authLinkError: string;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<RegistrationResult>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function validateCloudRegistration(name: string, email: string, password: string) {
  if (name.trim().length < 2) {
    throw new AuthError("Informe seu nome completo.", "invalid-data");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())) {
    throw new AuthError("Informe um endereço de e-mail válido.", "invalid-data");
  }
  if (password.length < 8 || !/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    throw new AuthError(
      "A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número.",
      "invalid-data",
    );
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    isSupabaseConfigured ? null : restoreAuthSession(),
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isPasswordRecovery, setPasswordRecovery] = useState(false);
  const [authLinkError, setAuthLinkError] = useState("");

  useEffect(() => {
    if (!supabase) return;

    let disposed = false;
    let removeNativeListener: (() => Promise<void>) | undefined;

    const applyUser = (nextUser: AuthUser | null) => {
      if (disposed) return;
      setUser(nextUser);
      activateAccountScope(nextUser?.id || null);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      applyUser(session?.user ? toAuthUser(session.user) : null);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthLinkError(mapSupabaseAuthError(error).message);
        applyUser(null);
        return;
      }
      applyUser(data.session?.user ? toAuthUser(data.session.user) : null);
    });

    void listenForNativeAuthLinks(
      () => setPasswordRecovery(true),
      error => setAuthLinkError(error.message),
    ).then(remove => {
      if (disposed) {
        void remove();
      } else {
        removeNativeListener = remove;
      }
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
      if (removeNativeListener) void removeNativeListener();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      const authenticatedUser = await authenticateLocalAccount(email, password);
      setUser(authenticatedUser);
      return authenticatedUser;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) throw mapSupabaseAuthError(error);

    const authenticatedUser = toAuthUser(data.user);
    activateAccountScope(authenticatedUser.id);
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<RegistrationResult> => {
      if (!supabase) {
        const registeredUser = await registerLocalAccount(name, email, password);
        setUser(registeredUser);
        return { user: registeredUser, requiresEmailConfirmation: false };
      }

      validateCloudRegistration(name, email, password);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim().replace(/\s+/g, " ") },
          emailRedirectTo: authRedirectUrl("callback"),
        },
      });
      if (error || !data.user) throw mapSupabaseAuthError(error);
      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new AuthError(
          "Já existe uma conta cadastrada com este e-mail.",
          "email-in-use",
        );
      }

      const registeredUser = toAuthUser(data.user);
      if (data.session) {
        activateAccountScope(registeredUser.id);
        setUser(registeredUser);
      }
      return {
        user: registeredUser,
        requiresEmailConfirmation: !data.session,
      };
    },
    [],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) {
      throw new AuthError(
        "A recuperação por e-mail estará disponível quando a conta online for ativada.",
        "storage-unavailable",
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim())) {
      throw new AuthError("Informe seu e-mail antes de recuperar a senha.", "invalid-data");
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: authRedirectUrl("reset") },
    );
    if (error) throw mapSupabaseAuthError(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) {
      throw new AuthError("A recuperação online não está configurada.", "storage-unavailable");
    }
    if (password.length < 8 || !/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
      throw new AuthError(
        "A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número.",
        "invalid-data",
      );
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw mapSupabaseAuthError(error);
    setPasswordRecovery(false);
  }, []);

  const logout = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw mapSupabaseAuthError(error);
    }
    clearAuthSession();
    setPasswordRecovery(false);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isCloudAuth: isSupabaseConfigured,
      isPasswordRecovery,
      authLinkError,
      login,
      register,
      requestPasswordReset,
      updatePassword,
      logout,
    }),
    [
      user,
      loading,
      isPasswordRecovery,
      authLinkError,
      login,
      register,
      requestPasswordReset,
      updatePassword,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

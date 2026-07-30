import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { AuthError, type AuthUser } from "@/lib/localAuth";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !Capacitor.isNativePlatform(),
        flowType: "pkce",
      },
    })
  : null;

export function toAuthUser(user: SupabaseUser): AuthUser {
  const email = user.email || "";
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";

  return {
    id: user.id,
    name: metadataName || email.split("@")[0] || "Usuário",
    email,
    createdAt: user.created_at,
  };
}

export function authRedirectUrl(kind: "callback" | "reset"): string {
  const configuredRedirect = (import.meta.env.VITE_AUTH_REDIRECT_URL || "").trim();
  if (configuredRedirect) {
    return `${configuredRedirect.replace(/\/+$/, "")}/${kind}`;
  }
  if (Capacitor.isNativePlatform()) {
    return `com.phytopathometric.app://auth/${kind}`;
  }
  return `${window.location.origin}/auth/${kind}`;
}

export function mapSupabaseAuthError(error: unknown): AuthError {
  const rawMessage =
    error && typeof error === "object" && "message" in error
      ? String(error.message).toLowerCase()
      : "";

  if (rawMessage.includes("invalid login credentials")) {
    return new AuthError("E-mail ou senha incorretos.", "invalid-credentials");
  }
  if (rawMessage.includes("email not confirmed")) {
    return new AuthError(
      "Confirme seu e-mail antes de entrar. Verifique também a caixa de spam.",
      "invalid-credentials",
    );
  }
  if (
    rawMessage.includes("already registered") ||
    rawMessage.includes("already been registered")
  ) {
    return new AuthError(
      "Já existe uma conta cadastrada com este e-mail.",
      "email-in-use",
    );
  }
  if (rawMessage.includes("password")) {
    return new AuthError(
      "A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número.",
      "invalid-data",
    );
  }
  if (
    rawMessage.includes("fetch") ||
    rawMessage.includes("network") ||
    rawMessage.includes("offline")
  ) {
    return new AuthError(
      "Não foi possível conectar ao serviço de contas. Verifique sua internet.",
      "storage-unavailable",
    );
  }

  return new AuthError(
    "Não foi possível acessar a conta agora. Tente novamente.",
    "storage-unavailable",
  );
}

function callbackParameters(url: string): URLSearchParams {
  const parsedUrl = new URL(url);
  const parameters = new URLSearchParams(parsedUrl.search);
  const hashParameters = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
  hashParameters.forEach((value, key) => parameters.set(key, value));
  return parameters;
}

async function consumeAuthUrl(
  url: string,
  onPasswordRecovery: () => void,
): Promise<void> {
  if (!supabase || !url.startsWith("com.phytopathometric.app://auth/")) return;

  const isRecovery = url.includes("/auth/reset");
  if (isRecovery) onPasswordRecovery();

  const parameters = callbackParameters(url);
  const authorizationCode = parameters.get("code");
  if (authorizationCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authorizationCode);
    if (error) throw mapSupabaseAuthError(error);
    return;
  }

  const accessToken = parameters.get("access_token");
  const refreshToken = parameters.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw mapSupabaseAuthError(error);
  }
}

export async function listenForNativeAuthLinks(
  onPasswordRecovery: () => void,
  onError: (error: AuthError) => void,
): Promise<() => Promise<void>> {
  if (!supabase || !Capacitor.isNativePlatform()) return async () => undefined;

  const handleUrl = async ({ url }: URLOpenListenerEvent) => {
    try {
      await consumeAuthUrl(url, onPasswordRecovery);
    } catch (error) {
      onError(
        error instanceof AuthError ? error : mapSupabaseAuthError(error),
      );
    }
  };

  const launchUrl = await App.getLaunchUrl();
  if (launchUrl?.url) await handleUrl({ url: launchUrl.url });

  const listener = await App.addListener("appUrlOpen", handleUrl);
  return async () => listener.remove();
}

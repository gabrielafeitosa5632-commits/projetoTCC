export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface StoredAccount extends AuthUser {
  passwordHash: string;
  salt: string;
  iterations: number;
}

interface StoredSession {
  accountId: string;
  authenticatedAt: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code:
      | "invalid-data"
      | "email-in-use"
      | "invalid-credentials"
      | "storage-unavailable"
      | "crypto-unavailable",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const ACCOUNTS_KEY = "phyto_auth_accounts_v1";
const SESSION_KEY = "phyto_auth_session_v1";
const ACTIVE_ACCOUNT_KEY = "phyto_active_account_v1";
const LEGACY_OWNER_KEY = "phyto_legacy_owner_v1";
const PBKDF2_ITERATIONS = 210_000;
const MAX_LOCAL_ACCOUNTS = 8;
const LEGACY_DATA_KEYS = [
  "phyto_profile",
  "phyto_props",
  "phyto_prop_sel",
  "phytopathometric_history",
] as const;

function storage(): Storage {
  try {
    const candidate = globalThis.localStorage;
    const probe = "__phyto_auth_probe__";
    candidate.setItem(probe, "1");
    candidate.removeItem(probe);
    return candidate;
  } catch {
    throw new AuthError(
      "O armazenamento do aparelho está indisponível. Libere espaço e tente novamente.",
      "storage-unavailable",
    );
  }
}

function cryptoApi(): Crypto {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new AuthError(
      "Este aparelho não oferece o recurso de segurança necessário para proteger a senha.",
      "crypto-unavailable",
    );
  }
  return globalThis.crypto;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase("pt-BR");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function validateRegistration(name: string, email: string, password: string) {
  if (name.trim().length < 2) {
    throw new AuthError("Informe seu nome completo.", "invalid-data");
  }
  if (!isValidEmail(email)) {
    throw new AuthError("Informe um endereço de e-mail válido.", "invalid-data");
  }
  if (password.length < 8 || !/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    throw new AuthError(
      "A senha deve ter pelo menos 8 caracteres, incluindo uma letra e um número.",
      "invalid-data",
    );
  }
}

function loadAccounts(): StoredAccount[] {
  try {
    const parsed = JSON.parse(storage().getItem(ACCOUNTS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (account): account is StoredAccount =>
        Boolean(
          account &&
          typeof account.id === "string" &&
          typeof account.name === "string" &&
          typeof account.email === "string" &&
          typeof account.passwordHash === "string" &&
          typeof account.salt === "string" &&
          typeof account.iterations === "number",
        ),
    );
  } catch (error) {
    if (error instanceof AuthError) throw error;
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]) {
  storage().setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const crypto = cryptoApi();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function hashesMatch(expected: Uint8Array, received: Uint8Array): boolean {
  if (expected.length !== received.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++) {
    difference |= expected[index] ^ received[index];
  }
  return difference === 0;
}

function publicUser(account: StoredAccount): AuthUser {
  const { id, name, email, createdAt } = account;
  return { id, name, email, createdAt };
}

function createAccountId(): string {
  const random = new Uint8Array(12);
  cryptoApi().getRandomValues(random);
  return Array.from(random, byte => byte.toString(16).padStart(2, "0")).join("");
}

function persistSession(accountId: string) {
  const session: StoredSession = {
    accountId,
    authenticatedAt: new Date().toISOString(),
  };
  storage().setItem(SESSION_KEY, JSON.stringify(session));
  activateAccountScope(accountId);
}

function claimLegacyData(accountId: string) {
  const localStorage = storage();
  const owner = localStorage.getItem(LEGACY_OWNER_KEY);
  if (owner && owner !== accountId) return;
  if (!owner) localStorage.setItem(LEGACY_OWNER_KEY, accountId);

  for (const baseKey of LEGACY_DATA_KEYS) {
    const oldValue = localStorage.getItem(baseKey);
    const scopedKey = accountStorageKey(baseKey, accountId);
    if (oldValue !== null && localStorage.getItem(scopedKey) === null) {
      localStorage.setItem(scopedKey, oldValue);
    }
  }
}

export function accountStorageKey(baseKey: string, accountId: string): string {
  return `${baseKey}:${accountId}`;
}

export function readAccountStorageItem(baseKey: string, accountId: string): string | null {
  const localStorage = storage();
  const scopedValue = localStorage.getItem(accountStorageKey(baseKey, accountId));
  if (scopedValue !== null) return scopedValue;
  return legacyDataBelongsToAccount(accountId) ? localStorage.getItem(baseKey) : null;
}

export function legacyDataBelongsToAccount(accountId: string): boolean {
  return storage().getItem(LEGACY_OWNER_KEY) === accountId;
}

export function getActiveAccountId(): string | null {
  try {
    const scopedAccountId = storage().getItem(ACTIVE_ACCOUNT_KEY);
    if (scopedAccountId) return scopedAccountId;
    const parsed = JSON.parse(storage().getItem(SESSION_KEY) || "null") as StoredSession | null;
    return parsed?.accountId || null;
  } catch {
    return null;
  }
}

export function restoreAuthSession(): AuthUser | null {
  let accountId: string | null = null;
  try {
    const parsed = JSON.parse(storage().getItem(SESSION_KEY) || "null") as StoredSession | null;
    accountId = parsed?.accountId || null;
  } catch {
    accountId = null;
  }
  if (!accountId) return null;
  const account = loadAccounts().find(candidate => candidate.id === accountId);
  if (!account) {
    clearAuthSession();
    return null;
  }
  claimLegacyData(account.id);
  return publicUser(account);
}

export function activateAccountScope(accountId: string | null) {
  try {
    const localStorage = storage();
    if (!accountId) {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      return;
    }
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
    claimLegacyData(accountId);
  } catch {
    // O estado React continua válido mesmo se o armazenamento falhar.
  }
}

export async function registerLocalAccount(
  name: string,
  emailInput: string,
  password: string,
): Promise<AuthUser> {
  const email = normalizeEmail(emailInput);
  validateRegistration(name, email, password);

  const accounts = loadAccounts();
  if (accounts.some(account => account.email === email)) {
    throw new AuthError("Já existe uma conta cadastrada com este e-mail.", "email-in-use");
  }
  if (accounts.length >= MAX_LOCAL_ACCOUNTS) {
    throw new AuthError(
      "O limite de contas locais deste aparelho foi atingido.",
      "invalid-data",
    );
  }

  const salt = new Uint8Array(16);
  cryptoApi().getRandomValues(salt);
  const passwordHash = await derivePasswordHash(password, salt, PBKDF2_ITERATIONS);
  const account: StoredAccount = {
    id: createAccountId(),
    name: name.trim().replace(/\s+/g, " "),
    email,
    passwordHash: bytesToBase64(passwordHash),
    salt: bytesToBase64(salt),
    iterations: PBKDF2_ITERATIONS,
    createdAt: new Date().toISOString(),
  };

  saveAccounts([...accounts, account]);
  persistSession(account.id);
  claimLegacyData(account.id);
  return publicUser(account);
}

export async function authenticateLocalAccount(
  emailInput: string,
  password: string,
): Promise<AuthUser> {
  const email = normalizeEmail(emailInput);
  const account = loadAccounts().find(candidate => candidate.email === email);
  if (!account || !password) {
    throw new AuthError("E-mail ou senha incorretos.", "invalid-credentials");
  }

  const receivedHash = await derivePasswordHash(
    password,
    base64ToBytes(account.salt),
    account.iterations,
  );
  if (!hashesMatch(base64ToBytes(account.passwordHash), receivedHash)) {
    throw new AuthError("E-mail ou senha incorretos.", "invalid-credentials");
  }

  persistSession(account.id);
  claimLegacyData(account.id);
  return publicUser(account);
}

export function clearAuthSession() {
  try {
    storage().removeItem(SESSION_KEY);
    storage().removeItem(ACTIVE_ACCOUNT_KEY);
  } catch {
    // The in-memory session is still cleared by AuthContext.
  }
}

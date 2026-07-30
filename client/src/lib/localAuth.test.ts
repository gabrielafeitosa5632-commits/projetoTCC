import { beforeEach, describe, expect, it } from "vitest";
import {
  AuthError,
  authenticateLocalAccount,
  activateAccountScope,
  clearAuthSession,
  getActiveAccountId,
  registerLocalAccount,
  restoreAuthSession,
} from "./localAuth";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

describe("local authentication", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: new MemoryStorage(),
      configurable: true,
    });
  });

  it("registers, persists the session and authenticates the password", async () => {
    const registered = await registerLocalAccount(
      "Gabriela Feitosa",
      "Gabriela@Example.com",
      "Folha2026",
    );

    expect(registered.email).toBe("gabriela@example.com");
    expect(restoreAuthSession()?.id).toBe(registered.id);
    expect(localStorage.getItem("phyto_auth_accounts_v1")).not.toContain("Folha2026");

    clearAuthSession();
    expect(restoreAuthSession()).toBeNull();
    const authenticated = await authenticateLocalAccount(
      "gabriela@example.com",
      "Folha2026",
    );
    expect(authenticated.id).toBe(registered.id);
  });

  it("rejects an incorrect password and a duplicate e-mail", async () => {
    await registerLocalAccount("Gabriela Feitosa", "gabriela@example.com", "Folha2026");

    await expect(
      authenticateLocalAccount("gabriela@example.com", "SenhaErrada9"),
    ).rejects.toMatchObject<AuthError>({ code: "invalid-credentials" });

    await expect(
      registerLocalAccount("Outra Pessoa", "GABRIELA@example.com", "Outra2026"),
    ).rejects.toMatchObject<AuthError>({ code: "email-in-use" });
  });

  it("supports an external account scope without storing a password", () => {
    activateAccountScope("supabase-user-id");

    expect(getActiveAccountId()).toBe("supabase-user-id");
    expect(localStorage.getItem("phyto_active_account_v1")).toBe("supabase-user-id");

    clearAuthSession();
    expect(getActiveAccountId()).toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";

import type { AuthAdapter, User } from "./adapter";
import {
  INITIAL_AUTH_STATE,
  NO_GOOGLE_MESSAGE,
  authStateFromSession,
  canSignInWithGoogle,
  createAuthActions,
} from "./auth-state";

const user = { id: "user-1", email: "daisy@example.com" } as User;
const session = { user } as Session;

/**
 * Hand-written fakes rather than a mocking library, matching the convention in
 * apps/web/src/api/health/HealthService.test.ts. What is under test is our own
 * guard logic, not Supabase.
 */
function fakeAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    client: {
      auth: { signOut: async () => ({ error: null }) },
    } as unknown as AuthAdapter["client"],
    signInWithEmail: async () => ({ kind: "code-sent" }),
    verifyEmailCode: async () => {},
    ...overrides,
  };
}

describe("authStateFromSession", () => {
  it("starts not ready with no user", () => {
    expect(INITIAL_AUTH_STATE).toEqual({ user: null, ready: false });
  });

  it("extracts the user from a session", () => {
    expect(authStateFromSession(session)).toEqual({ user, ready: true });
  });

  it("treats an absent session as a settled answer, not a pending one", () => {
    expect(authStateFromSession(null)).toEqual({ user: null, ready: true });
    expect(authStateFromSession(undefined)).toEqual({ user: null, ready: true });
  });
});

describe("canSignInWithGoogle", () => {
  it("is true only when the adapter supplies the method", () => {
    expect(canSignInWithGoogle(fakeAdapter({ signInWithGoogle: async () => {} }))).toBe(true);
    expect(canSignInWithGoogle(fakeAdapter())).toBe(false);
    expect(canSignInWithGoogle(fakeAdapter({ signInWithGoogle: undefined }))).toBe(false);
  });
});

describe("createAuthActions", () => {
  it("delegates Google sign-in when the capability is present", async () => {
    const signInWithGoogle = vi.fn(async () => {});
    await createAuthActions(fakeAdapter({ signInWithGoogle })).signInWithGoogle();
    expect(signInWithGoogle).toHaveBeenCalledOnce();
  });

  it("throws a descriptive error when Google is unavailable", async () => {
    await expect(createAuthActions(fakeAdapter()).signInWithGoogle()).rejects.toThrow(
      NO_GOOGLE_MESSAGE,
    );
  });

  it("passes the email through and returns the outcome", async () => {
    const signInWithEmail = vi.fn(async () => ({ kind: "code-sent" }) as const);
    const actions = createAuthActions(fakeAdapter({ signInWithEmail }));

    await expect(actions.signInWithEmail("daisy@example.com")).resolves.toEqual({
      kind: "code-sent",
    });
    expect(signInWithEmail).toHaveBeenCalledWith("daisy@example.com");
  });

  it("passes both arguments to code verification", async () => {
    const verifyEmailCode = vi.fn(async () => {});
    await createAuthActions(fakeAdapter({ verifyEmailCode })).verifyEmailCode(
      "daisy@example.com",
      "123456",
    );
    expect(verifyEmailCode).toHaveBeenCalledWith("daisy@example.com", "123456");
  });

  it("surfaces a sign-out failure instead of swallowing it", async () => {
    const adapter = fakeAdapter({
      client: {
        auth: { signOut: async () => ({ error: { message: "network down" } }) },
      } as unknown as AuthAdapter["client"],
    });

    await expect(createAuthActions(adapter).signOut()).rejects.toThrow("network down");
  });

  it("resolves sign-out when Supabase reports no error", async () => {
    await expect(createAuthActions(fakeAdapter()).signOut()).resolves.toBeUndefined();
  });

  it("propagates an email send failure to the caller", async () => {
    const adapter = fakeAdapter({
      signInWithEmail: async () => {
        throw new Error("rate limited");
      },
    });

    await expect(createAuthActions(adapter).signInWithEmail("daisy@example.com")).rejects.toThrow(
      "rate limited",
    );
  });
});

import type { Session } from "@supabase/supabase-js";

import type { AuthActions, AuthAdapter, User } from "./adapter";

export interface AuthState {
  user: User | null;
  ready: boolean;
}

export const INITIAL_AUTH_STATE: AuthState = { user: null, ready: false };

// A null session is an answer, not a pending one, so ready is always true.
export function authStateFromSession(session: Session | null | undefined): AuthState {
  return { user: session?.user ?? null, ready: true };
}

export function canSignInWithGoogle(adapter: AuthAdapter): boolean {
  return typeof adapter.signInWithGoogle === "function";
}

export const NO_GOOGLE_MESSAGE =
  "This build does not offer Google sign-in. Check canSignInWithGoogle before calling this.";

export function createAuthActions(adapter: AuthAdapter): AuthActions {
  return {
    signInWithGoogle: async () => {
      if (!adapter.signInWithGoogle) throw new Error(NO_GOOGLE_MESSAGE);
      await adapter.signInWithGoogle();
    },
    signInWithEmail: (email) => adapter.signInWithEmail(email),
    verifyEmailCode: (email, code) => adapter.verifyEmailCode(email, code),
    signOut: async () => {
      const { error } = await adapter.client.auth.signOut();
      if (error) throw new Error(error.message);
    },
  };
}

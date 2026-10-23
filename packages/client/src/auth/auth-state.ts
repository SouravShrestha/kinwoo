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

export const GOOGLE_EMAIL_MESSAGE =
  "This email is linked to a Google account. Use Google to log in.";
export const EMAIL_TAKEN_MESSAGE =
  "This email is already tied to another account. Use a different email.";

export function createAuthActions(adapter: AuthAdapter): AuthActions {
  return {
    signInWithGoogle: async () => {
      if (!adapter.signInWithGoogle) throw new Error(NO_GOOGLE_MESSAGE);
      await adapter.signInWithGoogle();
    },
    linkGoogle: async () => {
      if (!adapter.linkGoogle) throw new Error(NO_GOOGLE_MESSAGE);
      await adapter.linkGoogle();
    },
    unlinkGoogle: async () => {
      const { auth } = adapter.client;
      const { data, error } = await auth.getUserIdentities();
      if (error) throw new Error(error.message);
      const identity = data.identities.find((item) => item.provider === "google");
      if (!identity) return;
      const result = await auth.unlinkIdentity(identity);
      if (result.error) throw new Error(result.error.message);
      // unlinkIdentity emits no auth event, so refresh to push the new identities into state.
      await auth.refreshSession();
    },
    signInWithEmail: async (email) => {
      try {
        return await adapter.signInWithEmail(email);
      } catch (cause) {
        // Supabase finds no user with this login email, tries to create one, and collides with
        // a Google identity linked to another account whose own login email differs.
        if (cause instanceof Error && /already registered/i.test(cause.message)) {
          throw new Error(adapter.signInWithGoogle ? GOOGLE_EMAIL_MESSAGE : EMAIL_TAKEN_MESSAGE);
        }
        throw cause;
      }
    },
    verifyEmailCode: (email, code) => adapter.verifyEmailCode(email, code),
    signOut: async () => {
      const { error } = await adapter.client.auth.signOut();
      if (error) throw new Error(error.message);
    },
  };
}

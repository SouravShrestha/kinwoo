import type { SupabaseClient, User } from "@supabase/supabase-js";

export type { User };

/**
 * What sending an email produced. Only one variant today, but the shape leaves
 * room for magic links without changing every call site.
 */
export type EmailSignInOutcome = { kind: "code-sent" };

/**
 * The platform seam. Each app supplies one of these; nothing below this layer
 * knows whether it is running in a browser or on Hermes.
 *
 * `signInWithGoogle` is optional on purpose. iOS ships without it, and the UI
 * branches on the resulting `canSignInWithGoogle` capability rather than on
 * `Platform.OS`.
 */
export interface AuthAdapter {
  client: SupabaseClient;
  signInWithGoogle?: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<EmailSignInOutcome>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
}

export interface AuthActions {
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<EmailSignInOutcome>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface AuthContextValue extends AuthActions {
  user: User | null;
  isLoggedIn: boolean;
  /** False until the first session lookup settles. Guards against a login flash. */
  ready: boolean;
  canSignInWithGoogle: boolean;
}

import type { SupabaseClient, User } from "@supabase/supabase-js";

export type { User };

export type EmailSignInOutcome = { kind: "code-sent" };

// signInWithGoogle and linkGoogle are optional because iOS ships without them; the UI branches
// on canSignInWithGoogle rather than Platform.OS.
export interface AuthAdapter {
  client: SupabaseClient;
  signInWithGoogle?: () => Promise<void>;
  linkGoogle?: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<EmailSignInOutcome>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
}

export interface AuthActions {
  signInWithGoogle: () => Promise<void>;
  linkGoogle: () => Promise<void>;
  unlinkGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<EmailSignInOutcome>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface AuthContextValue extends AuthActions {
  client: SupabaseClient;
  user: User | null;
  isLoggedIn: boolean;
  ready: boolean;
  canSignInWithGoogle: boolean;
}

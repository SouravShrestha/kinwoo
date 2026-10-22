"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AuthAdapter, AuthContextValue } from "./adapter";
import {
  INITIAL_AUTH_STATE,
  authStateFromSession,
  canSignInWithGoogle,
  createAuthActions,
  type AuthState,
} from "./auth-state";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ adapter, children }: { adapter: AuthAdapter; children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_AUTH_STATE);

  useEffect(() => {
    let active = true;

    // getSession settles the initial render; onAuthStateChange covers a token
    // refresh arriving before it resolves.
    void adapter.client.auth.getSession().then(({ data }) => {
      if (active) setState(authStateFromSession(data.session));
    });

    const { data } = adapter.client.auth.onAuthStateChange((_event, session) => {
      if (active) setState(authStateFromSession(session));
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [adapter]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...createAuthActions(adapter),
      user: state.user,
      isLoggedIn: state.user !== null,
      ready: state.ready,
      canSignInWithGoogle: canSignInWithGoogle(adapter),
    }),
    [adapter, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside an AuthProvider.");
  return value;
}

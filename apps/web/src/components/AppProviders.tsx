"use client";

import { configureApiClient } from "@kinwoo/client/api";
import { AuthProvider } from "@kinwoo/client/auth";
import { ProfileProvider } from "@kinwoo/client/profile";
import type { ReactNode } from "react";

import { AuthGate } from "./AuthGate";
import { webAuthAdapter } from "@/lib/auth-adapter";

// Same-origin, so requests carry the session cookie. Configured at module scope to
// avoid racing the first render.
configureApiClient({ baseUrl: "" });

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider adapter={webAuthAdapter}>
      <ProfileProvider>
        {children}
        <AuthGate />
      </ProfileProvider>
    </AuthProvider>
  );
}

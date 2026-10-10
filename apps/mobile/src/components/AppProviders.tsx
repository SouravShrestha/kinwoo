import { configureApiClient } from "@kinwoo/client/api";
import { AuthProvider } from "@kinwoo/client/auth";
import { ProfileProvider } from "@kinwoo/client/profile";
import type { ReactNode } from "react";

import { AuthGate } from "./AuthGate";
import { nativeAuthAdapter } from "@/lib/auth-adapter";
import { supabase } from "@/lib/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("Missing EXPO_PUBLIC_API_URL. Set it in apps/mobile/.env.local or eas.json.");
}

// Module scope so the first request cannot race the first render. There is no shared cookie
// jar on mobile, so calls carry a bearer token.
configureApiClient({
  baseUrl: API_URL,
  getAuthHeaders: async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return {};
    return { Authorization: `Bearer ${data.session.access_token}` };
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider adapter={nativeAuthAdapter}>
      <ProfileProvider>
        {children}
        <AuthGate />
      </ProfileProvider>
    </AuthProvider>
  );
}

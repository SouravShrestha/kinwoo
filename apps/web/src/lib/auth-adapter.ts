"use client";

import type { AuthAdapter, EmailSignInOutcome } from "@kinwoo/client/auth";
import { safeNextPath } from "@kinwoo/core/auth";

import { supabase } from "@/integrations/supabase/client";

/**
 * Where Supabase should send the browser after Google.
 *
 * The configured site URL wins over the live origin so the value matches
 * Supabase's redirect allow-list exactly; behind Cloudflare the two can differ.
 * This lives in the app rather than in @kinwoo/client because that package may
 * not touch `window`.
 */
function callbackUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  const origin = configured || window.location.origin;

  const url = new URL("/auth/callback", origin);
  url.searchParams.set(
    "next",
    safeNextPath(`${window.location.pathname}${window.location.search}`),
  );

  return url.toString();
}

export const webAuthAdapter: AuthAdapter = {
  client: supabase,

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) throw new Error(error.message);
  },

  signInWithEmail: async (email): Promise<EmailSignInOutcome> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw new Error(error.message);
    return { kind: "code-sent" };
  },

  verifyEmailCode: async (email, code) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) throw new Error(error.message);
  },
};

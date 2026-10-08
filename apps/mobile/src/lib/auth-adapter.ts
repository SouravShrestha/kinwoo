import type { AuthAdapter, EmailSignInOutcome } from "@kinwoo/client/auth";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "./supabase";

/** Must match the scheme in app.config.ts and Supabase's redirect allow-list. */
export const AUTH_CALLBACK_URL = "kinwoo://auth/callback";

async function signInWithGoogleNative(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    // We open the browser ourselves so the redirect comes back to this
    // function rather than to a web page we do not control.
    options: { redirectTo: AUTH_CALLBACK_URL, skipBrowserRedirect: true },
  });

  if (error) throw new Error(error.message);
  if (!data.url) throw new Error("Google sign-in did not return a URL to open.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_URL);

  // The user dismissed the sheet. Not an error worth surfacing.
  if (result.type !== "success") return;

  const code = new URL(result.url).searchParams.get("code");
  if (!code) throw new Error("Google sign-in did not return an authorization code.");

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw new Error(exchangeError.message);
}

export const nativeAuthAdapter: AuthAdapter = {
  client: supabase,

  // iOS ships without Google: App Store review expects Sign in with Apple
  // alongside any other third-party provider, and we do not offer it yet.
  // Surfaced to the UI as canSignInWithGoogle.
  signInWithGoogle: Platform.OS === "ios" ? undefined : signInWithGoogleNative,

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

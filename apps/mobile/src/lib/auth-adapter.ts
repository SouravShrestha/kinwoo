import type { AuthAdapter, EmailSignInOutcome } from "@kinwoo/client/auth";
import { providerErrorCode } from "@kinwoo/core/auth";
import { authErrorToastMessage } from "@kinwoo/core/toast";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "./supabase";

/** Must match the scheme in app.config.ts and Supabase's redirect allow-list. */
export const AUTH_CALLBACK_URL = "kinwoo://auth/callback";

// Opened manually so the redirect returns to this module, not a web page.
const GOOGLE_OPTIONS = { redirectTo: AUTH_CALLBACK_URL, skipBrowserRedirect: true } as const;

async function finishGoogleFlow({
  data,
  error,
}: {
  data: { url: string | null };
  error: { message: string } | null;
}): Promise<void> {
  if (error) throw new Error(error.message);
  if (!data.url) throw new Error("Google sign-in did not return a URL to open.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_URL);

  if (result.type !== "success") return;

  const params = new URL(result.url).searchParams;
  if (params.get("error")) {
    // Backing out of the Google screen is not a failure worth a toast.
    if (params.get("error") === "access_denied") return;
    throw new Error(authErrorToastMessage(providerErrorCode(params)));
  }

  const code = params.get("code");
  if (!code) throw new Error("Google sign-in did not return an authorization code.");

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw new Error(exchangeError.message);
}

export const nativeAuthAdapter: AuthAdapter = {
  client: supabase,

  // App Store review expects Sign in with Apple alongside Google, which we do not offer yet.
  signInWithGoogle:
    Platform.OS === "ios"
      ? undefined
      : async () =>
          finishGoogleFlow(
            await supabase.auth.signInWithOAuth({ provider: "google", options: GOOGLE_OPTIONS }),
          ),

  // Needs manual linking enabled in Supabase (enable_manual_linking).
  linkGoogle:
    Platform.OS === "ios"
      ? undefined
      : async () =>
          finishGoogleFlow(
            await supabase.auth.linkIdentity({ provider: "google", options: GOOGLE_OPTIONS }),
          ),

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

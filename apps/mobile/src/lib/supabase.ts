// Hermes lacks the WHATWG URL API that Supabase needs. Import before createClient runs.
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "@kinwoo/core/db";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

function createSupabaseClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const missing = [
      ...(!url ? ["EXPO_PUBLIC_SUPABASE_URL"] : []),
      ...(!anonKey ? ["EXPO_PUBLIC_SUPABASE_ANON_KEY"] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // The OAuth code is exchanged by hand in the auth adapter.
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}

export const supabase = createSupabaseClient();

// Refreshing while backgrounded burns requests and can fail on a sleeping radio.
AppState.addEventListener("change", (state) => {
  if (state === "active") void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});

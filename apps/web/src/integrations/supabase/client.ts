import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@kinwoo/core/db";

import { readEnv } from "./env";

function createSupabaseClient() {
  const { url, anonKey } = readEnv();
  return createBrowserClient<Database>(url, anonKey);
}

let instance: ReturnType<typeof createSupabaseClient> | undefined;

// Env validation is deferred to first access so importing this during SSR or the
// OpenNext build does not throw before a request exists.
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_target, prop, receiver) {
    instance ??= createSupabaseClient();
    return Reflect.get(instance, prop, receiver);
  },
});

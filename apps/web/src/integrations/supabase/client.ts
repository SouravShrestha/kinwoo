import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@kinwoo/core/db";

import { readEnv } from "./env";

function createSupabaseClient() {
  const { url, anonKey } = readEnv();
  return createBrowserClient<Database>(url, anonKey);
}

let instance: ReturnType<typeof createSupabaseClient> | undefined;

/**
 * A module-level singleton whose env validation is deferred to first property
 * access. Without the Proxy, merely importing this module during SSR or the
 * OpenNext build would throw before any request is in flight.
 */
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_target, prop, receiver) {
    instance ??= createSupabaseClient();
    return Reflect.get(instance, prop, receiver);
  },
});

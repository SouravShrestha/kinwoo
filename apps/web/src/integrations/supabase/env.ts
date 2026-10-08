export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Throws naming exactly what is missing. Callers that must survive a missing
 * configuration (the middleware, during a build) use readEnvOrNull instead.
 */
export function readEnv(): SupabaseEnv {
  const env = readEnvOrNull();
  if (env) return env;

  const missing = [
    ...(!process.env.NEXT_PUBLIC_SUPABASE_URL ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
    ...(!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] : []),
  ];

  throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
}

export function readEnvOrNull(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

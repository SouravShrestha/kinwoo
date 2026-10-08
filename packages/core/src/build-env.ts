export function supabaseOrigin(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
}

export function siteUrlFromEnv(): string | undefined {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.EXPO_PUBLIC_SITE_URL;
}

export function siteUrlFromEnv(): string | undefined {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.EXPO_PUBLIC_SITE_URL;
}

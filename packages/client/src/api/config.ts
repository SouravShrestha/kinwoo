export interface ApiConfig {
  baseUrl: string;
  fetch?: typeof fetch;
  /**
   * Extra headers resolved per request. Mobile uses this to attach a Supabase
   * bearer token; web leaves it unset and relies on session cookies.
   */
  getAuthHeaders?: () => Promise<Record<string, string>>;
}

let current: ApiConfig | null = null;

export function configureApiClient(config: ApiConfig): void {
  current = { ...config, baseUrl: config.baseUrl.replace(/\/+$/, "") };
}

export function getApiConfig(): ApiConfig {
  if (!current) throw new Error("API client is not configured. Call configureApiClient first.");
  return current;
}

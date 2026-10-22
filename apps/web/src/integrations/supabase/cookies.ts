export interface CookiePair {
  name: string;
  value: string;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // A malformed escape is still a usable cookie value; Supabase's own
    // chunked cookies are base64 and survive being read raw.
    return value;
  }
}

// Splits on the first `=` only: base64 JSON values carry `=` padding.
export function parseCookieHeader(header: string | null | undefined): CookiePair[] {
  if (!header) return [];

  const pairs: CookiePair[] = [];

  for (const part of header.split(";")) {
    const segment = part.trim();
    if (!segment) continue;

    const separator = segment.indexOf("=");
    // < 1 covers both "no separator" and a leading "=" with an empty name.
    if (separator < 1) continue;

    const name = segment.slice(0, separator).trim();
    if (!name) continue;

    pairs.push({ name, value: safeDecode(segment.slice(separator + 1).trim()) });
  }

  return pairs;
}

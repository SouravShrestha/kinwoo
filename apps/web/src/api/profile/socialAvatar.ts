// Matches the img-src allowance in next.config.ts. user_metadata is writable by the signed-in
// user, so only Google's image host is trusted rather than whatever URL it holds.
const SOCIAL_AVATAR_HOST = "lh3.googleusercontent.com";

export function normaliseSocialAvatar(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" && parsed.hostname === SOCIAL_AVATAR_HOST
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

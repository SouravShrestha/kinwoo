export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 40;

export type DisplayNameError = "empty" | "too-long" | "invalid-characters";

export type DisplayNameResult =
  { ok: true; value: string } | { ok: false; error: DisplayNameError };

/** Trims and collapses internal runs of whitespace to a single space. */
export function normaliseDisplayName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/**
 * Mirrors the profiles_display_name_length constraint in the database, so a
 * name the client accepts cannot be rejected by Postgres.
 */
export function validateDisplayName(input: string): DisplayNameResult {
  const value = normaliseDisplayName(input);

  if (value.length < DISPLAY_NAME_MIN_LENGTH) return { ok: false, error: "empty" };
  if (value.length > DISPLAY_NAME_MAX_LENGTH) return { ok: false, error: "too-long" };

  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return { ok: false, error: "invalid-characters" };

  return { ok: true, value };
}

export function displayNameErrorMessage(error: DisplayNameError): string {
  switch (error) {
    case "empty":
      return "Enter a name.";
    case "too-long":
      return `Use ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`;
    case "invalid-characters":
      return "That name contains characters we can't use.";
  }
}

import { APP_SCHEME } from "./constants";

export const INVITE_CODE_LENGTH = 6;

// Excludes 0 O 1 I L so a code read aloud or off a screenshot is hard to mistype.
export const INVITE_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{6}$/;

export type InviteInputError = "empty" | "invalid";
export type InviteInputResult = { ok: true; code: string } | { ok: false; error: InviteInputError };

export function normaliseInviteCode(input: string): string {
  return input.replace(/[\s-]+/g, "").toUpperCase();
}

const JOIN_LINK = /\/join\/([^/?#\s]+)/i;

export function parseInviteInput(input: string): InviteInputResult {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: false, error: "empty" };

  const fromLink = JOIN_LINK.exec(trimmed);
  const code = normaliseInviteCode(fromLink ? decodeSegment(fromLink[1]) : trimmed);

  return INVITE_CODE_PATTERN.test(code) ? { ok: true, code } : { ok: false, error: "invalid" };
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function inviteWebUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/join/${code}`;
}

export function inviteAppUrl(code: string): string {
  return `${APP_SCHEME}://join/${code}`;
}

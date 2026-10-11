import type { HouseJoinMode } from "./types";

export const HOUSE_NAME_MAX_LENGTH = 60;
export const HOUSE_ADDRESS_MAX_LENGTH = 200;
export const INVITE_EMAIL_MAX_LENGTH = 254;

export const HOUSE_JOIN_MODES = ["anyone", "invited"] as const satisfies readonly HouseJoinMode[];

export type HouseNameError = "empty" | "too-long" | "invalid-characters";
export type HouseNameResult = { ok: true; value: string } | { ok: false; error: HouseNameError };

export type HouseOptionalTextError = "too-long" | "invalid-characters";
export type HouseOptionalTextResult =
  { ok: true; value: string | null } | { ok: false; error: HouseOptionalTextError };

export type InviteEmailError = "empty" | "invalid";
export type InviteEmailResult =
  { ok: true; value: string } | { ok: false; error: InviteEmailError };

// Counts code points, like Postgres char_length, so astral characters are not two characters.
function lengthOf(value: string): number {
  return Array.from(value).length;
}

function collapse(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function validateHouseName(input: string): HouseNameResult {
  const value = collapse(input);

  if (lengthOf(value) < 1) return { ok: false, error: "empty" };
  if (lengthOf(value) > HOUSE_NAME_MAX_LENGTH) return { ok: false, error: "too-long" };
  if (CONTROL_CHARACTERS.test(value)) return { ok: false, error: "invalid-characters" };

  return { ok: true, value };
}

function validateOptionalText(input: string | null | undefined, max: number, multiline: boolean) {
  const value = multiline ? (input ?? "").trim() : collapse(input ?? "");
  if (value === "") return { ok: true, value: null } as const;

  if (lengthOf(value) > max) return { ok: false, error: "too-long" } as const;
  if (CONTROL_CHARACTERS.test(value)) return { ok: false, error: "invalid-characters" } as const;

  return { ok: true, value } as const;
}

export function validateHouseAddress(input: string | null | undefined): HouseOptionalTextResult {
  return validateOptionalText(input, HOUSE_ADDRESS_MAX_LENGTH, false);
}

export function isHouseJoinMode(value: unknown): value is HouseJoinMode {
  return (HOUSE_JOIN_MODES as readonly unknown[]).includes(value);
}

// Mirrors the pattern in add_invited_email so the server never rejects what the form accepted.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateInviteEmail(input: string): InviteEmailResult {
  const value = input.trim().toLowerCase();

  if (value === "") return { ok: false, error: "empty" };
  if (value.length > INVITE_EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(value)) {
    return { ok: false, error: "invalid" };
  }

  return { ok: true, value };
}

export function inviteEmailErrorMessage(error: InviteEmailError): string {
  return error === "empty" ? "Enter an email address." : "Enter a valid email address.";
}

export function houseNameErrorMessage(error: HouseNameError): string {
  switch (error) {
    case "empty":
      return "Give your house a name.";
    case "too-long":
      return `Use ${HOUSE_NAME_MAX_LENGTH} characters or fewer.`;
    case "invalid-characters":
      return "That name contains characters we can't use.";
  }
}

export function houseAddressErrorMessage(error: HouseOptionalTextError): string {
  return error === "too-long"
    ? `Use ${HOUSE_ADDRESS_MAX_LENGTH} characters or fewer.`
    : "That address contains characters we can't use.";
}

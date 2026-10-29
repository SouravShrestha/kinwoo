import type { HouseJoinMode } from "./types";

export const HOUSE_NAME_MIN_LENGTH = 2;
export const HOUSE_NAME_MAX_LENGTH = 40;
export const HOUSE_ADDRESS_MIN_LENGTH = 10;
export const HOUSE_ADDRESS_MAX_LENGTH = 120;
export const INVITE_EMAIL_MAX_LENGTH = 254;

export const HOUSE_JOIN_MODES = ["anyone", "invited"] as const satisfies readonly HouseJoinMode[];

export type HouseTextError = "empty" | "too-short" | "too-long" | "invalid-characters";
export type HouseTextResult = { ok: true; value: string } | { ok: false; error: HouseTextError };

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

function validateHouseText(input: string | null | undefined, min: number, max: number) {
  const value = collapse(input ?? "");
  const length = lengthOf(value);

  if (length < 1) return { ok: false, error: "empty" } as const;
  if (length < min) return { ok: false, error: "too-short" } as const;
  if (length > max) return { ok: false, error: "too-long" } as const;
  if (CONTROL_CHARACTERS.test(value)) return { ok: false, error: "invalid-characters" } as const;

  return { ok: true, value } as const;
}

export function validateHouseName(input: string): HouseTextResult {
  return validateHouseText(input, HOUSE_NAME_MIN_LENGTH, HOUSE_NAME_MAX_LENGTH);
}

export function validateHouseAddress(input: string | null | undefined): HouseTextResult {
  return validateHouseText(input, HOUSE_ADDRESS_MIN_LENGTH, HOUSE_ADDRESS_MAX_LENGTH);
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

function houseTextErrorMessage(
  error: HouseTextError,
  subject: string,
  min: number,
  max: number,
): string {
  switch (error) {
    case "empty":
      return `Enter your house ${subject}.`;
    case "too-short":
      return `Use at least ${min} characters.`;
    case "too-long":
      return `Use ${max} characters or fewer.`;
    case "invalid-characters":
      return `That ${subject} contains characters we can't use.`;
  }
}

export function houseNameErrorMessage(error: HouseTextError): string {
  return error === "empty"
    ? "Give your house a name."
    : houseTextErrorMessage(error, "name", HOUSE_NAME_MIN_LENGTH, HOUSE_NAME_MAX_LENGTH);
}

export function houseAddressErrorMessage(error: HouseTextError): string {
  return houseTextErrorMessage(
    error,
    "address",
    HOUSE_ADDRESS_MIN_LENGTH,
    HOUSE_ADDRESS_MAX_LENGTH,
  );
}

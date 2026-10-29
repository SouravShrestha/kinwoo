import { HOUSE_LIMIT_MESSAGE, MAX_HOUSES_PER_USER } from "./limits";
import type { InviteFailureStatus } from "./types";
import {
  HOUSE_ADDRESS_MAX_LENGTH,
  HOUSE_ADDRESS_MIN_LENGTH,
  HOUSE_NAME_MAX_LENGTH,
  HOUSE_NAME_MIN_LENGTH,
} from "./validation";

// The RPCs raise these as the exception message.
export const HOUSE_ERROR_CODES = [
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "LAST_ADMIN",
  "NOT_A_MEMBER",
  "USE_LEAVE_HOUSE",
  "OUTSTANDING_BALANCE",
  "RATE_LIMITED",
  "HOUSE_LIMIT_REACHED",
  "HOUSE_FULL",
  "INVALID_NAME",
  "INVALID_ADDRESS",
  "INVALID_EMAIL",
  "NOT_FOUND",
  "NO_PENDING_REQUEST",
] as const;

export type HouseErrorCode = (typeof HOUSE_ERROR_CODES)[number];

export function isHouseErrorCode(value: unknown): value is HouseErrorCode {
  return typeof value === "string" && (HOUSE_ERROR_CODES as readonly string[]).includes(value);
}

export function parseRpcError(message: string | null | undefined): HouseErrorCode | null {
  const trimmed = (message ?? "").trim();
  return isHouseErrorCode(trimmed) ? trimmed : null;
}

const MESSAGES: Record<HouseErrorCode, string> = {
  NOT_AUTHENTICATED: "Sign in to continue.",
  FORBIDDEN: "Only a house admin can do that.",
  LAST_ADMIN: "Promote another member to admin first.",
  NOT_A_MEMBER: "That person is no longer in this house.",
  USE_LEAVE_HOUSE: "To remove yourself, leave the house instead.",
  OUTSTANDING_BALANCE:
    "There is an unsettled balance. Every balance in Bills has to be zero first.",
  RATE_LIMITED: "Too many attempts. Try again in a few minutes.",
  HOUSE_LIMIT_REACHED: `${HOUSE_LIMIT_MESSAGE} Leave one first.`,
  HOUSE_FULL: "This house is full.",
  INVALID_NAME: `Give your house a name of ${HOUSE_NAME_MIN_LENGTH} to ${HOUSE_NAME_MAX_LENGTH} characters.`,
  INVALID_ADDRESS: `Enter an address of ${HOUSE_ADDRESS_MIN_LENGTH} to ${HOUSE_ADDRESS_MAX_LENGTH} characters.`,
  INVALID_EMAIL: "Enter a valid email address.",
  NOT_FOUND: "We couldn't find that house.",
  NO_PENDING_REQUEST: "There is no pending request to answer.",
};

export const GENERIC_HOUSE_ERROR = "Something went wrong. Please try again.";

export function houseErrorMessage(code: string | null | undefined): string {
  return isHouseErrorCode(code) ? MESSAGES[code] : GENERIC_HOUSE_ERROR;
}

export type InviteFailureCopy = { title: string; message: string };

const FAILURE_COPY: Record<InviteFailureStatus, InviteFailureCopy> = {
  invalid: {
    title: "Code not found",
    message: "Check the code and try again, or ask your housemate to send it again.",
  },
  not_invited: {
    title: "This house is private",
    message:
      "Only invited emails can join this house. Ask an admin to add the email you signed in with.",
  },
  full: {
    title: "House is full",
    message: "This house has no room for more members.",
  },
  house_limit: {
    title: `You're in ${MAX_HOUSES_PER_USER} houses`,
    message: `${HOUSE_LIMIT_MESSAGE} Leave one to join this house.`,
  },
};

export function inviteFailureCopy(status: InviteFailureStatus): InviteFailureCopy {
  return FAILURE_COPY[status];
}

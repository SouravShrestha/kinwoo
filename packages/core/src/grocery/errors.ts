export const GROCERY_ERROR_CODES = [
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_NAME",
  "INVALID_INPUT",
  "ALREADY_CLAIMED",
  "ALREADY_BOUGHT",
  "WRONG_HOUSE",
  "NOT_ASSIGNEE",
  "NOT_CLAIMER",
  "LIST_HAS_ASSIGNED_ITEMS",
  "DEFAULT_LIST_MUST_BE_PUBLIC",
  "PRIVATE_LIST",
  "NOT_A_MEMBER",
] as const;

export type GroceryErrorCode = (typeof GROCERY_ERROR_CODES)[number];

export function isGroceryErrorCode(value: unknown): value is GroceryErrorCode {
  return typeof value === "string" && (GROCERY_ERROR_CODES as readonly string[]).includes(value);
}

export function parseGroceryRpcError(message: string | null | undefined): GroceryErrorCode | null {
  const trimmed = (message ?? "").trim();
  return isGroceryErrorCode(trimmed) ? trimmed : null;
}

const MESSAGES: Record<GroceryErrorCode, string> = {
  NOT_AUTHENTICATED: "Sign in to continue.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find that.",
  INVALID_NAME: "Enter a valid name.",
  INVALID_INPUT: "Check your input and try again.",
  ALREADY_CLAIMED: "Someone else claimed this item first.",
  ALREADY_BOUGHT: "Someone already bought one of these items.",
  WRONG_HOUSE: "Both lists must be in the same house.",
  NOT_ASSIGNEE: "Only the person assigned to this item can respond.",
  NOT_CLAIMER: "Only the person who claimed this item can unclaim it.",
  LIST_HAS_ASSIGNED_ITEMS:
    "This list has items assigned to other housemates. Reassign them before making it private.",
  DEFAULT_LIST_MUST_BE_PUBLIC:
    "The default list has to stay public. Make another list the default first.",
  PRIVATE_LIST: "Purchases from a private list can't be split.",
  NOT_A_MEMBER: "Everyone in a split has to be in the house.",
};

export const GENERIC_GROCERY_ERROR = "Something went wrong. Please try again.";

export const TRANSACTION_UNAVAILABLE =
  "This transaction isn't available. It may have been deleted.";

export function groceryErrorMessage(code: string | null | undefined): string {
  return isGroceryErrorCode(code) ? MESSAGES[code] : GENERIC_GROCERY_ERROR;
}

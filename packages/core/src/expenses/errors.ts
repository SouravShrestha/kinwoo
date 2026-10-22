// The expense RPCs raise these as the exception message.
export const EXPENSE_ERROR_CODES = [
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "NOT_A_MEMBER",
  "INVALID_INPUT",
  "PRIVATE_LIST",
  "RATE_LIMITED",
] as const;

export type ExpenseErrorCode = (typeof EXPENSE_ERROR_CODES)[number];

export function isExpenseErrorCode(value: unknown): value is ExpenseErrorCode {
  return typeof value === "string" && (EXPENSE_ERROR_CODES as readonly string[]).includes(value);
}

export function parseExpenseRpcError(message: string | null | undefined): ExpenseErrorCode | null {
  const trimmed = (message ?? "").trim();
  return isExpenseErrorCode(trimmed) ? trimmed : null;
}

const MESSAGES: Record<ExpenseErrorCode, string> = {
  NOT_AUTHENTICATED: "Sign in to continue.",
  FORBIDDEN: "Only the people in this expense or an admin can change it.",
  NOT_FOUND: "We couldn't find that expense.",
  NOT_A_MEMBER: "Everyone in an expense has to be in the house.",
  INVALID_INPUT: "Check the amounts and try again.",
  PRIVATE_LIST: "Purchases from a private list can't be split.",
  RATE_LIMITED: "You've changed this twice already. Try again in half an hour.",
};

export const GENERIC_EXPENSE_ERROR = "Something went wrong. Please try again.";

export function expenseErrorMessage(code: string | null | undefined): string {
  return isExpenseErrorCode(code) ? MESSAGES[code] : GENERIC_EXPENSE_ERROR;
}

import { expenseErrorMessage, isExpenseErrorCode } from "@kinwoo/core/expenses";

import { ApiRequestError } from "../api/request";

export function expenseErrorFromCause(cause: unknown, fallback: string): string {
  if (cause instanceof ApiRequestError && isExpenseErrorCode(cause.code)) {
    return expenseErrorMessage(cause.code);
  }
  return fallback;
}

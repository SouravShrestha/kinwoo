import { groceryErrorMessage, isGroceryErrorCode } from "@kinwoo/core/grocery";

import { ApiRequestError } from "../api/request";

export function groceryErrorFromCause(cause: unknown, fallback: string): string {
  if (cause instanceof ApiRequestError && isGroceryErrorCode(cause.code)) {
    return groceryErrorMessage(cause.code);
  }
  return fallback;
}

import { GENERIC_HOUSE_ERROR, houseErrorMessage, isHouseErrorCode } from "@kinwoo/core/houses";

import { ApiRequestError } from "../api/request";

// One place that turns any thrown value into copy for the user, so no screen shows a raw
// "Request failed with status 409".
export function houseErrorFromCause(cause: unknown): string {
  if (!(cause instanceof ApiRequestError)) return GENERIC_HOUSE_ERROR;
  if (isHouseErrorCode(cause.code)) return houseErrorMessage(cause.code);
  if (cause.code === "INVALID_INPUT" && cause.message) return cause.message;
  return GENERIC_HOUSE_ERROR;
}

export function errorCodeOf(cause: unknown): string | null {
  return cause instanceof ApiRequestError ? cause.code : null;
}

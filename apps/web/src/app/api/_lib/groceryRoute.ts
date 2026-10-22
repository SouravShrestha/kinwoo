import {
  ITEM_URGENCIES,
  isItemUrgency,
  MAX_BULK_ASSIGN,
  type UpdateItemInput,
} from "@kinwoo/core/grocery";

import { GroceryRepository } from "@/api/grocery/GroceryRepository";
import { GroceryService } from "@/api/grocery/GroceryService";
import type { GroceryServiceErrorCode } from "@/api/grocery/IGroceryService";

import { createRouteHandler, isOptional, isUuid } from "./route";

export { badRequest, isUuid, readJsonObject } from "./route";

const STATUS_BY_CODE: Record<GroceryServiceErrorCode, number> = {
  INVALID_INPUT: 400,
  INVALID_NAME: 400,
  NOT_AUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  ALREADY_CLAIMED: 409,
  ALREADY_BOUGHT: 409,
  WRONG_HOUSE: 409,
  NOT_ASSIGNEE: 409,
  NOT_CLAIMER: 409,
  LIST_HAS_ASSIGNED_ITEMS: 409,
  DEFAULT_LIST_MUST_BE_PUBLIC: 409,
  PRIVATE_LIST: 409,
  NOT_A_MEMBER: 409,
  UNAVAILABLE: 503,
};

export function isItemIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_BULK_ASSIGN &&
    value.every(isUuid)
  );
}

type ItemFields = Omit<UpdateItemInput, "name">;

// The fields item create and update share. Returns the error message for the first bad field.
export function readItemFields(body: Record<string, unknown>): ItemFields | string {
  const { quantity, unit, categoryId, urgency, note } = body;
  if (!isOptional(quantity, "number")) return "quantity must be a number";
  if (!isOptional(unit, "string")) return "unit must be a string";
  if (!isOptional(categoryId, "string")) return "categoryId must be a string";
  if (urgency !== undefined && !isItemUrgency(urgency)) {
    return `urgency must be one of: ${ITEM_URGENCIES.join(", ")}`;
  }
  if (!isOptional(note, "string")) return "note must be a string";
  return { quantity, unit, categoryId, urgency, note };
}

export const handleGroceryRequest = createRouteHandler(
  (client) => new GroceryService(new GroceryRepository(client)),
  STATUS_BY_CODE,
);

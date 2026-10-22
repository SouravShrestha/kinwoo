import {
  isExpenseCategory,
  isSplitMethod,
  type ExpenseInput,
  type ExpenseParts,
  type LinkedExpenseInput,
  type SettlementInput,
} from "@kinwoo/core/expenses";
import type { NextResponse } from "next/server";

import { ExpensesRepository } from "@/api/expenses/ExpensesRepository";
import { ExpensesService } from "@/api/expenses/ExpensesService";
import type {
  ExpensesResult,
  ExpensesServiceErrorCode,
  IExpensesService,
} from "@/api/expenses/IExpensesService";

import { createRouteHandler, isOptional, isUuid, type RouteOptions } from "./route";

export { badRequest } from "./route";

const STATUS_BY_CODE: Record<ExpensesServiceErrorCode, number> = {
  INVALID_INPUT: 400,
  NOT_AUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_A_MEMBER: 409,
  PRIVATE_LIST: 409,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
};

const handle = createRouteHandler(
  (client) => new ExpensesService(new ExpensesRepository(client)),
  STATUS_BY_CODE,
);

export function handleExpenseRequest<T>(
  request: Request,
  run: (service: IExpensesService) => Promise<ExpensesResult<T> | NextResponse>,
  options: RouteOptions = {},
): Promise<NextResponse> {
  return handle(request, ({ service }) => run(service), options);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableInt(value: unknown): value is number | null {
  return value === null || Number.isInteger(value);
}

// Shape checks only; amounts and sums are validated by the service.
export function readExpenseParts(value: unknown): ExpenseParts | null {
  if (!isRecord(value) || !isSplitMethod(value.splitMethod)) return null;
  const { payers, shares } = value;
  if (!Array.isArray(payers) || !Array.isArray(shares)) return null;
  const payersOk = payers.every(
    (payer) => isRecord(payer) && isUuid(payer.userId) && Number.isInteger(payer.amountPaise),
  );
  const sharesOk = shares.every(
    (share) =>
      isRecord(share) &&
      isUuid(share.userId) &&
      Number.isInteger(share.sharePaise) &&
      isNullableInt(share.weight ?? null),
  );
  if (!payersOk || !sharesOk) return null;
  return {
    splitMethod: value.splitMethod,
    payers: payers.map((payer) => ({ userId: payer.userId, amountPaise: payer.amountPaise })),
    shares: shares.map((share) => ({
      userId: share.userId,
      sharePaise: share.sharePaise,
      weight: share.weight ?? null,
    })),
  };
}

export function readSettlementInput(body: Record<string, unknown>): SettlementInput | string {
  const { payerId, payeeId, amountPaise } = body;
  if (!isUuid(payerId) || !isUuid(payeeId)) return "payerId and payeeId must be ids";
  if (!Number.isInteger(amountPaise)) return "amountPaise must be a whole number";
  return { payerId, payeeId, amountPaise: amountPaise as number };
}

export function readLinkedExpense(value: unknown): LinkedExpenseInput | null | "invalid" {
  if (value === undefined || value === null) return null;
  const parts = readExpenseParts(value);
  if (!parts || !isRecord(value) || typeof value.spentOn !== "string") return "invalid";
  return { ...parts, spentOn: value.spentOn };
}

export function readExpenseInput(body: Record<string, unknown>): ExpenseInput | string {
  if (typeof body.title !== "string") return "title must be a string";
  if (!Number.isInteger(body.amountPaise)) return "amountPaise must be a whole number";
  if (!isExpenseCategory(body.category)) return "category is not recognised";
  if (!isOptional(body.note, "string")) {
    return "note must be a string";
  }
  if (typeof body.spentOn !== "string") return "spentOn must be a date";
  const parts = readExpenseParts(body.parts);
  if (!parts) return "parts must list payers and shares";
  return {
    title: body.title,
    amountPaise: body.amountPaise as number,
    category: body.category,
    note: (body.note as string | null | undefined) ?? null,
    spentOn: body.spentOn,
    parts,
  };
}

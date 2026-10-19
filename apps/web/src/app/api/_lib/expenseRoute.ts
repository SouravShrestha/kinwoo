import {
  isExpenseCategory,
  isSplitMethod,
  type ExpenseInput,
  type ExpenseParts,
  type LinkedExpenseInput,
} from "@kinwoo/core/expenses";
import { NextResponse } from "next/server";

import { ExpensesRepository } from "@/api/expenses/ExpensesRepository";
import { ExpensesService } from "@/api/expenses/ExpensesService";
import type {
  ExpensesResult,
  ExpensesServiceErrorCode,
  IExpensesService,
} from "@/api/expenses/IExpensesService";
import { createRouteClient, getVerifiedUser } from "@/integrations/supabase/client.route";

import { isUuid } from "./groceryRoute";

const STATUS_BY_CODE: Record<ExpensesServiceErrorCode, number> = {
  INVALID_INPUT: 400,
  NOT_AUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_A_MEMBER: 409,
  PRIVATE_LIST: 409,
  UNAVAILABLE: 503,
};

const NO_STORE = { "Cache-Control": "no-store" };

function expenseResponse<T>(result: ExpensesResult<T>, key?: string): NextResponse {
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: STATUS_BY_CODE[result.code] ?? 500, headers: NO_STORE },
    );
  }
  const body = key ? { [key]: result.data } : { ok: true };
  return NextResponse.json(body, { headers: NO_STORE });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message, code: "INVALID_INPUT" }, { status: 400 });
}

export async function handleExpenseRequest<T>(
  request: Request,
  run: (service: IExpensesService) => Promise<ExpensesResult<T> | NextResponse>,
  options: { key?: string; uuids?: string[] } = {},
): Promise<NextResponse> {
  const { supabase, applyCookies } = createRouteClient(request);
  const user = await getVerifiedUser(request);
  if (!user) {
    return applyCookies(NextResponse.json({ error: "Not logged in" }, { status: 401 }));
  }
  if (options.uuids?.some((value) => !isUuid(value))) {
    return applyCookies(
      NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 }),
    );
  }
  const result = await run(new ExpensesService(new ExpensesRepository(supabase)));
  if (result instanceof NextResponse) return applyCookies(result);
  return applyCookies(expenseResponse(result, options.key));
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
  if (body.note !== undefined && body.note !== null && typeof body.note !== "string") {
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

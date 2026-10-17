import { MAX_BULK_ASSIGN } from "@kinwoo/core/grocery";
import { NextResponse } from "next/server";

import { GroceryRepository } from "@/api/grocery/GroceryRepository";
import { GroceryService } from "@/api/grocery/GroceryService";
import type {
  GroceryResult,
  GroceryServiceErrorCode,
  IGroceryService,
} from "@/api/grocery/IGroceryService";
import { createRouteClient, getVerifiedUser } from "@/integrations/supabase/client.route";

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
  UNAVAILABLE: 503,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isItemIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_BULK_ASSIGN &&
    value.every(isUuid)
  );
}

const NO_STORE = { "Cache-Control": "no-store" };

export function groceryStatusFor(code: GroceryServiceErrorCode): number {
  return STATUS_BY_CODE[code] ?? 500;
}

export function groceryResponse<T>(
  result: GroceryResult<T>,
  options: { key?: string; status?: number } = {},
): NextResponse {
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: groceryStatusFor(result.code), headers: NO_STORE },
    );
  }

  const body = options.key ? { [options.key]: result.data } : { ok: true };
  return NextResponse.json(body, { status: options.status ?? 200, headers: NO_STORE });
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export type GroceryRouteContext = { service: IGroceryService; userId: string };

type GroceryRouteOptions = {
  key?: string;
  status?: number;
  uuids?: string[];
};

export async function handleGroceryRequest<T>(
  request: Request,
  run: (context: GroceryRouteContext) => Promise<GroceryResult<T> | NextResponse>,
  options: GroceryRouteOptions = {},
): Promise<NextResponse> {
  const { supabase, applyCookies } = createRouteClient(request);

  const user = await getVerifiedUser(request);
  if (!user) {
    return applyCookies(NextResponse.json({ error: "Not logged in" }, { status: 401 }));
  }

  if (options.uuids?.some((value) => !UUID.test(value))) {
    return applyCookies(
      NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 }),
    );
  }

  const service = new GroceryService(new GroceryRepository(supabase));
  const result = await run({ service, userId: user.id });

  if (result instanceof NextResponse) return applyCookies(result);
  return applyCookies(groceryResponse(result, options));
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message, code: "INVALID_INPUT" }, { status: 400 });
}

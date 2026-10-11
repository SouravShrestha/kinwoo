import { NextResponse } from "next/server";

import { HousesRepository } from "@/api/houses/HousesRepository";
import { HousesService } from "@/api/houses/HousesService";
import type {
  HouseResult,
  HouseServiceErrorCode,
  IHousesService,
} from "@/api/houses/IHousesService";
import { createRouteClient, getVerifiedUser } from "@/integrations/supabase/client.route";

const STATUS_BY_CODE: Record<HouseServiceErrorCode, number> = {
  INVALID_INPUT: 400,
  INVALID_NAME: 400,
  INVALID_EMAIL: 400,
  NOT_AUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_A_MEMBER: 404,
  LAST_ADMIN: 409,
  USE_LEAVE_HOUSE: 409,
  OUTSTANDING_BALANCE: 409,
  HOUSE_LIMIT_REACHED: 409,
  HOUSE_FULL: 409,
  NO_PENDING_REQUEST: 409,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NO_STORE = { "Cache-Control": "no-store" };

export function houseStatusFor(code: HouseServiceErrorCode): number {
  return STATUS_BY_CODE[code];
}

export function houseResponse<T>(
  result: HouseResult<T>,
  options: { key?: string; status?: number } = {},
): NextResponse {
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: houseStatusFor(result.code), headers: NO_STORE },
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

export type HouseRouteContext = { service: IHousesService; userId: string };

type HouseRouteOptions = {
  key?: string;
  status?: number;
  // Path parameters that must be UUIDs. Anything else is a 404 rather than a Postgres cast error.
  uuids?: string[];
};

export async function handleHouseRequest<T>(
  request: Request,
  run: (context: HouseRouteContext) => Promise<HouseResult<T> | NextResponse>,
  options: HouseRouteOptions = {},
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

  const service = new HousesService(new HousesRepository(supabase));
  const result = await run({ service, userId: user.id });

  if (result instanceof NextResponse) return applyCookies(result);
  return applyCookies(houseResponse(result, options));
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message, code: "INVALID_INPUT" }, { status: 400 });
}

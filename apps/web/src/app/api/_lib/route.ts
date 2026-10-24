import type { Database } from "@kinwoo/core/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import type { ServiceResult } from "@/api/_shared/result";
import { createRouteClient, getVerifiedUser } from "@/integrations/supabase/client.route";

export { readJsonObject } from "./json";

export const NO_STORE = { "Cache-Control": "no-store" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

// For optional body fields: absent and null are both allowed.
export function isOptional(value: unknown, type: "string"): value is string | null | undefined;
export function isOptional(value: unknown, type: "number"): value is number | null | undefined;
export function isOptional(value: unknown, type: "boolean"): value is boolean | null | undefined;
export function isOptional(value: unknown, type: "string" | "number" | "boolean"): boolean {
  return value === undefined || value === null || typeof value === type;
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message, code: "INVALID_INPUT" }, { status: 400 });
}

export type ResponseOptions = { key?: string; status?: number };

export function resultResponse<T, Code extends string>(
  result: ServiceResult<T, Code>,
  statusByCode: Record<Code, number>,
  options: ResponseOptions = {},
): NextResponse {
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: statusByCode[result.code] ?? 500, headers: NO_STORE },
    );
  }

  const body = options.key ? { [options.key]: result.data } : { ok: true };
  return NextResponse.json(body, { status: options.status ?? 200, headers: NO_STORE });
}

export type RouteContext<Service> = { service: Service; userId: string };

export type RouteOptions = ResponseOptions & {
  // Path parameters that must be UUIDs. Anything else is a 404 rather than a Postgres cast error.
  uuids?: string[];
};

// Every authenticated route runs the same steps: verify the user, check path ids, build the
// service on the request's Supabase client, map its result, and flush refreshed cookies on every
// exit path.
export function createRouteHandler<Service, Code extends string>(
  makeService: (client: SupabaseClient<Database>) => Service,
  statusByCode: Record<Code, number>,
) {
  return async function handle<T>(
    request: Request,
    run: (context: RouteContext<Service>) => Promise<ServiceResult<T, Code> | NextResponse>,
    options: RouteOptions = {},
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

    const result = await run({ service: makeService(supabase), userId: user.id });

    if (result instanceof NextResponse) return applyCookies(result);
    return applyCookies(resultResponse(result, statusByCode, options));
  };
}

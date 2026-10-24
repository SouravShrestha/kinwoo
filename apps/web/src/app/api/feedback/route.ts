import { FEEDBACK_HONEYPOT_FIELD } from "@kinwoo/core/app";
import { NextResponse } from "next/server";

import { FeedbackRepository } from "@/api/feedback/FeedbackRepository";
import { FeedbackService } from "@/api/feedback/FeedbackService";
import { badRequest, NO_STORE, readJsonObject } from "@/app/api/_lib/route";
import { getClientIp, isJsonRequest, isSameOrigin } from "@/lib/form-security";
import { checkRateLimit } from "@/lib/rate-limit";

// Keep in sync with the RATE_LIMITER binding in wrangler.toml.
const RATE_LIMIT = { maxRequests: 1, windowMs: 60_000 };

const service = new FeedbackService(new FeedbackRepository());

// Public on purpose: people who cannot sign in need to reach support.
export async function POST(request: Request) {
  // Cheap checks first so cross-site and junk requests do not use up the rate-limit quota.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: NO_STORE });
  }
  if (!isJsonRequest(request)) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 415 });
  }

  const { allowed, retryAfterMs } = await checkRateLimit(
    `feedback:${getClientIp(request)}`,
    RATE_LIMIT,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { ...NO_STORE, "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      },
    );
  }

  const body = await readJsonObject(request);
  if (!body) return badRequest("Invalid JSON body");

  // Pretend success so bots do not learn they were filtered.
  const trap = body[FEEDBACK_HONEYPOT_FIELD];
  if (typeof trap === "string" && trap.trim() !== "") {
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  const result = await service.submit(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.code === "INVALID_INPUT" ? 400 : 503, headers: NO_STORE },
    );
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

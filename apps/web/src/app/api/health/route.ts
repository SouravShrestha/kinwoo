import { NextResponse } from "next/server";

import { HealthRepository } from "@/api/health/HealthRepository";
import { HealthService } from "@/api/health/HealthService";

const service = new HealthService(new HealthRepository());

export async function GET() {
  const health = await service.getStatus();
  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

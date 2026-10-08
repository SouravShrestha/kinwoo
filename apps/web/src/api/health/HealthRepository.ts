import type { HealthStatus, IHealthRepository } from "./IHealthRepository";

export class HealthRepository implements IHealthRepository {
  async check(): Promise<HealthStatus> {
    return {
      status: "ok",
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
      timestamp: new Date().toISOString(),
    };
  }
}

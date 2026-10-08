import type { IHealthRepository, HealthStatus } from "./IHealthRepository";
import type { IHealthService } from "./IHealthService";

export class HealthService implements IHealthService {
  constructor(private readonly repository: IHealthRepository) {}

  async getStatus(): Promise<HealthStatus> {
    try {
      return await this.repository.check();
    } catch {
      return {
        status: "error",
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
        timestamp: new Date().toISOString(),
      };
    }
  }
}

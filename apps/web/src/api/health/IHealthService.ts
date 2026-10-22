import type { HealthStatus } from "./IHealthRepository";

export interface IHealthService {
  getStatus(): Promise<HealthStatus>;
}

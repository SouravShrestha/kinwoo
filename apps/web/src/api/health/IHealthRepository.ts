export type HealthState = "ok" | "error";

export interface HealthStatus {
  status: HealthState;
  version: string;
  timestamp: string;
}

export interface IHealthRepository {
  check(): Promise<HealthStatus>;
}

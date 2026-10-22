import { describe, expect, it } from "vitest";

import { HealthService } from "./HealthService";
import type { HealthStatus, IHealthRepository } from "./IHealthRepository";

const okStatus: HealthStatus = {
  status: "ok",
  version: "1.0.0",
  timestamp: "2026-01-01T00:00:00Z",
};

describe("HealthService", () => {
  it("returns the repository status", async () => {
    const repository: IHealthRepository = { check: async () => okStatus };
    await expect(new HealthService(repository).getStatus()).resolves.toEqual(okStatus);
  });

  it("reports an error status when the repository throws", async () => {
    const repository: IHealthRepository = {
      check: async () => {
        throw new Error("boom");
      },
    };
    const result = await new HealthService(repository).getStatus();
    expect(result.status).toBe("error");
  });
});

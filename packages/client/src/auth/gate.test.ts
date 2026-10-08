import { describe, expect, it } from "vitest";

import { gateDecision, type GateInput } from "./gate";

const base: GateInput = {
  authReady: true,
  isLoggedIn: false,
  profileReady: false,
  needsDisplayName: false,
  isPublicRoute: false,
};

const decide = (overrides: Partial<GateInput>) => gateDecision({ ...base, ...overrides });

describe("gateDecision", () => {
  it("does nothing until the session lookup settles", () => {
    expect(decide({ authReady: false })).toBe("nothing");
    expect(decide({ authReady: false, isPublicRoute: false })).toBe("nothing");
  });

  it("sends a signed-out visitor to login on a private route", () => {
    expect(decide({ isLoggedIn: false })).toBe("redirect-to-login");
  });

  it("leaves a signed-out visitor alone on a public route", () => {
    expect(decide({ isLoggedIn: false, isPublicRoute: true })).toBe("nothing");
  });

  it("waits for the profile before deciding about setup", () => {
    expect(decide({ isLoggedIn: true, profileReady: false, needsDisplayName: true })).toBe(
      "nothing",
    );
  });

  it("asks for a display name once the profile says it is missing", () => {
    expect(decide({ isLoggedIn: true, profileReady: true, needsDisplayName: true })).toBe(
      "collect-display-name",
    );
  });

  it("does nothing for a fully set up user", () => {
    expect(decide({ isLoggedIn: true, profileReady: true, needsDisplayName: false })).toBe(
      "nothing",
    );
  });

  it("still collects a display name on a public route, since setup is not route-specific", () => {
    expect(
      decide({ isLoggedIn: true, profileReady: true, needsDisplayName: true, isPublicRoute: true }),
    ).toBe("collect-display-name");
  });
});

import { describe, expect, it } from "vitest";

import { lacksHouse, type HouseAccessInput } from "./house-access";

const base: HouseAccessInput = {
  authReady: true,
  isLoggedIn: true,
  houseListReady: true,
  loadFailed: false,
  hasHouse: false,
};

const check = (overrides: Partial<HouseAccessInput>) => lacksHouse({ ...base, ...overrides });

describe("lacksHouse", () => {
  it("is true for a signed-in user with no house once loaded", () => {
    expect(check({})).toBe(true);
  });

  it("is false for a member", () => {
    expect(check({ hasHouse: true })).toBe(false);
  });

  it("waits for auth and the house list", () => {
    expect(check({ authReady: false })).toBe(false);
    expect(check({ houseListReady: false })).toBe(false);
  });

  it("does not block when the house list failed to load", () => {
    expect(check({ loadFailed: true })).toBe(false);
  });

  it("leaves signed-out visitors to the auth gate", () => {
    expect(check({ isLoggedIn: false })).toBe(false);
  });
});

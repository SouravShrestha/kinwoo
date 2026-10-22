import { describe, expect, it } from "vitest";

import { MAX_HOUSES_PER_USER, canAddHouse } from "./limits";

describe("canAddHouse", () => {
  it("allows a first house and blocks further ones", () => {
    expect(MAX_HOUSES_PER_USER).toBe(1);
    expect(canAddHouse(0)).toBe(true);
    expect(canAddHouse(1)).toBe(false);
    expect(canAddHouse(2)).toBe(false);
  });
});

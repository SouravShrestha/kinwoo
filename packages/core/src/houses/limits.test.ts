import { describe, expect, it } from "vitest";
import { MAX_HOUSES_PER_USER, canAddHouse } from "./limits";
describe("canAddHouse", () => {
  it("allows up to three houses and blocks further ones", () => {
    expect(MAX_HOUSES_PER_USER).toBe(3);
    expect(canAddHouse(0)).toBe(true);
    expect(canAddHouse(2)).toBe(true);
    expect(canAddHouse(3)).toBe(false);
    expect(canAddHouse(4)).toBe(false);
  });
});

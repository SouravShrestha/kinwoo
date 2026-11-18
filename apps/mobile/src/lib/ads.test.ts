import { describe, expect, it } from "vitest";

import { showAdAfter } from "./ads";

const adRows = (total: number) =>
  Array.from({ length: total }, (_, i) => i).filter((i) => showAdAfter(i, total));

describe("showAdAfter", () => {
  it("puts one ad at the end of a short list", () => {
    expect(adRows(0)).toEqual([]);
    expect(adRows(1)).toEqual([0]);
    expect(adRows(9)).toEqual([8]);
  });

  it("puts an ad after every 10th row and at the end", () => {
    expect(adRows(10)).toEqual([9]);
    expect(adRows(20)).toEqual([9, 19]);
    expect(adRows(25)).toEqual([9, 19, 24]);
  });
});

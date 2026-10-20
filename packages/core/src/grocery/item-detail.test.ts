import { describe, expect, it } from "vitest";

import { storeSearchLinks } from "./item-detail";
describe("storeSearchLinks", () => {
  it("encodes the item name into each store's search", () => {
    expect(storeSearchLinks("Brown bread").map((link) => link.url)).toEqual([
      "https://blinkit.com/s/?q=Brown%20bread",
      "https://www.zeptonow.com/search?query=Brown%20bread",
      "https://www.swiggy.com/instamart/search?query=Brown%20bread",
    ]);
  });
});

import { describe, expect, it } from "vitest";

import { togglePayer } from "./payer-split";

describe("togglePayer", () => {
  it("moves the whole amount to a newly chosen sole payer", () => {
    const none = togglePayer({ selected: ["me"], amounts: { me: "500" } }, "me", 50000);
    expect(none).toEqual({ selected: [], amounts: {} });
    expect(togglePayer(none, "rohan", 50000)).toEqual({
      selected: ["rohan"],
      amounts: { rohan: "500" },
    });
  });

  it("gives the remaining payer the whole amount when one of two is unticked", () => {
    const choice = { selected: ["me", "rohan"], amounts: { me: "200", rohan: "300" } };
    expect(togglePayer(choice, "me", 50000)).toEqual({
      selected: ["rohan"],
      amounts: { rohan: "500" },
    });
  });

  it("adds a second payer with an empty amount", () => {
    const choice = { selected: ["me"], amounts: { me: "500" } };
    expect(togglePayer(choice, "rohan", 50000)).toEqual({
      selected: ["me", "rohan"],
      amounts: { me: "500", rohan: "" },
    });
  });
});

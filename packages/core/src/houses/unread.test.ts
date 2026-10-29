import { describe, expect, it } from "vitest";

import { unreadCountByHouse } from "./unread";

describe("unreadCountByHouse", () => {
  it("counts unread notifications per house and skips read ones", () => {
    expect(
      unreadCountByHouse([
        { houseId: "a", readAt: null },
        { houseId: "a" },
        { houseId: "a", readAt: "2026-10-29T00:00:00Z" },
        { houseId: "b", readAt: null },
        { readAt: null },
      ]),
    ).toEqual({ a: 2, b: 1 });
  });

  it("returns no counts before notifications load", () => {
    expect(unreadCountByHouse(undefined)).toEqual({});
  });
});

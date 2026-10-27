import { describe, expect, it } from "vitest";

import { randomUuid } from "./uuid";

describe("randomUuid", () => {
  it("returns a lowercase v4 UUID, as the avatar storage policy requires", () => {
    expect(randomUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(randomUuid()).not.toBe(randomUuid());
  });
});

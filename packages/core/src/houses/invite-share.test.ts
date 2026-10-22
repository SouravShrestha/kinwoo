import { describe, expect, it } from "vitest";

import { inviteShareMessage } from "./invite-share";

describe("inviteShareMessage", () => {
  it("mentions the house, link and code", () => {
    const message = inviteShareMessage({
      houseName: "Flat 4",
      code: "ABC234",
      url: "https://x.test/join/ABC234",
    });
    expect(message).toContain("Flat 4");
    expect(message).toContain("ABC234");
    expect(message).toContain("https://x.test/join/ABC234");
  });

  it("keeps placeholder-like text in a house name literal", () => {
    const message = inviteShareMessage({
      houseName: "{code} Place",
      code: "ABC234",
      url: "https://x.test/join/ABC234",
    });
    expect(message.startsWith("Join {code} Place on Kinwoo.")).toBe(true);
  });
});

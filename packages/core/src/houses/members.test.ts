import { describe, expect, it } from "vitest";

import {
  adminCount,
  homeGreeting,
  memberDisplayName,
  memberInitial,
  sortMembers,
  timeOfDayGreeting,
} from "./members";
import type { HouseMember } from "./types";

function member(overrides: Partial<HouseMember>): HouseMember {
  return {
    userId: "u",
    displayName: "Name",
    avatarUrl: null,
    email: null,
    role: "member",
    joinedAt: null,
    ...overrides,
  };
}

describe("memberDisplayName", () => {
  it("falls back to Housemate when the name is missing or blank", () => {
    expect(memberDisplayName(null)).toBe("Housemate");
    expect(memberDisplayName(undefined)).toBe("Housemate");
    expect(memberDisplayName("   ")).toBe("Housemate");
  });

  it("returns a trimmed name", () => {
    expect(memberDisplayName(" Asha ")).toBe("Asha");
  });
});

describe("homeGreeting", () => {
  const morning = new Date(2026, 9, 11, 9);

  it("greets by first name", () => {
    expect(homeGreeting("  Sourav   Shrestha ", morning)).toEqual({
      salutation: "Hi Sourav",
      message: "Good Morning!",
    });
  });

  it("drops the name when it is missing or blank", () => {
    expect(homeGreeting(null, morning).salutation).toBe("Hi");
    expect(homeGreeting("   ", morning).salutation).toBe("Hi");
  });

  it("follows the time of day", () => {
    expect(timeOfDayGreeting(new Date(2026, 9, 11, 0))).toBe("Good Morning!");
    expect(timeOfDayGreeting(new Date(2026, 9, 11, 11, 59))).toBe("Good Morning!");
    expect(timeOfDayGreeting(new Date(2026, 9, 11, 12))).toBe("Good Afternoon!");
    expect(timeOfDayGreeting(new Date(2026, 9, 11, 16, 59))).toBe("Good Afternoon!");
    expect(timeOfDayGreeting(new Date(2026, 9, 11, 17))).toBe("Good Evening!");
    expect(timeOfDayGreeting(new Date(2026, 9, 11, 23, 59))).toBe("Good Evening!");
  });
});

describe("memberInitial", () => {
  it("uppercases the first character", () => {
    expect(memberInitial("asha")).toBe("A");
    expect(memberInitial(null)).toBe("H");
  });
});

describe("sortMembers", () => {
  it("puts admins first and sorts by name", () => {
    const sorted = sortMembers([
      member({ userId: "3", displayName: "Zed" }),
      member({ userId: "2", displayName: "Amy", role: "admin" }),
      member({ userId: "1", displayName: "Bob" }),
    ]);

    expect(sorted.map((m) => m.userId)).toEqual(["2", "1", "3"]);
  });

  it("does not mutate its input", () => {
    const input = [member({ userId: "b", displayName: "B" }), member({ userId: "a" })];
    sortMembers(input);
    expect(input[0].userId).toBe("b");
  });
});

describe("adminCount", () => {
  it("counts admins", () => {
    expect(adminCount([member({ role: "admin" }), member({}), member({ role: "admin" })])).toBe(2);
  });
});

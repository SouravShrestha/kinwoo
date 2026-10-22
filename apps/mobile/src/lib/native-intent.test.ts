import { describe, expect, it } from "vitest";

import { redirectSystemPath } from "@/app/+native-intent";

describe("redirectSystemPath", () => {
  it("routes invite links, with or without the scheme", () => {
    expect(redirectSystemPath({ path: "kinwoo://join/ABC234", initial: true })).toBe(
      "/join/ABC234",
    );
    expect(redirectSystemPath({ path: "/join/ABC234?ref=x", initial: false })).toBe("/join/ABC234");
    expect(redirectSystemPath({ path: "join/ABC234", initial: false })).toBe("/join/ABC234");
  });

  it("still swallows the auth callback", () => {
    expect(redirectSystemPath({ path: "kinwoo://auth/callback?code=1", initial: true })).toBe("/");
    expect(
      redirectSystemPath({ path: "kinwoo://auth/callback?code=1", initial: false }),
    ).toBeNull();
  });

  it("leaves other paths alone", () => {
    expect(redirectSystemPath({ path: "/profile", initial: false })).toBe("/profile");
    expect(redirectSystemPath({ path: "/joined/x", initial: false })).toBe("/joined/x");
  });
});

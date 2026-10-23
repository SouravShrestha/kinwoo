import { describe, expect, it } from "vitest";

import { installKind } from "./install-prompt";

const base = { standalone: false, hasPrompt: false, ios: false, android: false };

describe("installKind", () => {
  it("hides the option once installed", () => {
    expect(installKind({ ...base, standalone: true, hasPrompt: true, ios: true })).toBe("none");
  });

  it("uses the native prompt when the browser offered one", () => {
    expect(installKind({ ...base, hasPrompt: true })).toBe("native");
  });

  it("prefers the Play Store over the native prompt on Android", () => {
    expect(installKind({ ...base, hasPrompt: true, android: true })).toBe("android");
  });

  it("falls back to manual steps on iOS, which has no prompt", () => {
    expect(installKind({ ...base, ios: true })).toBe("ios");
  });

  it("links Android browsers to the Play Store", () => {
    expect(installKind({ ...base, android: true })).toBe("android");
  });

  it("offers nothing where install is unsupported", () => {
    expect(installKind(base)).toBe("none");
  });
});

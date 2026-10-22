import { describe, expect, it } from "vitest";

import { installKind } from "./install-prompt";

describe("installKind", () => {
  it("hides the option once installed", () => {
    expect(installKind({ standalone: true, hasPrompt: true, ios: true })).toBe("none");
  });

  it("uses the native prompt when the browser offered one", () => {
    expect(installKind({ standalone: false, hasPrompt: true, ios: false })).toBe("native");
  });

  it("falls back to manual steps on iOS, which has no prompt", () => {
    expect(installKind({ standalone: false, hasPrompt: false, ios: true })).toBe("ios");
  });

  it("offers nothing where install is unsupported", () => {
    expect(installKind({ standalone: false, hasPrompt: false, ios: false })).toBe("none");
  });
});

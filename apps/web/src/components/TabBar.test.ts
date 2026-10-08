import { describe, expect, it } from "vitest";
import { TABS, activeTabFor } from "@kinwoo/core/app";

/**
 * The tab bar renders straight from the shared config, so what is worth testing
 * is that every tab resolves to itself. A mismatch here means a route exists
 * with no way to show it as active.
 */
describe("tab bar routing", () => {
  it("resolves every configured tab from its own href", () => {
    for (const tab of TABS) {
      expect(activeTabFor(tab.href), tab.href).toBe(tab.key);
    }
  });

  it("shows no tab as active on the login route", () => {
    expect(activeTabFor("/login")).toBeNull();
  });
});

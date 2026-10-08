import { describe, expect, it } from "vitest";

import { TABS, activeTabFor } from "./tabs";

describe("TABS", () => {
  it("has unique keys and hrefs", () => {
    expect(new Set(TABS.map((t) => t.key)).size).toBe(TABS.length);
    expect(new Set(TABS.map((t) => t.href)).size).toBe(TABS.length);
  });

  it("gives every tab a label", () => {
    for (const tab of TABS) expect(tab.label.length).toBeGreaterThan(0);
  });
});

describe("activeTabFor", () => {
  it("matches each tab's own route", () => {
    expect(activeTabFor("/")).toBe("home");
    expect(activeTabFor("/tasks")).toBe("tasks");
    expect(activeTabFor("/bills")).toBe("bills");
    expect(activeTabFor("/profile")).toBe("profile");
  });

  it("matches nested routes to their parent tab", () => {
    expect(activeTabFor("/profile/personal")).toBe("profile");
    expect(activeTabFor("/bills/2026/january")).toBe("bills");
  });

  it("does not let home claim every route", () => {
    expect(activeTabFor("/tasks")).not.toBe("home");
  });

  it("does not match on a shared prefix", () => {
    expect(activeTabFor("/billsomething")).toBeNull();
    expect(activeTabFor("/profiles")).toBeNull();
  });

  it("ignores a trailing slash", () => {
    expect(activeTabFor("/profile/")).toBe("profile");
    expect(activeTabFor("/")).toBe("home");
  });

  it("returns null for routes outside the navigation", () => {
    expect(activeTabFor("/login")).toBeNull();
    expect(activeTabFor("/legal/privacy")).toBeNull();
  });
});

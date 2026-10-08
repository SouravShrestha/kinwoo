import { describe, expect, it } from "vitest";

import { SUPPORT_EMAIL, supportMailtoFor } from "./facts";

describe("supportMailtoFor", () => {
  it("addresses the support inbox and embeds version and device", () => {
    const url = supportMailtoFor({ version: "1.2.3", device: "Pixel 9" });
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    const body = decodeURIComponent(url.split("body=")[1]);
    expect(body).toContain("Version: 1.2.3");
    expect(body).toContain("Device: Pixel 9");
  });

  it("uses a custom subject when given", () => {
    const url = supportMailtoFor({ version: "1", device: "x", subject: "Hello there" });
    expect(url).toContain("subject=Hello%20there");
  });
});

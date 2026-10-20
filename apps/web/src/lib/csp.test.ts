import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, createNonce } from "./csp";

describe("buildContentSecurityPolicy", () => {
  it("trusts scripts by nonce only", () => {
    const scriptSrc = buildContentSecurityPolicy("abc")
      .split("; ")
      .find((directive) => directive.startsWith("script-src"));

    expect(scriptSrc).toContain("'nonce-abc'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("issues a different nonce each time", () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});

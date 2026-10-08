import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildRedirectUrl, resolveOrigin, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps same-site paths, including query and fragment", () => {
    expect(safeNextPath("/profile")).toBe("/profile");
    expect(safeNextPath("/profile?tab=settings")).toBe("/profile?tab=settings");
    expect(safeNextPath("/profile#top")).toBe("/profile#top");
  });

  it("falls back to / for missing values", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("rejects absolute URLs", () => {
    expect(safeNextPath("https://evil.example/steal")).toBe("/");
    expect(safeNextPath("http://evil.example")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath("data:text/html,<script>")).toBe("/");
  });

  it("rejects protocol-relative paths, which the browser treats as off-site", () => {
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("//evil.example/path")).toBe("/");
  });

  it("rejects backslashes, which some clients normalise to a slash", () => {
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("\\\\evil.example")).toBe("/");
    expect(safeNextPath("/path\\to")).toBe("/");
  });

  it("rejects control characters used to split headers", () => {
    expect(safeNextPath("/path\nLocation: https://evil.example")).toBe("/");
    expect(safeNextPath("/path\r\n")).toBe("/");
    expect(safeNextPath("/path\u0000")).toBe("/");
  });

  it("rejects paths that would loop back into the auth flow", () => {
    expect(safeNextPath("/auth")).toBe("/");
    expect(safeNextPath("/auth/callback")).toBe("/");
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath("/login/email")).toBe("/");
  });

  it("does not reject paths that merely start with the same letters", () => {
    expect(safeNextPath("/authors")).toBe("/authors");
    expect(safeNextPath("/logins-report")).toBe("/logins-report");
  });

  it("rejects paths long enough to be an attack rather than a route", () => {
    expect(safeNextPath(`/${"a".repeat(512)}`)).toBe("/");
  });
});

describe("resolveOrigin", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.EXPO_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
  });

  it("prefers the configured site URL over the request origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://kinwoo.cbsdev.me";
    expect(resolveOrigin({ url: "https://internal.worker/auth/callback" })).toBe(
      "https://kinwoo.cbsdev.me",
    );
  });

  it("strips trailing slashes from the configured value", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://kinwoo.cbsdev.me///";
    expect(resolveOrigin({ url: "https://internal.worker/" })).toBe("https://kinwoo.cbsdev.me");
  });

  it("falls back to the request origin when unconfigured", () => {
    expect(resolveOrigin({ url: "http://localhost:3000/auth/callback?code=abc" })).toBe(
      "http://localhost:3000",
    );
  });
});

describe("buildRedirectUrl", () => {
  it("joins the origin and path", () => {
    expect(buildRedirectUrl("https://kinwoo.cbsdev.me", "/profile")).toBe(
      "https://kinwoo.cbsdev.me/profile",
    );
  });

  it("appends the error code when given one", () => {
    expect(buildRedirectUrl("https://kinwoo.cbsdev.me", "/", "exchange_failed")).toBe(
      "https://kinwoo.cbsdev.me/?auth_error=exchange_failed",
    );
  });

  it("sanitises the path it is handed", () => {
    expect(buildRedirectUrl("https://kinwoo.cbsdev.me", "https://evil.example")).toBe(
      "https://kinwoo.cbsdev.me/",
    );
  });
});

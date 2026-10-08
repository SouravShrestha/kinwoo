import { describe, expect, it } from "vitest";

import { isPublicRoute } from "./public-routes";

describe("isPublicRoute", () => {
  it("treats the listed routes and their children as public", () => {
    expect(isPublicRoute("/login")).toBe(true);
    expect(isPublicRoute("/login/email")).toBe(true);
    expect(isPublicRoute("/legal")).toBe(true);
    expect(isPublicRoute("/legal/privacy")).toBe(true);
    expect(isPublicRoute("/auth/callback")).toBe(true);
  });

  it("treats everything else as private", () => {
    expect(isPublicRoute("/")).toBe(false);
    expect(isPublicRoute("/profile")).toBe(false);
  });

  it("does not match on a shared prefix", () => {
    expect(isPublicRoute("/logins")).toBe(false);
    expect(isPublicRoute("/legalese")).toBe(false);
  });
});

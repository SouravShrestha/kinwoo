import { describe, expect, it } from "vitest";

import { parseCookieHeader } from "./cookies";

describe("parseCookieHeader", () => {
  it("returns nothing for an absent header", () => {
    expect(parseCookieHeader(null)).toEqual([]);
    expect(parseCookieHeader(undefined)).toEqual([]);
    expect(parseCookieHeader("")).toEqual([]);
  });

  it("parses a single pair", () => {
    expect(parseCookieHeader("sb-access-token=abc")).toEqual([
      { name: "sb-access-token", value: "abc" },
    ]);
  });

  it("parses multiple pairs and trims surrounding space", () => {
    expect(parseCookieHeader("a=1; b=2 ;  c=3")).toEqual([
      { name: "a", value: "1" },
      { name: "b", value: "2" },
      { name: "c", value: "3" },
    ]);
  });

  it("keeps base64 padding by splitting on the first = only", () => {
    expect(parseCookieHeader("sb-auth-token=eyJhbGciOiJIUzI1NiJ9==")).toEqual([
      { name: "sb-auth-token", value: "eyJhbGciOiJIUzI1NiJ9==" },
    ]);
  });

  it("keeps a value that itself contains = signs", () => {
    expect(parseCookieHeader("token=a=b=c")).toEqual([{ name: "token", value: "a=b=c" }]);
  });

  it("handles Supabase's chunked auth cookies", () => {
    expect(parseCookieHeader("sb-xyz-auth-token.0=part0==; sb-xyz-auth-token.1=part1==")).toEqual([
      { name: "sb-xyz-auth-token.0", value: "part0==" },
      { name: "sb-xyz-auth-token.1", value: "part1==" },
    ]);
  });

  it("skips malformed segments rather than inventing a pair", () => {
    expect(parseCookieHeader("bare; =novalue; a=1")).toEqual([{ name: "a", value: "1" }]);
  });

  it("tolerates empty values", () => {
    expect(parseCookieHeader("a=; b=2")).toEqual([
      { name: "a", value: "" },
      { name: "b", value: "2" },
    ]);
  });

  it("percent-decodes values", () => {
    expect(parseCookieHeader("next=%2Fprofile%3Ftab%3D1")).toEqual([
      { name: "next", value: "/profile?tab=1" },
    ]);
  });

  it("falls back to the raw value when a percent escape is malformed", () => {
    expect(parseCookieHeader("broken=%E0%A4%A")).toEqual([{ name: "broken", value: "%E0%A4%A" }]);
  });
});

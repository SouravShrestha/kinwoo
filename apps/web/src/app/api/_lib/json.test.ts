import { describe, expect, it } from "vitest";

import { MAX_JSON_BODY_BYTES, readJsonObject } from "./json";

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://kinwoo.test/api", { method: "POST", body, headers });

describe("readJsonObject", () => {
  it("returns a JSON object", async () => {
    expect(await readJsonObject(post('{"a":1}'))).toEqual({ a: 1 });
  });

  it.each(["null", "[1]", '"text"', "{oops"])("rejects %s", async (body) => {
    expect(await readJsonObject(post(body))).toBeNull();
  });

  it("rejects a body over the limit by its declared length", async () => {
    const request = post("{}", { "content-length": String(MAX_JSON_BODY_BYTES + 1) });
    expect(await readJsonObject(request)).toBeNull();
  });

  it("rejects a body over the limit without a declared length", async () => {
    const big = JSON.stringify({ a: "x".repeat(MAX_JSON_BODY_BYTES) });
    expect(await readJsonObject(post(big))).toBeNull();
  });
});

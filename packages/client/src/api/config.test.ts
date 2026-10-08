import { describe, expect, it } from "vitest";

import { configureApiClient, getApiConfig } from "./config";

describe("api config", () => {
  it("strips trailing slashes from the base url", () => {
    configureApiClient({ baseUrl: "https://example.com//" });
    expect(getApiConfig().baseUrl).toBe("https://example.com");
  });
});

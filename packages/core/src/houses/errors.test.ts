import { describe, expect, it } from "vitest";

import {
  GENERIC_HOUSE_ERROR,
  HOUSE_ERROR_CODES,
  houseErrorMessage,
  inviteFailureCopy,
  parseRpcError,
} from "./errors";

describe("houseErrorMessage", () => {
  it("has specific copy for every known code", () => {
    for (const code of HOUSE_ERROR_CODES) {
      expect(houseErrorMessage(code)).not.toBe(GENERIC_HOUSE_ERROR);
    }
  });

  it("falls back for unknown or missing codes", () => {
    expect(houseErrorMessage("SOMETHING_ELSE")).toBe(GENERIC_HOUSE_ERROR);
    expect(houseErrorMessage(null)).toBe(GENERIC_HOUSE_ERROR);
    expect(houseErrorMessage(undefined)).toBe(GENERIC_HOUSE_ERROR);
  });
});

describe("parseRpcError", () => {
  it("recognises a bare code", () => {
    expect(parseRpcError("LAST_ADMIN")).toBe("LAST_ADMIN");
    expect(parseRpcError("  RATE_LIMITED\n")).toBe("RATE_LIMITED");
  });

  it("returns null for anything else", () => {
    expect(parseRpcError("permission denied for table house_members")).toBeNull();
    expect(parseRpcError("")).toBeNull();
    expect(parseRpcError(null)).toBeNull();
  });
});

describe("inviteFailureCopy", () => {
  it("has a title and message for each failure", () => {
    for (const status of ["invalid", "not_invited", "full", "house_limit"] as const) {
      const copy = inviteFailureCopy(status);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.message.length).toBeGreaterThan(0);
    }
  });
});

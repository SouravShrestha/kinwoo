import { describe, expect, it } from "vitest";

import { JOIN_MODE_OPTIONS, joinModeOption, parseInvitePreview, parseJoinResult } from "./invites";

describe("parseInvitePreview", () => {
  it("maps a valid preview", () => {
    const preview = parseInvitePreview({
      status: "valid",
      house_id: "h1",
      name: "Flat",
      address: "1 High St",
      member_count: 3,
      members: [
        { name: "Asha", avatar_url: null },
        { name: null, avatar_url: "u" },
      ],
      invited_by: "Asha",
      invited_by_avatar_url: "a.png",
      requires_approval: false,
    });

    expect(preview).toEqual({
      status: "valid",
      houseId: "h1",
      name: "Flat",
      address: "1 High St",
      memberCount: 3,
      members: [
        { name: "Asha", avatarUrl: null },
        { name: null, avatarUrl: "u" },
      ],
      invitedBy: "Asha",
      invitedByAvatarUrl: "a.png",
      requiresApproval: false,
    });
  });

  it("passes failure statuses through", () => {
    for (const status of ["invalid", "not_invited", "full", "house_limit"] as const) {
      expect(parseInvitePreview({ status })).toEqual({ status });
    }
  });

  it("treats anything unrecognised as invalid", () => {
    expect(parseInvitePreview(null)).toEqual({ status: "invalid" });
    expect(parseInvitePreview({ status: "mystery" })).toEqual({ status: "invalid" });
    expect(parseInvitePreview({ status: "valid" })).toEqual({ status: "invalid" });
  });
});

describe("parseJoinResult", () => {
  it("maps success statuses with a house id", () => {
    expect(parseJoinResult({ status: "joined", house_id: "h1" })).toEqual({
      status: "joined",
      houseId: "h1",
    });
    expect(parseJoinResult({ status: "already_member", house_id: "h1" })).toEqual({
      status: "already_member",
      houseId: "h1",
    });
  });

  it("passes failure statuses through", () => {
    expect(parseJoinResult({ status: "not_invited" })).toEqual({ status: "not_invited" });
  });

  it("treats a success without a house id as invalid", () => {
    expect(parseJoinResult({ status: "joined" })).toEqual({ status: "invalid" });
    expect(parseJoinResult(undefined)).toEqual({ status: "invalid" });
  });
});

describe("join mode options", () => {
  it("lists restricted first and resolves each mode", () => {
    expect(JOIN_MODE_OPTIONS.map((option) => option.value)).toEqual(["invited", "anyone"]);
    expect(joinModeOption("anyone").label).toBe("Anyone can join");
    expect(joinModeOption("invited").label).toBe("Restricted");
  });
});

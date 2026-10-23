import { describe, expect, it } from "vitest";

import { avatarChoices } from "./avatar-upload";

const PRESETS = ["https://db.test/storage/v1/object/public/avatars/avatar-01.png"];
const OWN = "https://db.test/storage/v1/object/public/uploaded_avatars/u1/abc.jpg";

describe("avatarChoices", () => {
  it("puts the user's own upload first", () => {
    expect(avatarChoices({ id: "u1", avatarUrl: OWN }, PRESETS)).toEqual([OWN, ...PRESETS]);
  });

  it("lists only presets when the current avatar is not an upload", () => {
    expect(avatarChoices({ id: "u1", avatarUrl: PRESETS[0] }, PRESETS)).toEqual(PRESETS);
    expect(avatarChoices({ id: "u1", avatarUrl: null }, PRESETS)).toEqual(PRESETS);
    expect(avatarChoices(null, PRESETS)).toEqual(PRESETS);
  });

  it("ignores another user's upload", () => {
    expect(avatarChoices({ id: "u2", avatarUrl: OWN }, PRESETS)).toEqual(PRESETS);
  });
});

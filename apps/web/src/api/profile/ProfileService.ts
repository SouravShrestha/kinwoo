import { displayNameErrorMessage, validateDisplayName } from "@kinwoo/core/auth";
import { isPushType } from "@kinwoo/core/push";

import { serviceResults } from "../_shared/result";
import type { IProfileRepository, Profile, ProfilePreferences } from "./IProfileRepository";
import type { IProfileService, ProfileResult, ProfileServiceErrorCode } from "./IProfileService";

const VALID_THEMES = new Set(["light", "dark", "system"]);
const LOCALE_PATTERN = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/;

const MESSAGES: Record<ProfileServiceErrorCode, string> = {
  INVALID_INPUT: "Check the details and try again.",
  NOT_FOUND: "Profile not found",
  UNAVAILABLE: "Could not load the profile",
};

// The repository throws plain errors; none map to a specific code.
const { ok, failure, invalidInput, run } = serviceResults<ProfileServiceErrorCode>({
  messageFor: (code) => MESSAGES[code],
  codeOf: () => null,
  invalidInputCode: "INVALID_INPUT",
  unavailableCode: "UNAVAILABLE",
});

const found = (profile: Profile | null): ProfileResult =>
  profile ? ok(profile) : failure("NOT_FOUND");

export class ProfileService implements IProfileService {
  constructor(private readonly repository: IProfileRepository) {}

  async getProfile(userId: string): Promise<ProfileResult> {
    const result = await run(async () => {
      const profile = await this.repository.findById(userId);
      if (!profile || profile.avatarUrl) return profile;
      return this.withAvatar(profile);
    });
    return result.ok ? found(result.data) : result;
  }

  // Never fails the profile load: without a default avatar the clients fall back to a placeholder.
  private async withAvatar(profile: Profile): Promise<Profile> {
    try {
      const presets = await this.repository.listAvatarUrls();
      const pick = presets[Math.floor(Math.random() * presets.length)];
      if (!pick) return profile;

      // Conditional on the column still being empty, so two concurrent loads settle on one avatar.
      const updated = await this.repository.setAvatarUrlIfMissing(profile.id, pick);
      return updated ?? (await this.repository.findById(profile.id)) ?? profile;
    } catch {
      return profile;
    }
  }

  async setDisplayName(userId: string, input: string): Promise<ProfileResult> {
    // Validated before the write so a name the client accepts can never be
    // rejected by the matching database constraint.
    const name = validateDisplayName(input);
    if (!name.ok) return invalidInput(displayNameErrorMessage(name.error));

    const result = await run(() => this.repository.updateDisplayName(userId, name.value));
    return result.ok ? found(result.data) : result;
  }

  async setPreferences(userId: string, preferences: ProfilePreferences): Promise<ProfileResult> {
    const invalid = validatePreferences(preferences);
    if (invalid) return invalidInput(invalid);

    const result = await run(() => this.repository.updatePreferences(userId, preferences));
    return result.ok ? found(result.data) : result;
  }

  async listAvatars(): Promise<ProfileResult<string[]>> {
    return run(() => this.repository.listAvatarUrls());
  }

  async setAvatar(userId: string, avatarUrl: string): Promise<ProfileResult> {
    // Only a URL we list ourselves, or a file in the user's own upload folder, is stored, so a
    // client cannot point a profile at an arbitrary image. The database checks the file exists.
    if (!this.repository.isOwnUpload(userId, avatarUrl)) {
      const avatars = await run(() => this.repository.listAvatarUrls());
      if (!avatars.ok) return avatars;
      if (!avatars.data.includes(avatarUrl)) {
        return invalidInput("Choose one of the available avatars.");
      }
    }

    const result = await run(() => this.repository.updateAvatarUrl(userId, avatarUrl));
    return result.ok ? found(result.data) : result;
  }
}

function validatePreferences(preferences: ProfilePreferences): string | null {
  if (preferences.theme !== undefined && !VALID_THEMES.has(preferences.theme)) {
    return "Choose light, dark or system.";
  }

  if (
    preferences.locale !== undefined &&
    (typeof preferences.locale !== "string" || !LOCALE_PATTERN.test(preferences.locale))
  ) {
    return "That is not a supported language code.";
  }

  if (
    preferences.notificationsEnabled !== undefined &&
    typeof preferences.notificationsEnabled !== "boolean"
  ) {
    return "Notifications must be on or off.";
  }

  if (
    preferences.mutedPushTypes !== undefined &&
    !(Array.isArray(preferences.mutedPushTypes) && preferences.mutedPushTypes.every(isPushType))
  ) {
    return "Choose from the notification types listed.";
  }

  return null;
}

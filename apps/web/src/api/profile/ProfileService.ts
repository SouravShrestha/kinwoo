import { displayNameErrorMessage, validateDisplayName } from "@kinwoo/core/auth";

import type { IProfileRepository, ProfilePreferences } from "./IProfileRepository";
import type { IProfileService, ProfileResult } from "./IProfileService";

const VALID_THEMES = new Set(["light", "dark", "system"]);
const LOCALE_PATTERN = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/;

export class ProfileService implements IProfileService {
  constructor(private readonly repository: IProfileRepository) {}

  async getProfile(userId: string): Promise<ProfileResult> {
    try {
      const profile = await this.repository.findById(userId);
      return profile ? { status: "ok", profile } : { status: "not-found" };
    } catch {
      return { status: "error" };
    }
  }

  async setDisplayName(userId: string, input: string): Promise<ProfileResult> {
    // Validated before the write so a name the client accepts can never be
    // rejected by the matching database constraint.
    const result = validateDisplayName(input);
    if (!result.ok) return { status: "invalid", message: displayNameErrorMessage(result.error) };

    try {
      const profile = await this.repository.updateDisplayName(userId, result.value);
      return profile ? { status: "ok", profile } : { status: "not-found" };
    } catch {
      return { status: "error" };
    }
  }

  async setPreferences(userId: string, preferences: ProfilePreferences): Promise<ProfileResult> {
    const invalid = validatePreferences(preferences);
    if (invalid) return { status: "invalid", message: invalid };

    try {
      const profile = await this.repository.updatePreferences(userId, preferences);
      return profile ? { status: "ok", profile } : { status: "not-found" };
    } catch {
      return { status: "error" };
    }
  }
}

function validatePreferences(preferences: ProfilePreferences): string | null {
  if (preferences.theme !== undefined && !VALID_THEMES.has(preferences.theme)) {
    return "Choose light, dark or system.";
  }

  if (preferences.locale !== undefined && !LOCALE_PATTERN.test(preferences.locale)) {
    return "That is not a supported language code.";
  }

  if (
    preferences.notificationsEnabled !== undefined &&
    typeof preferences.notificationsEnabled !== "boolean"
  ) {
    return "Notifications must be on or off.";
  }

  return null;
}

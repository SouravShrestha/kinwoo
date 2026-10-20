import { displayNameErrorMessage, validateDisplayName } from "@kinwoo/core/auth";

import type { IProfileRepository, Profile, ProfilePreferences } from "./IProfileRepository";
import type { AvatarListResult, IProfileService, ProfileResult } from "./IProfileService";
import { normaliseSocialAvatar } from "./socialAvatar";

const VALID_THEMES = new Set(["light", "dark", "system"]);
const LOCALE_PATTERN = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/;

export class ProfileService implements IProfileService {
  constructor(private readonly repository: IProfileRepository) {}

  async getProfile(userId: string, socialAvatarUrl?: string): Promise<ProfileResult> {
    try {
      const profile = await this.repository.findById(userId);
      if (!profile) return { status: "not-found" };

      return {
        status: "ok",
        profile: profile.avatarUrl
          ? profile
          : await this.withAvatar(profile, normaliseSocialAvatar(socialAvatarUrl)),
      };
    } catch {
      return { status: "error" };
    }
  }

  // Never fails the profile load: without a default avatar the clients fall back to a placeholder.
  private async withAvatar(profile: Profile, social: string | null): Promise<Profile> {
    try {
      const presets = social ? [] : await this.repository.listAvatarUrls();
      const pick = social ?? presets[Math.floor(Math.random() * presets.length)];
      if (!pick) return profile;

      // Conditional on the column still being empty, so two concurrent loads settle on one avatar.
      const updated = await this.repository.setAvatarUrlIfMissing(profile.id, pick);
      return updated ?? (await this.repository.findById(profile.id)) ?? profile;
    } catch {
      return profile;
    }
  }

  // The social avatar leads the presets: it is the default, so it is the first choice shown.
  private async selectableAvatars(socialAvatarUrl: string | undefined): Promise<string[]> {
    const social = normaliseSocialAvatar(socialAvatarUrl);
    const presets = await this.repository.listAvatarUrls();
    return social ? [social, ...presets.filter((url) => url !== social)] : presets;
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

  async listAvatars(socialAvatarUrl?: string): Promise<AvatarListResult> {
    try {
      return { status: "ok", avatars: await this.selectableAvatars(socialAvatarUrl) };
    } catch {
      return { status: "error" };
    }
  }

  async setAvatar(
    userId: string,
    avatarUrl: string,
    socialAvatarUrl?: string,
  ): Promise<ProfileResult> {
    try {
      // Only a URL we list ourselves is stored, so a client cannot point a profile at an
      // arbitrary image.
      const avatars = await this.selectableAvatars(socialAvatarUrl);
      if (!avatars.includes(avatarUrl)) {
        return { status: "invalid", message: "Choose one of the available avatars." };
      }

      const profile = await this.repository.updateAvatarUrl(userId, avatarUrl);
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

  return null;
}

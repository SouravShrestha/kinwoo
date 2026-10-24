import type { ServiceResult } from "../_shared/result";
import type { Profile, ProfilePreferences } from "./IProfileRepository";

export type ProfileServiceErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "UNAVAILABLE";

export type ProfileResult<T = Profile> = ServiceResult<T, ProfileServiceErrorCode>;

export interface IProfileService {
  getProfile(userId: string): Promise<ProfileResult>;
  setDisplayName(userId: string, input: string): Promise<ProfileResult>;
  setPreferences(userId: string, preferences: ProfilePreferences): Promise<ProfileResult>;
  listAvatars(socialAvatarUrl?: string): Promise<ProfileResult<string[]>>;
  setAvatar(userId: string, avatarUrl: string, socialAvatarUrl?: string): Promise<ProfileResult>;
}

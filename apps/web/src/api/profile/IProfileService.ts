import type { Profile, ProfilePreferences } from "./IProfileRepository";

export type ProfileResult =
  | { status: "ok"; profile: Profile }
  | { status: "not-found" }
  | { status: "invalid"; message: string }
  | { status: "error" };

export interface IProfileService {
  getProfile(userId: string): Promise<ProfileResult>;
  setDisplayName(userId: string, input: string): Promise<ProfileResult>;
  setPreferences(userId: string, preferences: ProfilePreferences): Promise<ProfileResult>;
}

import type { Profile, ProfilePreferences } from "@kinwoo/core/db";

import { getApiConfig } from "../api/config";
import { apiRequest } from "../api/request";

export type { Profile, ProfilePreferences };

export class ProfileRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProfileRequestError";
  }
}

async function request(path: string, init?: RequestInit): Promise<Profile> {
  const config = getApiConfig();
  const doFetch = config.fetch ?? fetch;
  const authHeaders = config.getAuthHeaders ? await config.getAuthHeaders() : {};

  const response = await doFetch(`${config.baseUrl}${path}`, {
    ...init,
    // Web relies on the session cookie; mobile sends a bearer token instead.
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as {
    profile?: Profile;
    error?: string;
  } | null;

  if (!response.ok || !body?.profile) {
    throw new ProfileRequestError(
      body?.error ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body.profile;
}

export function fetchProfile(): Promise<Profile> {
  return request("/api/profile");
}

export function updateDisplayName(displayName: string): Promise<Profile> {
  return request("/api/profile/display-name", {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  });
}

export async function fetchAvatars(): Promise<string[]> {
  const { avatars } = await apiRequest<{ avatars: string[] }>("/api/profile/avatars");
  return avatars;
}

export async function updateAvatar(avatarUrl: string): Promise<Profile> {
  const { profile } = await apiRequest<{ profile: Profile }>("/api/profile/avatar", {
    method: "PATCH",
    body: { avatarUrl },
  });
  return profile;
}

export function updatePreferences(preferences: ProfilePreferences): Promise<Profile> {
  return request("/api/profile/preferences", {
    method: "PATCH",
    body: JSON.stringify(preferences),
  });
}

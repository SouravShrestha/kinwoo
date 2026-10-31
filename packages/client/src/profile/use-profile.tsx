"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/use-auth";
import { ownUploadPath, pruneAvatars, putAvatar } from "./avatar-upload";
import {
  fetchProfile,
  updateAvatar as patchAvatar,
  updateDisplayName as patchDisplayName,
  updatePreferences as patchPreferences,
  type Profile,
  type ProfilePreferences,
} from "./api";

export interface ProfileContextValue {
  profile: Profile | null;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setDisplayName: (value: string) => Promise<void>;
  setPreferences: (preferences: ProfilePreferences) => Promise<void>;
  setAvatar: (avatarUrl: string) => Promise<void>;
  uploadAvatar: (file: ArrayBuffer | Blob, id: string) => Promise<void>;
  needsDisplayName: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const profileKey = (userId: string) => ["profile", userId] as const;

const messageFor = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Could not load your profile.";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { client, user, isLoggedIn, ready: authReady } = useAuth();
  const queryClient = useQueryClient();

  const userId = user?.id ?? null;
  const profileQuery = useQuery({
    queryKey: profileKey(userId ?? ""),
    queryFn: fetchProfile,
    enabled: authReady && userId !== null,
  });

  const profile = isLoggedIn ? (profileQuery.data ?? null) : null;
  const error = isLoggedIn && profileQuery.error ? messageFor(profileQuery.error) : null;
  const ready = isLoggedIn ? authReady && !profileQuery.isPending : authReady;

  const { refetch } = profileQuery;
  const refresh = useCallback(async () => {
    if (!userId) return;
    await refetch();
  }, [refetch, userId]);

  const setDisplayName = useCallback(
    async (value: string) => {
      const updated = await patchDisplayName(value);
      if (userId) queryClient.setQueryData(profileKey(userId), updated);
    },
    [queryClient, userId],
  );

  const setPreferences = useCallback(
    async (preferences: ProfilePreferences) => {
      const updated = await patchPreferences(preferences);
      if (userId) queryClient.setQueryData(profileKey(userId), updated);
    },
    [queryClient, userId],
  );

  const setAvatar = useCallback(
    async (avatarUrl: string) => {
      const updated = await patchAvatar(avatarUrl);
      if (userId) queryClient.setQueryData(profileKey(userId), updated);
      if (userId) {
        void pruneAvatars(client, userId, ownUploadPath(updated.avatarUrl, userId));
      }
    },
    [client, queryClient, userId],
  );

  const uploadAvatar = useCallback(
    async (file: ArrayBuffer | Blob, id: string) => {
      if (!userId) throw new Error("Not signed in.");
      const uploaded = await putAvatar(client, userId, file, id);
      try {
        await setAvatar(uploaded.path);
      } catch (cause) {
        void pruneAvatars(client, userId, ownUploadPath(profile?.avatarUrl ?? null, userId));
        throw cause;
      }
    },
    [client, userId, profile?.avatarUrl, setAvatar],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      ready,
      error,
      refresh,
      setDisplayName,
      setPreferences,
      setAvatar,
      uploadAvatar,
      needsDisplayName: ready && profile !== null && profile.displayName === null,
    }),
    [profile, ready, error, refresh, setDisplayName, setPreferences, setAvatar, uploadAvatar],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used inside a ProfileProvider.");
  return value;
}

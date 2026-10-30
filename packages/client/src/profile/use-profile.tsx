"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

interface LoadedState {
  // Ties loaded data to its owner so another user's profile is never shown.
  userId: string | null;
  profile: Profile | null;
  error: string | null;
}

const EMPTY: LoadedState = { userId: null, profile: null, error: null };

const messageFor = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Could not load your profile.";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { client, user, isLoggedIn, ready: authReady } = useAuth();
  const [loaded, setLoaded] = useState<LoadedState>(EMPTY);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!authReady || !userId) return;

    // Ignores a response that lands after the user changed or the provider unmounted.
    let active = true;

    void fetchProfile().then(
      (profile) => {
        if (active) setLoaded({ userId, profile, error: null });
      },
      (cause: unknown) => {
        if (active) setLoaded({ userId, profile: null, error: messageFor(cause) });
      },
    );

    return () => {
      active = false;
    };
  }, [authReady, userId]);

  // Derived rather than reset in an effect, so a user switch cannot briefly show
  // the previous user's data.
  const matchesCurrentUser = isLoggedIn && userId !== null && loaded.userId === userId;

  const profile = matchesCurrentUser ? loaded.profile : null;
  const error = matchesCurrentUser ? loaded.error : null;
  const ready = isLoggedIn ? matchesCurrentUser : authReady;

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setLoaded({ userId, profile: await fetchProfile(), error: null });
    } catch (cause) {
      setLoaded({ userId, profile: null, error: messageFor(cause) });
    }
  }, [userId]);

  const setDisplayName = useCallback(
    async (value: string) => {
      const updated = await patchDisplayName(value);
      setLoaded({ userId, profile: updated, error: null });
    },
    [userId],
  );

  const setPreferences = useCallback(
    async (preferences: ProfilePreferences) => {
      const updated = await patchPreferences(preferences);
      setLoaded({ userId, profile: updated, error: null });
    },
    [userId],
  );

  const setAvatar = useCallback(
    async (avatarUrl: string) => {
      const updated = await patchAvatar(avatarUrl);
      setLoaded({ userId, profile: updated, error: null });
      if (userId) {
        void pruneAvatars(client, userId, ownUploadPath(updated.avatarUrl, userId));
      }
    },
    [client, userId],
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

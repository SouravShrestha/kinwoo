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
import {
  fetchProfile,
  updateDisplayName as patchDisplayName,
  updatePreferences as patchPreferences,
  type Profile,
  type ProfilePreferences,
} from "./api";

export interface ProfileContextValue {
  profile: Profile | null;
  /** False until the first load settles, so callers can avoid a flash of empty state. */
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setDisplayName: (value: string) => Promise<void>;
  setPreferences: (preferences: ProfilePreferences) => Promise<void>;
  /** True once we know the user has not finished first-run setup. */
  needsDisplayName: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

interface LoadedState {
  /** Who the loaded data belongs to, so another user's profile is never shown. */
  userId: string | null;
  profile: Profile | null;
  error: string | null;
}

const EMPTY: LoadedState = { userId: null, profile: null, error: null };

const messageFor = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Could not load your profile.";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn, ready: authReady } = useAuth();
  const [loaded, setLoaded] = useState<LoadedState>(EMPTY);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!authReady || !userId) return;

    // Guards against a response landing after the user has changed or the
    // provider has unmounted.
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

  // Derived rather than reset in an effect. Signing out, or signing in as
  // someone else, therefore cannot briefly surface the previous user's data.
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

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      ready,
      error,
      refresh,
      setDisplayName,
      setPreferences,
      needsDisplayName: ready && profile !== null && profile.displayName === null,
    }),
    [profile, ready, error, refresh, setDisplayName, setPreferences],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used inside a ProfileProvider.");
  return value;
}

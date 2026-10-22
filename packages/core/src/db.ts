// Table and RPC shapes come from `npm run db:types`. The types below narrow or rename them for the
// apps. Use `type` aliases, not interfaces: postgrest-js constrains Row to `Record<string, unknown>`
// and interfaces lack an implicit index signature.

export type ThemePreference = "light" | "dark" | "system";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  theme: ThemePreference;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  theme: ThemePreference;
  notificationsEnabled: boolean;
};

export type ProfilePreferences = {
  locale?: string;
  theme?: ThemePreference;
  notificationsEnabled?: boolean;
};

// Inserts come from the handle_new_user trigger, never from a client.
export type ProfileInsert = Pick<ProfileRow, "id"> & Partial<Omit<ProfileRow, "id">>;

// Only the columns the authenticated role holds an UPDATE grant on.
export type ProfileUpdate = Partial<
  Pick<ProfileRow, "display_name" | "avatar_url" | "locale" | "theme" | "notifications_enabled">
>;

export type { Database, Json } from "./database.generated";

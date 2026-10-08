/**
 * Hand-written to match supabase/migrations. Shaped like the Supabase CLI's
 * generated output so it can be replaced by
 * `supabase gen types typescript` without touching call sites.
 *
 * These are `type` aliases, not interfaces, on purpose: postgrest-js constrains
 * a table's Row to `Record<string, unknown>`, and an interface has no implicit
 * index signature. Declaring these as interfaces makes the constraint fail
 * silently and every `.update()` argument resolve to `never`.
 */

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

/** The camelCase shape sent over the wire; snake_case stops at the repository. */
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

/** Inserts come from the handle_new_user trigger, never from a client. */
export type ProfileInsert = Pick<ProfileRow, "id"> & Partial<Omit<ProfileRow, "id">>;

/** Only the columns the authenticated role holds an UPDATE grant on. */
export type ProfileUpdate = Partial<
  Pick<ProfileRow, "display_name" | "avatar_url" | "locale" | "theme" | "notifications_enabled">
>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

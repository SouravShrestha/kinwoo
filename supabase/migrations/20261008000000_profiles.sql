-- One profile row per auth user, created automatically on sign-up.
--
-- display_name starts NULL on purpose: the apps treat NULL as "first login not
-- finished" and show the display-name sheet until it is set. Google sign-ins
-- arrive with a name already, so those users skip the sheet.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text not null default 'en',
  theme text not null default 'system',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_display_name_length check (
    display_name is null or char_length(btrim(display_name)) between 1 and 40
  ),
  constraint profiles_theme_valid check (theme in ('light', 'dark', 'system')),
  constraint profiles_locale_length check (char_length(locale) between 2 and 10)
);

comment on table public.profiles is
  'Per-user profile. Rows are created by the handle_new_user trigger, never by clients.';

alter table public.profiles enable row level security;

-- Supabase grants ALL on public tables to anon and authenticated by default, so
-- tightening means revoking first. The column list on UPDATE is what stops a
-- client rewriting id or created_at.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, locale, theme, notifications_enabled)
  on public.profiles to authenticated;

create policy "Owners can read their profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Owners can update their profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT or DELETE policy. Inserts belong to handle_new_user below, and a
-- profile is deleted only by the cascade from auth.users, so account deletion
-- stays a single operation against the auth schema.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- SECURITY DEFINER because the inserting role during sign-up is not the new
-- user and has no rights on public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    -- Truncated to the column's 40-character limit: an OAuth name longer than
    -- that would trip the check constraint and fail the whole sign-up.
    left(
      nullif(
        btrim(
          coalesce(
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name'
          )
        ),
        ''
      ),
      40
    ),
    nullif(
      btrim(
        coalesce(
          new.raw_user_meta_data ->> 'avatar_url',
          new.raw_user_meta_data ->> 'picture'
        )
      ),
      ''
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

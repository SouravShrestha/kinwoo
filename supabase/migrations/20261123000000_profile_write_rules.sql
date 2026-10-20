-- Clients may update their own profile row through PostgREST with the anon key, so the rules
-- ProfileService applies must hold in the database too. Before this, a direct PATCH could set
-- avatar_url to any URL (rendered by housemates' apps) or put control and bidi characters in a name.

-- An avatar is a preset in the avatars bucket or a Google profile image, matching ProfileService's
-- allow-list and the img-src CSP.
create function public.is_allowed_avatar(p_value text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_value is null
      or p_value like 'https://lh3.googleusercontent.com/%'
      or exists (select 1 from storage.objects o
                  where o.bucket_id = 'avatars' and o.name = p_value);
$$;

revoke all on function public.is_allowed_avatar(text) from public, anon, authenticated;

-- SECURITY DEFINER so the check can read storage.objects regardless of the writer's grants.
create function public.check_profile_avatar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_allowed_avatar(new.avatar_url) then
    raise exception 'INVALID_AVATAR' using errcode = '23514';
  end if;
  return new;
end $$;

-- Only absolute URLs can point elsewhere; bucket paths are left alone even if the object is gone.
update public.profiles
   set avatar_url = null
 where avatar_url ~* '^[a-z][a-z0-9+.-]*:'
   and avatar_url not like 'https://lh3.googleusercontent.com/%';

create trigger profiles_check_avatar
  before insert or update of avatar_url on public.profiles
  for each row
  when (new.avatar_url is not null)
  execute function public.check_profile_avatar();

revoke all on function public.check_profile_avatar() from public, anon, authenticated;

-- Same characters validateDisplayName rejects, plus bidi overrides that can disguise a name.
update public.profiles
   set display_name = nullif(btrim(regexp_replace(
         display_name, '[\u0001-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]', '', 'g')), '')
 where display_name ~ '[\u0001-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]';

alter table public.profiles
  add constraint profiles_display_name_chars
  check (display_name !~ '[\u0001-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]');

update public.profiles set locale = 'en' where locale !~ '^[a-z]{2}(-[A-Za-z0-9]{2,8})?$';

alter table public.profiles
  add constraint profiles_locale_format
  check (locale ~ '^[a-z]{2}(-[A-Za-z0-9]{2,8})?$');

-- Sign-up metadata is user-controlled: keep only a Google avatar and strip characters the name
-- constraint would reject, so a hostile payload cannot fail the sign-up or slip past the rules.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(
    nullif(
      btrim(
        regexp_replace(
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
          '[\u0001-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]', '', 'g'
        )
      ),
      ''
    ),
    40
  );
  v_avatar text := btrim(
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    v_name,
    case when v_avatar like 'https://lh3.googleusercontent.com/%' then v_avatar end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

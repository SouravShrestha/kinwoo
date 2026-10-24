-- Sign-up no longer copies the Google photo into the profile. The profile API gives every user
-- without an avatar a random preset; the Google photo stays available as a choice in the picker.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
begin
  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

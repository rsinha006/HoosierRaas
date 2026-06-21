-- Backfill profiles for auth users that were created before the signup trigger existed.

insert into public.profiles (id, email, full_name, created_at)
select
  u.id,
  lower(u.email),
  nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
  u.created_at
from auth.users u
where u.email is not null
  and not exists (
    select 1
    from public.profiles p
    where p.id = u.id
  );

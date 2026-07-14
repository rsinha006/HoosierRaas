-- User profiles for HROS login account management.
-- profiles may already exist without email; add missing columns before indexing.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists role text,
  add column if not exists roles text[],
  add column if not exists created_at timestamptz not null default now();

-- Backfill email (and name when missing) from auth.users for existing rows.
update public.profiles p
set
  email = lower(u.email),
  full_name = coalesce(
    nullif(trim(p.full_name), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), '')
  )
from auth.users u
where p.id = u.id
  and p.email is null;

create index if not exists profiles_email_idx on public.profiles (lower(email));

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "Exec users can read profiles" on public.profiles;
create policy "Exec users can read profiles"
on public.profiles
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Captain and TM can update profiles" on public.profiles;
create policy "Captain and TM can update profiles"
on public.profiles
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Captain and TM can insert exec access members" on public.members;
create policy "Captain and TM can insert exec access members"
on public.members
for insert
to authenticated
with check (
  public.get_my_exec_title() in ('captain', 'team_manager')
  and 'exec' = any (roles)
  and exec_title in ('captain', 'team_manager', 'finance')
  and pending_review = false
);

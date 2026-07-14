-- When a login profile row is removed, also remove the auth user so the email
-- can be used to sign up again. Auth-user deletion already cascades to profiles;
-- this covers the reverse order (profile deleted first from the dashboard).

create or replace function public.delete_auth_user_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_profile_deleted_delete_auth_user on public.profiles;
create trigger on_profile_deleted_delete_auth_user
  after delete on public.profiles
  for each row execute function public.delete_auth_user_for_profile();

drop policy if exists "Captain and TM can delete pending onboarding members" on public.members;
create policy "Captain and TM can delete pending onboarding members"
on public.members
for delete
to authenticated
using (
  public.get_my_exec_title() in ('captain', 'team_manager')
  and pending_review = true
);

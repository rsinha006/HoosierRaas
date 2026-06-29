-- Fully delete a member and any linked login account in one database operation.

create or replace function public.admin_delete_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  select lower(trim(email))
  into v_email
  from public.members
  where id = p_member_id;

  if v_email is null then
    raise exception 'Member not found';
  end if;

  delete from public.income_entries where member_id = p_member_id;
  delete from auth.users where lower(email) = v_email;
  delete from public.profiles where lower(email) = v_email;
  delete from public.members where id = p_member_id;
end;
$$;

revoke all on function public.admin_delete_member(uuid) from public;
grant execute on function public.admin_delete_member(uuid) to service_role;

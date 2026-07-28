-- admin_delete_member was deleting linked income_entries before removing the
-- member so the dues/member constraint would not block the delete. That silently
-- erased dues and other income history. Preserve finance records by refusing the
-- member delete when linked income exists.
-- Run this in the Supabase SQL Editor.

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

  if exists (
    select 1
    from public.income_entries
    where member_id = p_member_id
  ) then
    raise exception 'member_has_linked_income_entries';
  end if;

  delete from auth.users where lower(email) = v_email;
  delete from public.profiles where lower(email) = v_email;
  delete from public.members where id = p_member_id;
end;
$$;

revoke all on function public.admin_delete_member(uuid) from public;
grant execute on function public.admin_delete_member(uuid) to service_role;

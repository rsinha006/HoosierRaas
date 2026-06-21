-- Keep IUFB spent totals derived from approved expense requests at the database layer.

create or replace function public.sync_iufb_line_item_spent_amount()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old_iufb_line_item_id uuid;
  v_new_iufb_line_item_id uuid;
  v_old_amount numeric(12, 2) := 0;
  v_new_amount numeric(12, 2) := 0;
begin
  if tg_op in ('UPDATE', 'DELETE')
    and old.status = 'approved'
    and old.iufb_line_item_id is not null then
    v_old_iufb_line_item_id := old.iufb_line_item_id;
    v_old_amount := old.amount;
  end if;

  if tg_op in ('INSERT', 'UPDATE')
    and new.status = 'approved'
    and new.iufb_line_item_id is not null then
    v_new_iufb_line_item_id := new.iufb_line_item_id;
    v_new_amount := new.amount;
  end if;

  if v_old_iufb_line_item_id is not null then
    update public.iufb_line_items
    set spent_amount = spent_amount - v_old_amount
    where id = v_old_iufb_line_item_id;

    if not found then
      raise exception 'iufb_line_item_not_found';
    end if;
  end if;

  if v_new_iufb_line_item_id is not null then
    update public.iufb_line_items
    set spent_amount = spent_amount + v_new_amount
    where id = v_new_iufb_line_item_id;

    if not found then
      raise exception 'iufb_line_item_not_found';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_iufb_line_item_spent_amount on public.expense_requests;
create trigger sync_iufb_line_item_spent_amount
after insert or update or delete on public.expense_requests
for each row
execute function public.sync_iufb_line_item_spent_amount();

update public.iufb_line_items line_item
set spent_amount = coalesce((
  select sum(expense.amount)
  from public.expense_requests expense
  where expense.iufb_line_item_id = line_item.id
    and expense.status = 'approved'
), 0);

create or replace function public.approve_expense_request(
  p_request_id uuid,
  p_reviewer_member_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  if p_reviewer_member_id is distinct from public.get_my_member_id() then
    raise exception 'reviewer_member_mismatch';
  end if;

  update public.expense_requests
  set
    status = 'approved',
    approved_at = now(),
    approved_by_member_id = p_reviewer_member_id,
    denial_reason = null
  where id = p_request_id
    and status = 'pending'
  returning id into v_request_id;

  if not found then
    raise exception 'expense_request_not_pending';
  end if;
end;
$$;

revoke all on function public.sync_iufb_line_item_spent_amount() from public;
revoke all on function public.approve_expense_request(uuid, uuid) from public;
grant execute on function public.approve_expense_request(uuid, uuid) to authenticated;

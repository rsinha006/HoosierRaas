-- Approve expense requests atomically so IUFB spent totals cannot drift.

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
  v_amount numeric(12, 2);
  v_iufb_line_item_id uuid;
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
  returning amount, iufb_line_item_id
  into v_amount, v_iufb_line_item_id;

  if not found then
    raise exception 'expense_request_not_pending';
  end if;

  if v_iufb_line_item_id is not null then
    update public.iufb_line_items
    set spent_amount = spent_amount + v_amount
    where id = v_iufb_line_item_id;

    if not found then
      raise exception 'iufb_line_item_not_found';
    end if;
  end if;
end;
$$;

revoke all on function public.approve_expense_request(uuid, uuid) from public;
grant execute on function public.approve_expense_request(uuid, uuid) to authenticated;

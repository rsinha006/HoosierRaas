-- Deleting an IUFB line item that has expense requests currently nulls out the
-- request funding source via the FK's ON DELETE SET NULL, which silently loses the
-- envelope/accounting link. Keep the historical link intact and require finance to
-- resolve or move requests before removing a line item.

create or replace function public.block_iufb_line_item_delete_with_expenses()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.expense_requests
    where iufb_line_item_id = old.id
  ) then
    raise exception 'Cannot delete an IUFB line item while expense requests are linked to it.';
  end if;

  return old;
end;
$$;

drop trigger if exists iufb_line_items_block_delete_with_expenses on public.iufb_line_items;
create trigger iufb_line_items_block_delete_with_expenses
before delete on public.iufb_line_items
for each row
execute function public.block_iufb_line_item_delete_with_expenses();

revoke all on function public.block_iufb_line_item_delete_with_expenses() from public;

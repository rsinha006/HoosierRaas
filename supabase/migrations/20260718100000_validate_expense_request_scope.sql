-- Expense requests can be submitted from public RPCs and authenticated clients, so
-- enforce season-scoped funding references at the database boundary.

create or replace function public.validate_expense_request_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and new.status <> 'approved'
    and new.season is not distinct from old.season
    and new.category is not distinct from old.category
    and new.iufb_line_item_id is not distinct from old.iufb_line_item_id
    and new.competition_id is not distinct from old.competition_id
  then
    return new;
  end if;

  if new.category is not null and not exists (
    select 1
    from public.budgets b
    where b.season = new.season
      and b.category = new.category
      and b.allocated_amount > 0
  ) then
    raise exception 'expense_category_not_funded_for_season';
  end if;

  if new.iufb_line_item_id is not null and not exists (
    select 1
    from public.iufb_line_items li
    where li.id = new.iufb_line_item_id
      and li.season = new.season
      and li.approved_amount > 0
  ) then
    raise exception 'iufb_line_item_not_funded_for_season';
  end if;

  if new.competition_id is not null and not exists (
    select 1
    from public.competitions c
    where c.id = new.competition_id
      and c.season = new.season
  ) then
    raise exception 'competition_not_in_request_season';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_expense_request_scope on public.expense_requests;
create trigger validate_expense_request_scope
before insert or update on public.expense_requests
for each row
execute function public.validate_expense_request_scope();

revoke all on function public.validate_expense_request_scope() from public;

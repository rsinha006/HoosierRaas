-- "Hard cutoff" deadlines were purely a display badge — nothing stopped an exec
-- from checking one off as complete after its due date had passed, even though a
-- hard cutoff is supposed to mean the requirement is genuinely no longer possible.
-- The UI now blocks this too, but enforce it at the database level so it can't be
-- bypassed by calling the API directly.
-- Run this in the Supabase SQL Editor.

create or replace function public.block_late_hard_cutoff_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'complete'
    and old.status <> 'complete'
    and new.is_hard_cutoff
    and new.due_date is not null
    and new.due_date < current_date
  then
    raise exception 'This deadline is a hard cutoff and its due date has passed — it can no longer be marked complete.';
  end if;

  return new;
end;
$$;

drop trigger if exists deadlines_block_late_hard_cutoff on public.deadlines;
create trigger deadlines_block_late_hard_cutoff
before update on public.deadlines
for each row
execute function public.block_late_hard_cutoff_completion();

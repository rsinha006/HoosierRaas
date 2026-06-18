-- Link expense requests to IUFB line items and allow IUFB-only submissions.

alter table public.expense_requests
  add column if not exists iufb_line_item_id uuid references public.iufb_line_items (id) on delete set null;

alter table public.expense_requests
  alter column category drop not null;

alter table public.expense_requests drop constraint if exists expense_requests_funding_target;

alter table public.expense_requests
  add constraint expense_requests_funding_target check (
    (
      iufb_line_item_id is null
      and category is not null
    )
    or (
      iufb_line_item_id is not null
      and category is null
    )
  );

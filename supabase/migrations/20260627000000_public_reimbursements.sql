-- Public reimbursement submissions from team members without portal access.

alter table public.reimbursements
  alter column submitted_by_member_id drop not null;

alter table public.reimbursements
  add column if not exists submitter_name text,
  add column if not exists submitter_email text;

alter table public.reimbursements drop constraint if exists reimbursement_submitter_identity;

alter table public.reimbursements
  add constraint reimbursement_submitter_identity check (
    (
      submitted_by_member_id is not null
      and submitter_name is null
      and submitter_email is null
    )
    or (
      submitted_by_member_id is null
      and submitter_name is not null
      and submitter_email is not null
    )
  );

drop policy if exists "Exec users can submit reimbursements" on public.reimbursements;
drop policy if exists "Public can submit reimbursements" on public.reimbursements;

create policy "Public can submit reimbursements"
on public.reimbursements
for insert
to anon, authenticated
with check (
  status = 'pending'
  and submitted_by_member_id is null
  and submitter_name is not null
  and submitter_email is not null
  and payment_method is null
  and payment_timestamp is null
  and paid_by_member_id is null
);

drop policy if exists "Allow public reimbursement receipt uploads" on storage.objects;
create policy "Allow public reimbursement receipt uploads"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = 'submissions'
);

drop policy if exists "Public can read competitions for forms" on public.competitions;
create policy "Public can read competitions for forms"
on public.competitions
for select
to anon, authenticated
using (true);

grant insert on public.reimbursements to anon;

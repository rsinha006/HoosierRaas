-- Allow dues income entries without a linked member.

alter table public.income_entries
  drop constraint if exists dues_requires_member;

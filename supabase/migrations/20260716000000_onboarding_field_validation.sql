-- The onboarding form's "required" validation (first/last name, phone, emergency
-- contact) only lived in client-side JS. Someone bypassing the form and inserting
-- directly through the public anon policy could submit blank/whitespace-only values.
-- These checks allow null (exec-added members don't always set every field) but
-- reject blank or whitespace-only text where a value is present.
-- Run this in the Supabase SQL Editor.

alter table public.members drop constraint if exists members_first_name_not_blank;
alter table public.members
  add constraint members_first_name_not_blank
  check (first_name is null or length(btrim(first_name)) > 0);

alter table public.members drop constraint if exists members_last_name_not_blank;
alter table public.members
  add constraint members_last_name_not_blank
  check (last_name is null or length(btrim(last_name)) > 0);

alter table public.members drop constraint if exists members_phone_not_blank;
alter table public.members
  add constraint members_phone_not_blank
  check (phone is null or length(btrim(phone)) > 0);

alter table public.members drop constraint if exists members_emergency_contact_name_not_blank;
alter table public.members
  add constraint members_emergency_contact_name_not_blank
  check (emergency_contact_name is null or length(btrim(emergency_contact_name)) > 0);

alter table public.members drop constraint if exists members_emergency_contact_phone_not_blank;
alter table public.members
  add constraint members_emergency_contact_phone_not_blank
  check (emergency_contact_phone is null or length(btrim(emergency_contact_phone)) > 0);

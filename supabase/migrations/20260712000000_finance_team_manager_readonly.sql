-- Finance execs can read Team Manager data but only Captain and Team Manager may write.

drop policy if exists "Exec users can insert deadlines" on public.deadlines;
drop policy if exists "Exec users can update deadlines" on public.deadlines;
drop policy if exists "Exec users can delete deadlines" on public.deadlines;
drop policy if exists "Captain and TM can insert deadlines" on public.deadlines;
drop policy if exists "Captain and TM can update deadlines" on public.deadlines;
drop policy if exists "Captain and TM can delete deadlines" on public.deadlines;

create policy "Captain and TM can insert deadlines"
on public.deadlines
for insert
to authenticated
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

create policy "Captain and TM can update deadlines"
on public.deadlines
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

create policy "Captain and TM can delete deadlines"
on public.deadlines
for delete
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Exec users can insert fees" on public.fees;
drop policy if exists "Exec users can update fees" on public.fees;
drop policy if exists "Exec users can delete fees" on public.fees;
drop policy if exists "Captain and TM can insert fees" on public.fees;
drop policy if exists "Captain and TM can update fees" on public.fees;
drop policy if exists "Captain and TM can delete fees" on public.fees;

create policy "Captain and TM can insert fees"
on public.fees
for insert
to authenticated
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

create policy "Captain and TM can update fees"
on public.fees
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

create policy "Captain and TM can delete fees"
on public.fees
for delete
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'));

create or replace function public.save_competition_packet_data(
  p_competition_id uuid,
  p_roster_min integer,
  p_roster_max integer,
  p_per_person_registration_cost numeric,
  p_min_performance_duration integer,
  p_max_performance_duration integer,
  p_mix_format text,
  p_tech_rehearsal_required boolean,
  p_deadlines jsonb default '[]'::jsonb,
  p_fees jsonb default '[]'::jsonb,
  p_contacts jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_competition_id uuid;
  v_deadline record;
begin
  if public.get_my_exec_title() not in ('captain', 'team_manager') then
    raise exception 'not_authorized';
  end if;

  if jsonb_typeof(coalesce(p_deadlines, '[]'::jsonb)) <> 'array' then
    raise exception 'deadlines_payload_must_be_array';
  end if;

  if jsonb_typeof(coalesce(p_fees, '[]'::jsonb)) <> 'array' then
    raise exception 'fees_payload_must_be_array';
  end if;

  if jsonb_typeof(coalesce(p_contacts, '[]'::jsonb)) <> 'array' then
    raise exception 'contacts_payload_must_be_array';
  end if;

  update public.competitions
  set
    status = 'active',
    roster_min = p_roster_min,
    roster_max = p_roster_max,
    per_person_registration_cost = p_per_person_registration_cost,
    min_performance_duration = p_min_performance_duration,
    max_performance_duration = p_max_performance_duration,
    mix_format = nullif(trim(coalesce(p_mix_format, '')), ''),
    tech_rehearsal_required = p_tech_rehearsal_required
  where id = p_competition_id
  returning id into v_competition_id;

  if v_competition_id is null then
    raise exception 'competition_not_found_or_not_authorized';
  end if;

  for v_deadline in
    select *
    from jsonb_to_recordset(coalesce(p_deadlines, '[]'::jsonb)) as deadline_payload(
      id uuid,
      name text,
      due_date date,
      fine_amount numeric,
      is_hard_cutoff boolean,
      status text,
      completed_at timestamptz
    )
  loop
    if nullif(trim(coalesce(v_deadline.name, '')), '') is null then
      continue;
    end if;

    if v_deadline.status not in ('pending', 'complete') then
      raise exception 'invalid_deadline_status';
    end if;

    if v_deadline.id is null then
      insert into public.deadlines (
        competition_id,
        name,
        due_date,
        fine_amount,
        is_hard_cutoff,
        status,
        completed_at
      )
      values (
        p_competition_id,
        trim(v_deadline.name),
        v_deadline.due_date,
        v_deadline.fine_amount,
        coalesce(v_deadline.is_hard_cutoff, false),
        v_deadline.status,
        v_deadline.completed_at
      );
    else
      update public.deadlines
      set
        name = trim(v_deadline.name),
        due_date = v_deadline.due_date,
        fine_amount = v_deadline.fine_amount,
        is_hard_cutoff = coalesce(v_deadline.is_hard_cutoff, false)
      where id = v_deadline.id
        and competition_id = p_competition_id;

      if not found then
        raise exception 'deadline_not_found_or_not_authorized';
      end if;
    end if;
  end loop;

  delete from public.fees
  where competition_id = p_competition_id;

  insert into public.fees (
    competition_id,
    name,
    amount,
    is_per_person,
    is_refundable,
    due_date
  )
  select
    p_competition_id,
    trim(fee_payload.name),
    coalesce(fee_payload.amount, 0),
    coalesce(fee_payload.is_per_person, false),
    coalesce(fee_payload.is_refundable, false),
    fee_payload.due_date
  from jsonb_to_recordset(coalesce(p_fees, '[]'::jsonb)) as fee_payload(
    name text,
    amount numeric,
    is_per_person boolean,
    is_refundable boolean,
    due_date date
  )
  where nullif(trim(coalesce(fee_payload.name, '')), '') is not null;

  delete from public.competition_contacts
  where competition_id = p_competition_id;

  insert into public.competition_contacts (
    competition_id,
    name,
    role,
    email,
    phone,
    sort_order
  )
  select
    p_competition_id,
    trim(contact_payload.name),
    nullif(trim(coalesce(contact_payload.role, '')), ''),
    nullif(trim(coalesce(contact_payload.email, '')), ''),
    nullif(trim(coalesce(contact_payload.phone, '')), ''),
    contact_payload.sort_order
  from jsonb_to_recordset(coalesce(p_contacts, '[]'::jsonb)) as contact_payload(
    name text,
    role text,
    email text,
    phone text,
    sort_order integer
  )
  where nullif(trim(coalesce(contact_payload.name, '')), '') is not null;
end;
$$;

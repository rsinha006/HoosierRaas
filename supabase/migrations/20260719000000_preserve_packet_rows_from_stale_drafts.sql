-- Packet review drafts can live in a browser session while another exec edits the
-- same competition. Limit destructive deletes to rows that were present when the
-- draft was created so saving a stale draft cannot erase newer packet data.
-- Run this in the Supabase SQL Editor.

drop function if exists public.save_competition_packet_data(
  uuid,
  integer,
  integer,
  numeric,
  integer,
  integer,
  text,
  boolean,
  jsonb,
  jsonb,
  jsonb
);

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
  p_contacts jsonb default '[]'::jsonb,
  p_known_deadline_ids uuid[] default null,
  p_known_fee_ids uuid[] default null,
  p_known_contact_ids uuid[] default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_competition_id uuid;
  v_deadline record;
  v_fee record;
  v_contact record;
  v_new_id uuid;
  v_keep_deadline_ids uuid[] := array[]::uuid[];
  v_keep_fee_ids uuid[] := array[]::uuid[];
  v_keep_contact_ids uuid[] := array[]::uuid[];
  v_known_deadline_ids uuid[] := coalesce(p_known_deadline_ids, array[]::uuid[]);
  v_known_fee_ids uuid[] := coalesce(p_known_fee_ids, array[]::uuid[]);
  v_known_contact_ids uuid[] := coalesce(p_known_contact_ids, array[]::uuid[]);
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
      )
      returning id into v_new_id;

      v_keep_deadline_ids := array_append(v_keep_deadline_ids, v_new_id);
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

      v_keep_deadline_ids := array_append(v_keep_deadline_ids, v_deadline.id);
    end if;
  end loop;

  delete from public.deadlines
  where competition_id = p_competition_id
    and id = any(v_known_deadline_ids)
    and not (id = any(v_keep_deadline_ids));

  for v_fee in
    select *
    from jsonb_to_recordset(coalesce(p_fees, '[]'::jsonb)) as fee_payload(
      id uuid,
      name text,
      amount numeric,
      is_per_person boolean,
      is_refundable boolean,
      due_date date
    )
  loop
    if nullif(trim(coalesce(v_fee.name, '')), '') is null then
      continue;
    end if;

    if v_fee.id is null then
      insert into public.fees (
        competition_id,
        name,
        amount,
        is_per_person,
        is_refundable,
        due_date
      )
      values (
        p_competition_id,
        trim(v_fee.name),
        coalesce(v_fee.amount, 0),
        coalesce(v_fee.is_per_person, false),
        coalesce(v_fee.is_refundable, false),
        v_fee.due_date
      )
      returning id into v_new_id;

      v_keep_fee_ids := array_append(v_keep_fee_ids, v_new_id);
    else
      update public.fees
      set
        name = trim(v_fee.name),
        amount = coalesce(v_fee.amount, 0),
        is_per_person = coalesce(v_fee.is_per_person, false),
        is_refundable = coalesce(v_fee.is_refundable, false),
        due_date = v_fee.due_date
      where id = v_fee.id
        and competition_id = p_competition_id;

      if not found then
        raise exception 'fee_not_found_or_not_authorized';
      end if;

      v_keep_fee_ids := array_append(v_keep_fee_ids, v_fee.id);
    end if;
  end loop;

  delete from public.fees
  where competition_id = p_competition_id
    and id = any(v_known_fee_ids)
    and not (id = any(v_keep_fee_ids));

  for v_contact in
    select *
    from jsonb_to_recordset(coalesce(p_contacts, '[]'::jsonb)) as contact_payload(
      id uuid,
      name text,
      role text,
      email text,
      phone text,
      sort_order integer
    )
  loop
    if nullif(trim(coalesce(v_contact.name, '')), '') is null then
      continue;
    end if;

    if v_contact.id is null then
      insert into public.competition_contacts (
        competition_id,
        name,
        role,
        email,
        phone,
        sort_order
      )
      values (
        p_competition_id,
        trim(v_contact.name),
        nullif(trim(coalesce(v_contact.role, '')), ''),
        nullif(trim(coalesce(v_contact.email, '')), ''),
        nullif(trim(coalesce(v_contact.phone, '')), ''),
        v_contact.sort_order
      )
      returning id into v_new_id;

      v_keep_contact_ids := array_append(v_keep_contact_ids, v_new_id);
    else
      update public.competition_contacts
      set
        name = trim(v_contact.name),
        role = nullif(trim(coalesce(v_contact.role, '')), ''),
        email = nullif(trim(coalesce(v_contact.email, '')), ''),
        phone = nullif(trim(coalesce(v_contact.phone, '')), ''),
        sort_order = v_contact.sort_order
      where id = v_contact.id
        and competition_id = p_competition_id;

      if not found then
        raise exception 'contact_not_found_or_not_authorized';
      end if;

      v_keep_contact_ids := array_append(v_keep_contact_ids, v_contact.id);
    end if;
  end loop;

  delete from public.competition_contacts
  where competition_id = p_competition_id
    and id = any(v_known_contact_ids)
    and not (id = any(v_keep_contact_ids));
end;
$$;

revoke execute on function public.save_competition_packet_data(
  uuid,
  integer,
  integer,
  numeric,
  integer,
  integer,
  text,
  boolean,
  jsonb,
  jsonb,
  jsonb,
  uuid[],
  uuid[],
  uuid[]
) from public;

revoke execute on function public.save_competition_packet_data(
  uuid,
  integer,
  integer,
  numeric,
  integer,
  integer,
  text,
  boolean,
  jsonb,
  jsonb,
  jsonb,
  uuid[],
  uuid[],
  uuid[]
) from anon;

grant execute on function public.save_competition_packet_data(
  uuid,
  integer,
  integer,
  numeric,
  integer,
  integer,
  text,
  boolean,
  jsonb,
  jsonb,
  jsonb,
  uuid[],
  uuid[],
  uuid[]
) to authenticated;

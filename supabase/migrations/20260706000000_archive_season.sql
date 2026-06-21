-- Archive season: flip active season, copy finances, write next roster, carry balance.
-- Run this in the Supabase SQL Editor.

create or replace function public.archive_season(
  p_active_season_label text,
  p_members jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a_id uuid;
  v_a_label text;
  v_a_starts_on date;
  v_a_ends_on date;
  v_b_label text;
  v_b_starts_on date;
  v_b_ends_on date;
  v_total_income numeric(12, 2);
  v_approved_expenses numeric(12, 2);
  v_balance numeric(12, 2);
  v_expense_start timestamptz;
  v_expense_end timestamptz;
  v_member jsonb;
  v_member_id uuid;
  v_status text;
  v_exec_title text;
  v_expected_count int;
  v_payload_count int;
begin
  if public.get_my_exec_title() not in ('captain', 'team_manager') then
    raise exception 'Not authorized to archive seasons';
  end if;

  if p_members is null or jsonb_typeof(p_members) <> 'array' or jsonb_array_length(p_members) = 0 then
    raise exception 'Member decisions are required';
  end if;

  select id, label, starts_on, ends_on
  into v_a_id, v_a_label, v_a_starts_on, v_a_ends_on
  from public.seasons
  where is_active = true
  limit 1;

  if v_a_id is null then
    raise exception 'No active season found';
  end if;

  if v_a_label <> p_active_season_label then
    raise exception 'Active season mismatch';
  end if;

  v_expense_start := (v_a_starts_on::text || 'T00:00:00.000Z')::timestamptz;
  v_expense_end := (v_a_ends_on::text || 'T23:59:59.999Z')::timestamptz;

  select coalesce(sum(amount), 0)
  into v_total_income
  from public.income_entries
  where date_received >= v_a_starts_on
    and date_received <= v_a_ends_on;

  select coalesce(sum(amount), 0)
  into v_approved_expenses
  from public.expense_requests
  where status = 'approved'
    and created_at >= v_expense_start
    and created_at <= v_expense_end;

  v_balance := v_total_income - v_approved_expenses;

  v_b_starts_on := (v_a_starts_on + interval '1 year')::date;
  v_b_ends_on := (v_a_ends_on + interval '1 year')::date;
  v_b_label := extract(year from v_b_starts_on)::text || '-' || extract(year from v_b_ends_on)::text;

  select count(*)
  into v_expected_count
  from public.season_memberships
  where season = v_a_label;

  v_payload_count := jsonb_array_length(p_members);

  if v_expected_count <> v_payload_count then
    raise exception 'Expected % member decisions, got %', v_expected_count, v_payload_count;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_members) elem
    where not exists (
      select 1
      from public.season_memberships sm
      where sm.season = v_a_label
        and sm.member_id = (elem->>'member_id')::uuid
    )
  ) then
    raise exception 'Invalid member in archive payload';
  end if;

  update public.seasons
  set is_active = false,
      is_archived = true
  where id = v_a_id;

  insert into public.seasons (label, starts_on, ends_on, is_active, is_archived)
  values (v_b_label, v_b_starts_on, v_b_ends_on, true, false);

  insert into public.budgets (season, category, allocated_amount)
  select v_b_label, category, allocated_amount
  from public.budgets
  where season = v_a_label;

  insert into public.iufb_line_items (season, description, approved_amount, spent_amount)
  select v_b_label, description, approved_amount, 0
  from public.iufb_line_items
  where season = v_a_label;

  for v_member in select * from jsonb_array_elements(p_members)
  loop
    v_member_id := (v_member->>'member_id')::uuid;
    v_status := v_member->>'status';
    v_exec_title := nullif(v_member->>'next_exec_title', '');

    if v_status not in ('active', 'inactive', 'alumni') then
      raise exception 'Invalid member status for member %', v_member_id;
    end if;

    if v_status = 'alumni' then
      v_exec_title := null;
    elsif v_exec_title is not null
      and v_exec_title not in ('captain', 'team_manager', 'finance') then
      raise exception 'Invalid exec title for member %', v_member_id;
    end if;

    insert into public.season_memberships (member_id, season, status, exec_title)
    values (v_member_id, v_b_label, v_status, v_exec_title);
  end loop;

  if v_balance > 0 then
    insert into public.income_entries (
      season,
      source,
      amount,
      category,
      date_applied,
      date_received,
      notes
    )
    values (
      v_b_label,
      'Previous Year Carryover',
      v_balance,
      'previous_year_carryover',
      v_b_starts_on,
      v_b_starts_on,
      'Carryover from ' || v_a_label
    );
  elsif v_balance < 0 then
    insert into public.budgets (season, category, allocated_amount)
    values (v_b_label, 'last_years_debt', abs(v_balance))
    on conflict (season, category) do update
      set allocated_amount = excluded.allocated_amount;
  end if;

  return jsonb_build_object(
    'next_season_label', v_b_label,
    'archived_season_label', v_a_label,
    'ending_balance', v_balance
  );
end;
$$;

grant execute on function public.archive_season(text, jsonb) to authenticated;

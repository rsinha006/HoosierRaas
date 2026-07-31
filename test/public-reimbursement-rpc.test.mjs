import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260718100000_validate_reimbursement_competition_scope.sql",
    import.meta.url,
  ),
  "utf8",
);

test("public reimbursement RPC rejects competitions outside the active season", () => {
  assert.match(
    migration,
    /create or replace function public\.submit_public_reimbursement\([\s\S]*?security definer[\s\S]*?select s\.label into v_season[\s\S]*?where s\.is_active = true/,
  );
  assert.match(
    migration,
    /if p_competition_id is not null and not exists \([\s\S]*?from public\.competitions c[\s\S]*?where c\.id = p_competition_id[\s\S]*?and c\.season = v_season[\s\S]*?raise exception 'Competition must belong to the active season'/,
  );
  assert.match(
    migration,
    /raise exception 'Competition must belong to the active season'[\s\S]*?insert into public\.reimbursements/,
  );
  assert.match(
    migration,
    /grant execute on function public\.submit_public_reimbursement\([\s\S]*?uuid, text, numeric, text, uuid, text, text, date, text, text[\s\S]*?\) to anon, authenticated/,
  );
});

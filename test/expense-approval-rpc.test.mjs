import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260703000000_atomic_expense_approval.sql",
    import.meta.url,
  ),
  "utf8",
);

const syncMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260704000000_sync_iufb_spent_amount.sql",
    import.meta.url,
  ),
  "utf8",
);

const approvalQueue = readFileSync(
  new URL("../components/expense-approval-queue.tsx", import.meta.url),
  "utf8",
);

test("expense approval RPC performs status update and IUFB increment atomically", () => {
  assert.match(
    migration,
    /create or replace function public\.approve_expense_request\([\s\S]*?security invoker[\s\S]*?update public\.expense_requests[\s\S]*?where id = p_request_id[\s\S]*?and status = 'pending'[\s\S]*?returning amount, iufb_line_item_id/,
  );
  assert.match(
    migration,
    /if not found then[\s\S]*?raise exception 'expense_request_not_pending'/,
  );
  assert.match(
    migration,
    /update public\.iufb_line_items[\s\S]*?set spent_amount = spent_amount \+ v_amount[\s\S]*?where id = v_iufb_line_item_id/,
  );
  assert.match(
    migration,
    /grant execute on function public\.approve_expense_request\(uuid, uuid\) to authenticated/,
  );
});

test("IUFB spent totals stay synchronized for direct expense status changes", () => {
  assert.match(
    syncMigration,
    /create or replace function public\.sync_iufb_line_item_spent_amount\(\)[\s\S]*?old\.status = 'approved'[\s\S]*?new\.status = 'approved'/,
  );
  assert.match(
    syncMigration,
    /set spent_amount = spent_amount - v_old_amount[\s\S]*?where id = v_old_iufb_line_item_id/,
  );
  assert.match(
    syncMigration,
    /set spent_amount = spent_amount \+ v_new_amount[\s\S]*?where id = v_new_iufb_line_item_id/,
  );
  assert.match(
    syncMigration,
    /create trigger sync_iufb_line_item_spent_amount[\s\S]*?after insert or update or delete on public\.expense_requests[\s\S]*?execute function public\.sync_iufb_line_item_spent_amount\(\)/,
  );
  assert.match(
    syncMigration,
    /update public\.iufb_line_items line_item[\s\S]*?set spent_amount = coalesce\(\([\s\S]*?from public\.expense_requests expense[\s\S]*?expense\.status = 'approved'/,
  );
});

test("latest approval RPC definition leaves IUFB accounting to the trigger", () => {
  const latestApprovalFunction = syncMigration.match(
    /create or replace function public\.approve_expense_request\([\s\S]*?grant execute on function public\.approve_expense_request\(uuid, uuid\) to authenticated;/,
  )?.[0];

  assert.ok(latestApprovalFunction);
  assert.match(
    latestApprovalFunction,
    /update public\.expense_requests[\s\S]*?where id = p_request_id[\s\S]*?and status = 'pending'[\s\S]*?returning id into v_request_id/,
  );
  assert.doesNotMatch(latestApprovalFunction, /update public\.iufb_line_items/);
  assert.match(
    latestApprovalFunction,
    /grant execute on function public\.approve_expense_request\(uuid, uuid\) to authenticated/,
  );
});

test("approval UI delegates to atomic RPC instead of updating IUFB totals directly", () => {
  assert.match(
    approvalQueue,
    /supabase\.rpc\("approve_expense_request", \{[\s\S]*?p_request_id: request\.id,[\s\S]*?p_reviewer_member_id: reviewerMemberId/,
  );
  assert.doesNotMatch(
    approvalQueue,
    /\.from\("iufb_line_items"\)[\s\S]*?\.update\(\{[\s\S]*?spent_amount:/,
  );
});

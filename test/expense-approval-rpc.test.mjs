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

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGeneralPoolBarSegments } from "../lib/budget-bar.ts";
import { getCategoryBudgetSummary } from "../lib/finance.ts";

/**
 * The reported flaw (M1): the dashboard's "Approved Expenses" card and the
 * per-category budget check used at approval time both fold paid
 * reimbursements into "spent," but the budget bar/pie chart directly below
 * the card counted only expense_requests — so the same category showed a
 * different "spent" figure depending on which part of the page you read.
 */

const budgets = [{ category: "socials", allocated_amount: 100 }];
const approvedRequests = [
  { category: "socials", amount: 20, iufb_line_item_id: null },
];
const paidReimbursements = [{ category: "socials", amount: 30 }];

test("the general pool bar chart includes paid reimbursements in 'spent'", () => {
  const [segment] = buildGeneralPoolBarSegments(
    budgets,
    approvedRequests,
    paidReimbursements,
  );

  assert.equal(segment.spent, 50);
});

test("the bar chart's 'spent' matches the per-category summary used at approval time", () => {
  const [segment] = buildGeneralPoolBarSegments(
    budgets,
    approvedRequests,
    paidReimbursements,
  );
  const summary = getCategoryBudgetSummary(
    "socials",
    budgets,
    approvedRequests,
    paidReimbursements,
  );

  assert.equal(segment.spent, summary.spent);
});

test("omitting reimbursements still works and counts only approved expenses", () => {
  const [segment] = buildGeneralPoolBarSegments(budgets, approvedRequests);

  assert.equal(segment.spent, 20);
});

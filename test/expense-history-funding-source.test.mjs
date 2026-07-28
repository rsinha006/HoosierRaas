import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const approvalQueue = readFileSync(
  new URL("../components/expense-approval-queue.tsx", import.meta.url),
  "utf8",
);

const expensesPage = readFileSync(
  new URL("../app/(hros)/finance/expenses/page.tsx", import.meta.url),
  "utf8",
);

/**
 * The reported flaw (M3): the History table showed "$5.00 Approved" and
 * "$10.00 Approved" - total $15 - while the Finance dashboard's "Approved
 * Expenses" card said $5.00. Both figures were correct (the $10 was drawn
 * from the IUFB envelope, tracked separately from the general pool the
 * dashboard card totals), but History had no column saying so, so the two
 * screens looked like they contradicted each other.
 *
 * /finance/expenses always renders ExpenseApprovalQueue in compact mode (see
 * the single render site below) - that is the branch a real page load hits,
 * so the funding label has to be in the compact History table, not just the
 * full-width one.
 */
test("the Expenses page renders the approval queue in compact mode", () => {
  assert.match(expensesPage, /<ExpenseApprovalQueue\s+compact/);
});

test("the compact History table's desktop view shows where each expense was funded from", () => {
  const compactSection = approvalQueue.slice(
    approvalQueue.indexOf("if (compact) {"),
    approvalQueue.indexOf("return (\n    <div className=\"space-y-6\">"),
  );

  assert.match(compactSection, /<th className="px-3 py-2 font-medium">Source<\/th>/);
  assert.match(
    compactSection,
    /<td className="max-w-\[6rem\] truncate px-3 py-2 text-zinc-600">\s*\{getExpenseRequestFundingLabel\(request\)\}/,
  );
});

test("the compact History table's mobile view shows the same funding label", () => {
  const compactSection = approvalQueue.slice(
    approvalQueue.indexOf("if (compact) {"),
    approvalQueue.indexOf("return (\n    <div className=\"space-y-6\">"),
  );
  const mobileHistorySection = compactSection.slice(
    compactSection.indexOf('divide-y divide-zinc-100 px-3 md:hidden'),
  );

  assert.match(
    mobileHistorySection,
    /<span className="text-\[11px\] text-zinc-500">\s*\{getExpenseRequestFundingLabel\(request\)\}/,
  );
});

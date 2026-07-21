import Link from "next/link";
import BudgetDonutCharts from "@/components/budget-donut-charts";
import ExpenseLinkGenerator from "@/components/expense-link-generator";
import { getUserMember } from "@/lib/get-user-member";
import {
  buildGeneralPoolDonutSegments,
  buildIufbDonutSegments,
} from "@/lib/budget-donut";
import {
  formatCurrency,
  getSeasonDateRange,
  getSeasonTimestampBounds,
  sumAmounts,
  sumGeneralPoolApprovedExpenses,
  sumGeneralPoolIncome,
  sumPaidReimbursements,
  type Budget,
  type ExpenseRequest,
  type IncomeEntry,
  type IufbLineItem,
} from "@/lib/finance";
import { hasWriteAccess } from "@/lib/rbac";
import { getViewingSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

type FinancePageProps = {
  searchParams: Promise<{ season?: string }>;
};

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const params = await searchParams;
  const viewingSeason = await getViewingSeason(params.season);
  const season = viewingSeason.label;
  const { start, end } = getSeasonDateRange(season);
  const { start: expenseStart, end: expenseEnd } = getSeasonTimestampBounds(season);

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  const canWrite =
    hasWriteAccess(userMember?.exec_title ?? null, "finance") && viewingSeason.is_active;

  const [
    { data: incomeData, error: incomeError },
    { data: approvedExpenseData },
    { data: budgetData, error: budgetError },
    { data: lineItemData, error: lineItemError },
    { data: paidReimbursementData },
    { data: pendingExpenseData },
    { data: pendingReimbursementData },
  ] = await Promise.all([
    supabase
      .from("income_entries")
      .select("amount, category")
      .gte("date_received", start)
      .lte("date_received", end),
    supabase
      .from("expense_requests")
      .select("amount, category, iufb_line_item_id")
      .eq("status", "approved")
      .gte("created_at", expenseStart)
      .lte("created_at", expenseEnd),
    supabase
      .from("budgets")
      .select("category, allocated_amount")
      .eq("season", season),
    supabase
      .from("iufb_line_items")
      .select("description, approved_amount, spent_amount")
      .eq("season", season),
    supabase
      .from("reimbursements")
      .select("amount")
      .eq("status", "paid")
      .eq("season", season),
    supabase
      .from("expense_requests")
      .select("amount")
      .eq("status", "pending")
      .gte("created_at", expenseStart)
      .lte("created_at", expenseEnd),
    supabase
      .from("reimbursements")
      .select("amount")
      .eq("status", "pending")
      .eq("season", season),
  ]);

  const incomeEntries = (incomeData ?? []) as Pick<
    IncomeEntry,
    "amount" | "category"
  >[];
  const paidReimbursements = (paidReimbursementData ?? []) as {
    amount: number | string;
  }[];
  const approvedRequests = (approvedExpenseData ?? []) as Pick<
    ExpenseRequest,
    "amount" | "category" | "iufb_line_item_id"
  >[];
  const budgets = (budgetData ?? []) as Pick<
    Budget,
    "category" | "allocated_amount"
  >[];
  const lineItems = (lineItemData ?? []) as Pick<
    IufbLineItem,
    "description" | "approved_amount" | "spent_amount"
  >[];
  const pendingExpenses = (pendingExpenseData ?? []) as { amount: number | string }[];
  const pendingReimbursements = (pendingReimbursementData ?? []) as {
    amount: number | string;
  }[];

  // The general pool and the IUFB envelope are walled off from each other —
  // IUFB income/spend never counts toward the team's own spendable balance.
  // Paid reimbursements come out of the general pool too, even though they
  // live in a separate table from pre-approved expenses.
  const totalIncome = sumGeneralPoolIncome(incomeEntries);
  const approvedExpenses =
    sumGeneralPoolApprovedExpenses(approvedRequests) +
    sumPaidReimbursements(paidReimbursements);
  const runningBalance = totalIncome - approvedExpenses;

  const generalPoolSegments = buildGeneralPoolDonutSegments(
    budgets,
    approvedRequests,
  );
  const iufbSegments = buildIufbDonutSegments(lineItems);
  const budgetLoadError = budgetError ?? lineItemError;

  const pendingApprovalsCount = pendingExpenses.length;
  const pendingApprovalsTotal = sumAmounts(pendingExpenses);
  const outstandingReimbursementsCount = pendingReimbursements.length;
  const outstandingReimbursementsTotal = sumAmounts(pendingReimbursements);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Finance</h1>
            <p className="mt-2 text-zinc-600">
              Overview for the {season} season.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {canWrite ? (
              <Link
                href="/finance/income"
                className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
              >
                Add Income
              </Link>
            ) : null}
            <Link
              href="/finance/budget-setup"
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Budget Setup
            </Link>
            <Link
              href="/finance/expenses"
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Expenses
            </Link>
            <Link
              href="/finance/reimbursements"
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Reimbursements
            </Link>
          </div>
        </div>
      </div>

      <ExpenseLinkGenerator />

      {incomeError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load income data</p>
          <p className="mt-1 text-sm">{incomeError.message}</p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Link
              href="/finance/income"
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[#990000]/30 hover:bg-[#990000]/[0.02]"
            >
              <p className="text-sm font-medium text-zinc-500">Total Income</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-900">
                {formatCurrency(totalIncome)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">Received {season}</p>
            </Link>

            <Link
              href="/finance/expenses"
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[#990000]/30 hover:bg-[#990000]/[0.02]"
            >
              <p className="text-sm font-medium text-zinc-500">Approved Expenses</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-900">
                {formatCurrency(approvedExpenses)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">Approved this season</p>
            </Link>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Running Balance</p>
              <p className="mt-2 text-3xl font-semibold text-[#990000]">
                {formatCurrency(runningBalance)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Income minus approved expenses
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Link
              href="/finance/expenses"
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[#990000]/30 hover:bg-[#990000]/[0.02]"
            >
              <p className="text-sm font-medium text-zinc-500">Pending Approvals</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-900">
                {formatCurrency(pendingApprovalsTotal)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {pendingApprovalsCount} expense{" "}
                {pendingApprovalsCount === 1 ? "request" : "requests"} awaiting review
              </p>
            </Link>

            <Link
              href="/finance/reimbursements"
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[#990000]/30 hover:bg-[#990000]/[0.02]"
            >
              <p className="text-sm font-medium text-zinc-500">
                Outstanding Reimbursements
              </p>
              <p className="mt-2 text-3xl font-semibold text-zinc-900">
                {formatCurrency(outstandingReimbursementsTotal)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {outstandingReimbursementsCount} request
                {outstandingReimbursementsCount === 1 ? "" : "s"} awaiting payment
              </p>
            </Link>
          </section>

          {budgetLoadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
              <p className="font-medium">Could not load budget data</p>
              <p className="mt-1 text-sm">{budgetLoadError.message}</p>
            </div>
          ) : (
            <BudgetDonutCharts
              generalPoolSegments={generalPoolSegments}
              iufbSegments={iufbSegments}
            />
          )}
        </>
      )}
    </div>
  );
}

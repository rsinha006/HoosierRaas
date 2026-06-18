import Link from "next/link";
import BudgetSetupForm from "@/components/budget-setup-form";
import { getUserMember } from "@/lib/get-user-member";
import {
  EXPENSE_CATEGORIES,
  getCurrentSeason,
  getSeasonDateRange,
  getSeasonTimestampBounds,
  sumGeneralPoolIncome,
  sumIufbIncome,
  type Budget,
  type ExpenseCategory,
  type ExpenseRequest,
  type IncomeEntry,
  type IufbLineItem,
} from "@/lib/finance";
import { hasWriteAccess } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export default async function BudgetSetupPage() {
  const season = getCurrentSeason();
  const { start, end } = getSeasonDateRange(season);
  const { start: expenseStart, end: expenseEnd } = getSeasonTimestampBounds(season);

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  const canWrite = hasWriteAccess(userMember?.exec_title ?? null, "finance");

  const [
    { data: budgetData, error: budgetError },
    { data: lineItemData, error: lineItemError },
    { data: incomeData, error: incomeError },
    { data: approvedExpenseData },
  ] = await Promise.all([
    supabase.from("budgets").select("category, allocated_amount").eq("season", season),
    supabase
      .from("iufb_line_items")
      .select("*")
      .eq("season", season)
      .order("created_at", { ascending: true }),
    supabase
      .from("income_entries")
      .select("amount, category")
      .gte("date_received", start)
      .lte("date_received", end),
    supabase
      .from("expense_requests")
      .select("category, amount")
      .eq("status", "approved")
      .gte("created_at", expenseStart)
      .lte("created_at", expenseEnd),
  ]);

  const budgets = (budgetData ?? []) as Pick<Budget, "category" | "allocated_amount">[];
  const lineItems = (lineItemData ?? []) as IufbLineItem[];
  const incomeEntries = (incomeData ?? []) as Pick<
    IncomeEntry,
    "amount" | "category"
  >[];
  const approvedRequests = (approvedExpenseData ?? []) as Pick<
    ExpenseRequest,
    "category" | "amount"
  >[];

  const allocatedByCategory = new Map(
    budgets.map((budget) => [budget.category, String(budget.allocated_amount)]),
  );

  const initialAllocations = Object.fromEntries(
    EXPENSE_CATEGORIES.map((category) => [
      category.value,
      allocatedByCategory.get(category.value) ?? "",
    ]),
  ) as Record<ExpenseCategory, string>;

  const loadError = budgetError ?? lineItemError ?? incomeError;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Budget Setup</h1>
            <p className="mt-2 text-zinc-600">
              Configure general pool and IUFB budgets for the {season} season.
            </p>
          </div>

          <Link
            href="/finance"
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Back to Finance
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load budget data</p>
          <p className="mt-1 text-sm">{loadError.message}</p>
        </div>
      ) : (
        <BudgetSetupForm
          season={season}
          canWrite={canWrite}
          generalPoolAvailable={sumGeneralPoolIncome(incomeEntries)}
          iufbAvailable={sumIufbIncome(incomeEntries)}
          initialAllocations={initialAllocations}
          initialLineItems={lineItems}
          approvedRequests={approvedRequests}
        />
      )}
    </div>
  );
}

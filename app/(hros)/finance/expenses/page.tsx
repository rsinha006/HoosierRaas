import Link from "next/link";
import AddExpenseForm from "@/components/add-expense-form";
import ExpenseApprovalQueue from "@/components/expense-approval-queue";
import { getUserMember } from "@/lib/get-user-member";
import {
  buildPopulatedGeneralPoolCategories,
  buildPopulatedIufbLineItems,
  getSeasonTimestampBounds,
  type Budget,
  type CategoryReimbursement,
  type ExpenseRequestWithRelations,
  type IufbLineItem,
} from "@/lib/finance";
import { hasWriteAccess } from "@/lib/rbac";
import { getViewingSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";
import type { Competition } from "@/lib/competitions";

type ExpensesPageProps = {
  searchParams: Promise<{ submitted?: string; season?: string }>;
};

const expenseRequestSelect = `
  *,
  requester:members!requester_member_id (
    first_name,
    last_name
  ),
  competition:competitions (
    name
  ),
  iufb_line_item:iufb_line_items (
    id,
    description,
    approved_amount,
    spent_amount
  )
`;

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = await searchParams;
  const showSubmitted = params.submitted === "1";
  const { label: season } = await getViewingSeason(params.season);
  const { start, end } = getSeasonTimestampBounds(season);

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  const canReview = hasWriteAccess(userMember?.exec_title ?? null, "finance");

  const [
    { data: budgetData, error: budgetError },
    { data: lineItemData, error: lineItemError },
    { data: competitionData, error: competitionError },
    { data: requestData, error: requestError },
    { data: paidReimbursementData },
  ] = await Promise.all([
    supabase
      .from("budgets")
      .select("category, allocated_amount")
      .eq("season", season),
    supabase
      .from("iufb_line_items")
      .select("id, description, approved_amount, spent_amount")
      .eq("season", season)
      .order("description", { ascending: true }),
    supabase
      .from("competitions")
      .select("id, name, competition_date")
      .eq("season", season)
      .order("competition_date", { ascending: true }),
    supabase
      .from("expense_requests")
      .select(expenseRequestSelect)
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false }),
    supabase
      .from("reimbursements")
      .select("category, amount")
      .eq("status", "paid")
      .gte("payment_timestamp", start)
      .lte("payment_timestamp", end),
  ]);

  const budgets = (budgetData ?? []) as Pick<Budget, "category" | "allocated_amount">[];
  const lineItems = (lineItemData ?? []) as Pick<
    IufbLineItem,
    "id" | "description" | "approved_amount" | "spent_amount"
  >[];
  const competitions = (competitionData ?? []) as Pick<
    Competition,
    "id" | "name" | "competition_date"
  >[];
  const requests = (requestData ?? []) as ExpenseRequestWithRelations[];
  const approvedRequests = requests.filter(
    (request) => request.status === "approved",
  );
  const paidReimbursements = (paidReimbursementData ?? []) as CategoryReimbursement[];

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const historyRequests = requests.filter(
    (request) => request.status === "approved" || request.status === "denied",
  );

  const generalPoolCategories = buildPopulatedGeneralPoolCategories(budgets);
  const iufbLineItems = buildPopulatedIufbLineItems(lineItems);
  const loadError = budgetError ?? lineItemError ?? competitionError ?? requestError;

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col gap-3 lg:h-[calc(100dvh-4rem)]">
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Expenses</h1>
          <p className="text-xs text-zinc-500">Pre-approval · {season}</p>
        </div>

        <Link
          href="/finance"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Back to Finance
        </Link>
      </div>

      {showSubmitted ? (
        <div
          role="status"
          className="shrink-0 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
        >
          Expense request submitted and pending finance review.
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-medium">Could not load expense data</p>
          <p className="mt-1 text-sm">{loadError.message}</p>
        </div>
      ) : (
        <div
          className={`grid min-h-0 flex-1 gap-3 ${
            userMember?.id
              ? "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]"
              : "grid-cols-1"
          }`}
        >
          {userMember?.id ? (
            <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="shrink-0 border-b border-zinc-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-900">Add Expense</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Submit against a general pool or IUFB line item.
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <AddExpenseForm
                  compact
                  season={season}
                  requesterMemberId={userMember.id}
                  competitions={competitions}
                  generalPoolCategories={generalPoolCategories}
                  iufbLineItems={iufbLineItems}
                />
              </div>
            </section>
          ) : null}

          <div className="min-h-0 overflow-hidden">
            <ExpenseApprovalQueue
              compact
              pendingRequests={pendingRequests}
              historyRequests={historyRequests}
              budgets={budgets}
              approvedRequests={approvedRequests}
              paidReimbursements={paidReimbursements}
              canReview={canReview}
              reviewerMemberId={userMember?.id ?? null}
            />
          </div>
        </div>
      )}
    </div>
  );
}

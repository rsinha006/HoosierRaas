"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  getBudgetOverage,
  getCategoryBudgetSummary,
  getExpenseRequestFundingLabel,
  getExpenseRequesterLabel,
  getIufbLineItemSummary,
  type Budget,
  type CategoryReimbursement,
  type ExpenseRequest,
  type ExpenseRequestWithRelations,
} from "@/lib/finance";

type PendingRequestCardProps = {
  request: ExpenseRequestWithRelations;
  budgets: Pick<Budget, "category" | "allocated_amount">[];
  approvedRequests: Pick<ExpenseRequest, "category" | "amount" | "iufb_line_item_id">[];
  paidReimbursements: CategoryReimbursement[];
  canReview: boolean;
  reviewerMemberId: string;
  compact?: boolean;
};

function PendingRequestCard({
  request,
  budgets,
  approvedRequests,
  paidReimbursements,
  canReview,
  reviewerMemberId,
  compact = false,
}: PendingRequestCardProps) {
  const router = useRouter();
  const [denialReason, setDenialReason] = useState("");
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"approve" | "deny" | null>(
    null,
  );

  const isIufbRequest = Boolean(request.iufb_line_item_id && request.iufb_line_item);

  const budgetSummary = isIufbRequest && request.iufb_line_item
    ? getIufbLineItemSummary(request.iufb_line_item)
    : request.category
      ? getCategoryBudgetSummary(
          request.category,
          budgets,
          approvedRequests,
          paidReimbursements,
        )
      : { allocated: 0, spent: 0, remaining: 0 };

  const fundingLabel = getExpenseRequestFundingLabel(request);
  const overage = getBudgetOverage(Number(request.amount), budgetSummary.remaining);
  const requesterName = getExpenseRequesterLabel(request);

  async function handleApprove() {
    setActionError(null);
    setLoadingAction("approve");

    const supabase = createClient();
    const { error } = await supabase.rpc("approve_expense_request", {
      p_request_id: request.id,
      p_reviewer_member_id: reviewerMemberId,
    });

    if (error) {
      setLoadingAction(null);
      setActionError(
        error.message === "expense_request_not_pending"
          ? "This request has already been reviewed."
          : error.message,
      );
      return;
    }

    setLoadingAction(null);
    router.refresh();
  }

  async function handleDeny() {
    setActionError(null);

    if (!denialReason.trim()) {
      setActionError("A denial reason is required.");
      return;
    }

    setLoadingAction("deny");

    const supabase = createClient();
    const { error } = await supabase
      .from("expense_requests")
      .update({
        status: "denied",
        denial_reason: denialReason.trim(),
        approved_at: null,
        approved_by_member_id: null,
      })
      .eq("id", request.id)
      .eq("status", "pending");

    setLoadingAction(null);

    if (error) {
      setActionError(error.message);
      return;
    }

    setShowDenyForm(false);
    setDenialReason("");
    router.refresh();
  }

  if (compact) {
    return (
      <article className="rounded-lg border border-zinc-200 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-500">{requesterName}</p>
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              {request.description}
            </h3>
            <p className="mt-0.5 truncate text-xs text-zinc-600">{fundingLabel}</p>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
              {request.justification}
            </p>
          </div>
          <div className="shrink-0 text-right text-xs">
            <p className="font-semibold text-zinc-900">
              {formatCurrency(Number(request.amount))}
            </p>
            <p
              className={`mt-0.5 font-medium ${
                budgetSummary.remaining < Number(request.amount)
                  ? "text-red-600"
                  : "text-[#990000]"
              }`}
            >
              {formatCurrency(budgetSummary.remaining)} left
            </p>
          </div>
        </div>

        {overage !== null ? (
          <p className="mt-2 text-xs text-red-600">
            Exceeds budget by {formatCurrency(overage)}
          </p>
        ) : null}

        {canReview ? (
          <div className="mt-2">
            {actionError ? (
              <p className="mb-2 text-xs text-red-600">{actionError}</p>
            ) : null}
            {!showDenyForm ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={loadingAction !== null}
                  className="rounded-md bg-[#990000] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#7a0000] disabled:opacity-60"
                >
                  {loadingAction === "approve" ? "..." : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDenyForm(true)}
                  disabled={loadingAction !== null}
                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  Deny
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={denialReason}
                  onChange={(event) => setDenialReason(event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-900 outline-none focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                  placeholder="Denial reason"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeny}
                    disabled={loadingAction !== null}
                    className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDenyForm(false);
                      setDenialReason("");
                      setActionError(null);
                    }}
                    className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-zinc-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{requesterName}</p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-900">
            {request.description}
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            {fundingLabel}
            {request.competition?.name ? ` · ${request.competition.name}` : ""}
          </p>
        </div>

        <div className="rounded-lg bg-zinc-50 px-4 py-3 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Requested
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">
            {formatCurrency(Number(request.amount))}
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {isIufbRequest ? "Remaining IUFB" : "Remaining budget"}
          </p>
          <p
            className={`mt-1 text-lg font-semibold ${
              budgetSummary.remaining < Number(request.amount)
                ? "text-red-600"
                : "text-[#990000]"
            }`}
          >
            {formatCurrency(budgetSummary.remaining)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">Justification</p>
        <p className="mt-1 whitespace-pre-wrap">{request.justification}</p>
      </div>

      {overage !== null ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This request exceeds the remaining {fundingLabel.toLowerCase()} budget by{" "}
          {formatCurrency(overage)}.
        </div>
      ) : null}

      {canReview ? (
        <div className="mt-4 space-y-3">
          {actionError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          ) : null}

          {!showDenyForm ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={loadingAction !== null}
                className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingAction === "approve" ? "Approving..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => setShowDenyForm(true)}
                disabled={loadingAction !== null}
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Deny
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor={`denial-${request.id}`}
                  className="mb-1.5 block text-sm font-medium text-zinc-700"
                >
                  Denial reason
                </label>
                <textarea
                  id={`denial-${request.id}`}
                  rows={3}
                  value={denialReason}
                  onChange={(event) => setDenialReason(event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                  placeholder="Explain why this request is being denied."
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDeny}
                  disabled={loadingAction !== null}
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingAction === "deny" ? "Denying..." : "Confirm Denial"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDenyForm(false);
                    setDenialReason("");
                    setActionError(null);
                  }}
                  disabled={loadingAction !== null}
                  className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

type ExpenseApprovalQueueProps = {
  pendingRequests: ExpenseRequestWithRelations[];
  historyRequests: ExpenseRequestWithRelations[];
  budgets: Pick<Budget, "category" | "allocated_amount">[];
  approvedRequests: Pick<ExpenseRequest, "category" | "amount" | "iufb_line_item_id">[];
  paidReimbursements: CategoryReimbursement[];
  canReview: boolean;
  reviewerMemberId: string | null;
  compact?: boolean;
};

function formatRequestDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function ExpenseApprovalQueue({
  pendingRequests,
  historyRequests,
  budgets,
  approvedRequests,
  paidReimbursements,
  canReview,
  reviewerMemberId,
  compact = false,
}: ExpenseApprovalQueueProps) {
  if (compact) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-zinc-900">Approval Queue</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {pendingRequests.length} pending
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {pendingRequests.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-500">
                No pending expense requests.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <PendingRequestCard
                    key={request.id}
                    request={request}
                    budgets={budgets}
                    approvedRequests={approvedRequests}
                    paidReimbursements={paidReimbursements}
                    canReview={canReview && Boolean(reviewerMemberId)}
                    reviewerMemberId={reviewerMemberId ?? ""}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="shrink-0 border-b border-zinc-100 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-zinc-900">History</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Approved and denied requests this season.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {historyRequests.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-zinc-500">
                No reviewed requests yet.
              </p>
            ) : (
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Requester</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium text-right">Amount</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRequests.map((request) => {
                    const requesterName = getExpenseRequesterLabel(request);

                    return (
                      <tr key={request.id} className="border-b border-zinc-100">
                        <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                          {formatRequestDate(request.created_at)}
                        </td>
                        <td className="max-w-[5rem] truncate px-3 py-2 text-zinc-900">
                          {requesterName}
                        </td>
                        <td className="max-w-[8rem] truncate px-3 py-2 text-zinc-900">
                          {request.description}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-zinc-900">
                          {formatCurrency(Number(request.amount))}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              request.status === "approved"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {request.status === "approved" ? "Approved" : "Denied"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Approval Queue</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Pending expense requests awaiting finance review.
            </p>
          </div>
          <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
            {pendingRequests.length} pending
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
            No pending expense requests.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {pendingRequests.map((request) => (
              <PendingRequestCard
                key={request.id}
                request={request}
                budgets={budgets}
                approvedRequests={approvedRequests}
                paidReimbursements={paidReimbursements}
                canReview={canReview && Boolean(reviewerMemberId)}
                reviewerMemberId={reviewerMemberId ?? ""}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">History</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Approved and denied requests for this season.
        </p>

        {historyRequests.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
            No reviewed requests yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Requester</th>
                  <th className="px-3 py-3 font-medium">Description</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium text-right">Amount</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {historyRequests.map((request) => {
                  const requesterName = getExpenseRequesterLabel(request);

                  return (
                    <tr key={request.id} className="border-b border-zinc-100">
                      <td className="px-3 py-3 text-zinc-600">
                        {formatRequestDate(request.created_at)}
                      </td>
                      <td className="px-3 py-3 text-zinc-900">{requesterName}</td>
                      <td className="px-3 py-3 text-zinc-900">{request.description}</td>
                      <td className="px-3 py-3 text-zinc-600">
                        {getExpenseRequestFundingLabel(request)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-zinc-900">
                        {formatCurrency(Number(request.amount))}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            request.status === "approved"
                              ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                              : "bg-red-50 text-red-700 ring-1 ring-red-200"
                          }`}
                        >
                          {request.status === "approved" ? "Approved" : "Denied"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-zinc-600">
                        {request.status === "denied"
                          ? request.denial_reason
                          : request.justification}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

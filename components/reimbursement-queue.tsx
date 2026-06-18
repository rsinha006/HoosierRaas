"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  getExpenseCategoryLabel,
  type ExpenseCategory,
} from "@/lib/finance";
import {
  formatReimbursementTimestamp,
  getPaymentMethodLabel,
  getReimbursementSubmitterEmail,
  getReimbursementSubmitterLabel,
  isOutsideSubmissionWindow,
  REIMBURSEMENT_PAYMENT_METHODS,
  type ReimbursementPaymentMethod,
  type ReimbursementQueueItem,
} from "@/lib/reimbursements";

type PendingReimbursementCardProps = {
  reimbursement: ReimbursementQueueItem;
  canReview: boolean;
  reviewerMemberId: string;
};

function PendingReimbursementCard({
  reimbursement,
  canReview,
  reviewerMemberId,
}: PendingReimbursementCardProps) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] =
    useState<ReimbursementPaymentMethod>("venmo");
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitterName = getReimbursementSubmitterLabel(reimbursement);
  const submitterEmail = getReimbursementSubmitterEmail(reimbursement);

  const outsideWindow = isOutsideSubmissionWindow(
    reimbursement.date_of_purchase,
    new Date(reimbursement.submission_timestamp),
  );

  async function handleMarkPaid() {
    setActionError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("reimbursements")
      .update({
        status: "paid",
        payment_method: paymentMethod,
        payment_timestamp: new Date().toISOString(),
        paid_by_member_id: reviewerMemberId,
      })
      .eq("id", reimbursement.id)
      .eq("status", "pending");

    setLoading(false);

    if (error) {
      setActionError(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <article className="rounded-xl border border-zinc-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{submitterName}</p>
          {submitterEmail ? (
            <p className="text-sm text-zinc-500">{submitterEmail}</p>
          ) : null}
          <h3 className="mt-1 text-lg font-semibold text-zinc-900">
            {reimbursement.description}
          </h3>
          <p className="mt-2 text-sm text-zinc-600">
            {getExpenseCategoryLabel(reimbursement.category as ExpenseCategory)}
            {reimbursement.competition?.name
              ? ` · ${reimbursement.competition.name}`
              : ""}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Purchased {reimbursement.date_of_purchase} · Submitted{" "}
            {formatReimbursementTimestamp(reimbursement.submission_timestamp)}
          </p>
        </div>

        <div className="rounded-lg bg-zinc-50 px-4 py-3 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Amount
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">
            {formatCurrency(Number(reimbursement.amount))}
          </p>
        </div>
      </div>

      {reimbursement.notes ? (
        <div className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <p className="font-medium text-zinc-900">Notes</p>
          <p className="mt-1 whitespace-pre-wrap">{reimbursement.notes}</p>
        </div>
      ) : null}

      {outsideWindow ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This purchase is outside the 24-hour submission window. Reimbursement
          may not be approved.
        </div>
      ) : null}

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-zinc-700">Receipt</p>
        {reimbursement.receiptSignedUrl ? (
          reimbursement.isReceiptImage ? (
            <a
              href={reimbursement.receiptSignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block overflow-hidden rounded-lg border border-zinc-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reimbursement.receiptSignedUrl}
                alt={`Receipt for ${reimbursement.description}`}
                className="max-h-64 max-w-full object-contain"
              />
            </a>
          ) : (
            <a
              href={reimbursement.receiptSignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              View receipt PDF
            </a>
          )
        ) : (
          <p className="text-sm text-zinc-500">Receipt preview unavailable.</p>
        )}
      </div>

      {canReview ? (
        <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
          {actionError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor={`payment-${reimbursement.id}`}
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                Payment method
              </label>
              <select
                id={`payment-${reimbursement.id}`}
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as ReimbursementPaymentMethod)
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
              >
                {REIMBURSEMENT_PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={loading}
              className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Mark as Paid"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

type ReimbursementQueueProps = {
  pendingReimbursements: ReimbursementQueueItem[];
  paidReimbursements: ReimbursementQueueItem[];
  canReview: boolean;
  reviewerMemberId: string | null;
};

export default function ReimbursementQueue({
  pendingReimbursements,
  paidReimbursements,
  canReview,
  reviewerMemberId,
}: ReimbursementQueueProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Pending Reimbursements</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Out-of-pocket submissions awaiting payment.
            </p>
          </div>
          <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
            {pendingReimbursements.length} pending
          </span>
        </div>

        {pendingReimbursements.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
            No pending reimbursement requests.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {pendingReimbursements.map((reimbursement) => (
              <PendingReimbursementCard
                key={reimbursement.id}
                reimbursement={reimbursement}
                canReview={canReview && Boolean(reviewerMemberId)}
                reviewerMemberId={reviewerMemberId ?? ""}
              />
            ))}
          </div>
        )}
      </section>

      {paidReimbursements.length > 0 ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Paid Reimbursements</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Recently processed reimbursements.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="px-3 py-3 font-medium">Submitted</th>
                  <th className="px-3 py-3 font-medium">Submitter</th>
                  <th className="px-3 py-3 font-medium">Description</th>
                  <th className="px-3 py-3 font-medium text-right">Amount</th>
                  <th className="px-3 py-3 font-medium">Paid via</th>
                  <th className="px-3 py-3 font-medium">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {paidReimbursements.map((reimbursement) => {
                  const submitterName = getReimbursementSubmitterLabel(reimbursement);

                  return (
                    <tr key={reimbursement.id} className="border-b border-zinc-100">
                      <td className="px-3 py-3 text-zinc-600">
                        {formatReimbursementTimestamp(reimbursement.submission_timestamp)}
                      </td>
                      <td className="px-3 py-3 text-zinc-900">{submitterName}</td>
                      <td className="px-3 py-3 text-zinc-900">{reimbursement.description}</td>
                      <td className="px-3 py-3 text-right font-medium text-zinc-900">
                        {formatCurrency(Number(reimbursement.amount))}
                      </td>
                      <td className="px-3 py-3 text-zinc-600">
                        {reimbursement.payment_method
                          ? getPaymentMethodLabel(reimbursement.payment_method)
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-zinc-600">
                        {reimbursement.payment_timestamp
                          ? formatReimbursementTimestamp(reimbursement.payment_timestamp)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

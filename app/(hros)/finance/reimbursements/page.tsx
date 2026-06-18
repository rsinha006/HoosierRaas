import Link from "next/link";
import ReimbursementLinkGenerator from "@/components/reimbursement-link-generator";
import ReimbursementQueue from "@/components/reimbursement-queue";
import { getUserMember } from "@/lib/get-user-member";
import {
  isReceiptImagePath,
  RECEIPTS_BUCKET,
  type ReimbursementQueueItem,
  type ReimbursementWithRelations,
} from "@/lib/reimbursements";
import { hasWriteAccess } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

type ReimbursementsPageProps = {
  searchParams: Promise<{ submitted?: string }>;
};

const reimbursementSelect = `
  *,
  submitter:members!submitted_by_member_id (
    first_name,
    last_name
  ),
  competition:competitions (
    name
  )
`;

async function attachReceiptSignedUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reimbursements: ReimbursementWithRelations[],
): Promise<ReimbursementQueueItem[]> {
  return Promise.all(
    reimbursements.map(async (reimbursement) => {
      const { data } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .createSignedUrl(reimbursement.receipt_url, 3600);

      return {
        ...reimbursement,
        receiptSignedUrl: data?.signedUrl ?? null,
        isReceiptImage: isReceiptImagePath(reimbursement.receipt_url),
      };
    }),
  );
}

export default async function ReimbursementsPage({
  searchParams,
}: ReimbursementsPageProps) {
  const params = await searchParams;
  const showSubmitted = params.submitted === "1";

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  const canReview = hasWriteAccess(userMember?.exec_title ?? null, "finance");

  const { data: reimbursementData, error: reimbursementError } = await supabase
    .from("reimbursements")
    .select(reimbursementSelect)
    .order("submission_timestamp", { ascending: false });

  const reimbursements = (reimbursementData ?? []) as ReimbursementWithRelations[];
  const pending = reimbursements.filter((item) => item.status === "pending");
  const paid = reimbursements.filter((item) => item.status === "paid");

  const [pendingWithReceipts, paidWithReceipts] = await Promise.all([
    attachReceiptSignedUrls(supabase, pending),
    attachReceiptSignedUrls(supabase, paid.slice(0, 25)),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Reimbursements</h1>
            <p className="mt-2 text-zinc-600">
              Out-of-pocket reimbursement requests and payment queue.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/finance"
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to Finance
            </Link>
          </div>
        </div>
      </div>

      <ReimbursementLinkGenerator />

      {showSubmitted ? (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50 px-6 py-4 text-green-800"
        >
          <p className="font-medium">Reimbursement submitted.</p>
          <p className="mt-1 text-sm">
            Finance will review your request and process payment.
          </p>
        </div>
      ) : null}

      {reimbursementError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load reimbursements</p>
          <p className="mt-1 text-sm">{reimbursementError.message}</p>
        </div>
      ) : (
        <ReimbursementQueue
          pendingReimbursements={pendingWithReceipts}
          paidReimbursements={paidWithReceipts}
          canReview={canReview}
          reviewerMemberId={userMember?.id ?? null}
        />
      )}
    </div>
  );
}

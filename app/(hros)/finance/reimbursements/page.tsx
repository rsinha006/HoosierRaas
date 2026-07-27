import ReimbursementLinkGenerator from "@/components/reimbursement-link-generator";
import ReimbursementQueue from "@/components/reimbursement-queue";
import { getUserMember } from "@/lib/get-user-member";
import {
  DENIED_PAGE_SIZE,
  isReceiptImagePath,
  MAX_PAID_COUNT,
  PAID_PAGE_SIZE,
  parsePaidCount,
  RECEIPTS_BUCKET,
  type ReimbursementQueueItem,
  type ReimbursementStatus,
  type ReimbursementWithRelations,
} from "@/lib/reimbursements";
import { hasWriteAccess } from "@/lib/rbac";
import { getViewingSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

type ReimbursementsPageProps = {
  searchParams: Promise<{ submitted?: string; paidCount?: string; season?: string }>;
};

const RECEIPT_URL_TTL_SECONDS = 3600;

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

/** One storage round-trip for the whole group. Signing each receipt on its own put
 *  the page's network cost on the number of rows it happened to be showing. */
async function attachReceiptSignedUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reimbursements: ReimbursementWithRelations[],
): Promise<ReimbursementQueueItem[]> {
  if (reimbursements.length === 0) {
    return [];
  }

  const { data } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrls(
      reimbursements.map((reimbursement) => reimbursement.receipt_url),
      RECEIPT_URL_TTL_SECONDS,
    );

  // Matched on path rather than position: a receipt storage can't sign comes back
  // with an error and a null URL, and the card already renders that case.
  const signedUrlByPath = new Map(
    (data ?? []).map((entry) => [entry.path, entry.signedUrl]),
  );

  return reimbursements.map((reimbursement) => ({
    ...reimbursement,
    receiptSignedUrl: signedUrlByPath.get(reimbursement.receipt_url) ?? null,
    isReceiptImage: isReceiptImagePath(reimbursement.receipt_url),
  }));
}

export default async function ReimbursementsPage({
  searchParams,
}: ReimbursementsPageProps) {
  const params = await searchParams;
  const showSubmitted = params.submitted === "1";
  const paidCount = parsePaidCount(params.paidCount);
  const viewingSeason = await getViewingSeason(params.season);
  const season = viewingSeason.label;

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  // Same rule as the Expenses queue: a season you are only viewing is read-only,
  // and the archived-season policies would refuse the write anyway.
  const canReview =
    hasWriteAccess(userMember?.exec_title ?? null, "finance") && viewingSeason.is_active;

  // Status and season are filtered in the query, not after the fact. Reading the
  // whole table meant an archived season's requests sat in the live payment queue,
  // and every list was capped by whatever the database chose to return.
  const seasonReimbursements = (status: ReimbursementStatus) =>
    supabase
      .from("reimbursements")
      .select(reimbursementSelect)
      .eq("season", season)
      .eq("status", status)
      .order("submission_timestamp", { ascending: false });

  const [pendingResult, paidResult, deniedResult] = await Promise.all([
    // Pending is the queue itself — everything still owed this season is shown.
    seasonReimbursements("pending"),
    // One extra row is what tells us whether there is another page to load.
    seasonReimbursements("paid").limit(paidCount + 1),
    seasonReimbursements("denied").limit(DENIED_PAGE_SIZE),
  ]);

  const reimbursementError =
    pendingResult.error ?? paidResult.error ?? deniedResult.error;

  const pending = (pendingResult.data ?? []) as ReimbursementWithRelations[];
  const paidPage = (paidResult.data ?? []) as ReimbursementWithRelations[];
  const denied = (deniedResult.data ?? []) as ReimbursementWithRelations[];

  const hasMorePaid = paidPage.length > paidCount;
  // Past the cap there is no next page to offer, so the queue says so instead of
  // showing a "Load more" link that would come back to the same rows.
  const loadMorePaidHref =
    paidCount + PAID_PAGE_SIZE <= MAX_PAID_COUNT
      ? `/finance/reimbursements?${new URLSearchParams({
          ...(params.season ? { season: params.season } : {}),
          paidCount: String(paidCount + PAID_PAGE_SIZE),
        })}`
      : null;

  const [pendingWithReceipts, paidWithReceipts, deniedWithReceipts] = await Promise.all([
    attachReceiptSignedUrls(supabase, pending),
    attachReceiptSignedUrls(supabase, paidPage.slice(0, paidCount)),
    attachReceiptSignedUrls(supabase, denied),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Reimbursements</h1>
        <p className="mt-2 text-zinc-600">
          Out-of-pocket reimbursement requests and payment queue for the {season}{" "}
          season.
        </p>
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
          deniedReimbursements={deniedWithReceipts}
          canReview={canReview}
          reviewerMemberId={userMember?.id ?? null}
          hasMorePaid={hasMorePaid}
          loadMorePaidHref={loadMorePaidHref}
        />
      )}
    </div>
  );
}

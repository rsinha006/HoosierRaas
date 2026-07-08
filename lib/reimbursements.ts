export const RECEIPTS_BUCKET = "receipts";

/** Reimbursement is the out-of-pocket path for small purchases only.
 *  Anything at or above this needs pre-approval through the Expenses flow instead. */
export const MAX_REIMBURSEMENT_AMOUNT = 100;

export const MAX_RECEIPT_MB = 10;

export const MAX_RECEIPT_BYTES = MAX_RECEIPT_MB * 1024 * 1024;

export const RECEIPT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number];

export const REIMBURSEMENT_PAYMENT_METHODS = [
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
] as const;

export type ReimbursementPaymentMethod =
  (typeof REIMBURSEMENT_PAYMENT_METHODS)[number]["value"];

export type ReimbursementStatus = "pending" | "paid";

export type Reimbursement = {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  category: string;
  competition_id: string | null;
  submitted_by_member_id: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  date_of_purchase: string;
  submission_timestamp: string;
  receipt_url: string;
  notes: string | null;
  status: ReimbursementStatus;
  payment_method: ReimbursementPaymentMethod | null;
  payment_timestamp: string | null;
  paid_by_member_id: string | null;
};

export type ReimbursementWithRelations = Reimbursement & {
  submitter: { first_name: string; last_name: string } | null;
  competition: { name: string } | null;
};

export type ReimbursementQueueItem = ReimbursementWithRelations & {
  receiptSignedUrl: string | null;
  isReceiptImage: boolean;
};

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function validateReceiptFile(file: File | null) {
  if (!file) {
    return "Please upload a receipt image or PDF.";
  }

  if (
    !RECEIPT_MIME_TYPES.includes(file.type as ReceiptMimeType)
  ) {
    return "Receipt must be a PDF or image file (JPEG, PNG, WebP, or GIF).";
  }

  if (file.size > MAX_RECEIPT_BYTES) {
    return `Receipt must be ${MAX_RECEIPT_MB} MB or smaller.`;
  }

  return null;
}

export function sanitizeReceiptFilename(filename: string) {
  return filename
    .trim()
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, "-");
}

export function getReceiptStoragePath(
  submitterKey: string,
  reimbursementId: string,
  filename: string,
) {
  return `submissions/${submitterKey}/${reimbursementId}/${sanitizeReceiptFilename(filename)}`;
}

export function getSubmitterStorageKey(email: string) {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
}

export function getReimbursementSubmitterLabel(
  reimbursement: Pick<
    Reimbursement,
    "submitter_name" | "submitter_email" | "submitted_by_member_id"
  > & {
    submitter?: { first_name: string; last_name: string } | null;
  },
) {
  if (reimbursement.submitter) {
    return `${reimbursement.submitter.first_name} ${reimbursement.submitter.last_name}`;
  }

  if (reimbursement.submitter_name) {
    return reimbursement.submitter_name;
  }

  return "Unknown submitter";
}

export function getReimbursementSubmitterEmail(
  reimbursement: Pick<Reimbursement, "submitter_email">,
) {
  return reimbursement.submitter_email;
}

export function isReceiptImagePath(path: string) {
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  );
}

export function isOutsideSubmissionWindow(
  dateOfPurchase: string,
  submissionTimestamp = new Date(),
) {
  const purchaseAt = new Date(`${dateOfPurchase}T00:00:00`);
  return (
    submissionTimestamp.getTime() - purchaseAt.getTime() > TWENTY_FOUR_HOURS_MS
  );
}

export function getPaymentMethodLabel(method: ReimbursementPaymentMethod) {
  return (
    REIMBURSEMENT_PAYMENT_METHODS.find((item) => item.value === method)?.label ??
    method
  );
}

export function formatReimbursementTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

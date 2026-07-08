"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EXPENSE_CATEGORIES,
  formatCurrency,
  type ExpenseCategory,
} from "@/lib/finance";
import { isValidEmail } from "@/lib/members";
import {
  getReceiptStoragePath,
  getSubmitterStorageKey,
  isOutsideSubmissionWindow,
  MAX_REIMBURSEMENT_AMOUNT,
  validateReceiptFile,
} from "@/lib/reimbursements";
import { uploadReceipt } from "@/lib/upload-receipt";
import type { Competition } from "@/lib/competitions";

type FormView = "form" | "success";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-3 text-base text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const labelClassName = "block text-sm font-medium text-zinc-700";

const requiredMark = <span className="text-[#990000]">*</span>;

type ReimbursementFormProps = {
  competitions: Pick<Competition, "id" | "name" | "competition_date">[];
};

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-zinc-200 pb-3">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      ) : null}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-red-600">{message}</p>;
}

export default function ReimbursementForm({ competitions }: ReimbursementFormProps) {
  const [view, setView] = useState<FormView>("form");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dateOfPurchase, setDateOfPurchase] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("miscellaneous");
  const [competitionId, setCompetitionId] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const submitLockRef = useRef(false);

  const showSubmissionWindowWarning = useMemo(() => {
    if (!dateOfPurchase) {
      return false;
    }

    return isOutsideSubmissionWindow(dateOfPurchase);
  }, [dateOfPurchase]);

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required.";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required.";
    }

    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!isValidEmail(email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (!description.trim()) {
      errors.description = "Description is required.";
    }

    if (!amount.trim()) {
      errors.amount = "Amount is required.";
    } else if (Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      errors.amount = "Enter a valid amount greater than zero.";
    } else if (Number(amount) >= MAX_REIMBURSEMENT_AMOUNT) {
      errors.amount = `Reimbursement is only for purchases under ${formatCurrency(MAX_REIMBURSEMENT_AMOUNT)}. For anything ${formatCurrency(MAX_REIMBURSEMENT_AMOUNT)} or more, ask your finance chair to submit a pre-approval expense request instead.`;
    }

    if (!dateOfPurchase) {
      errors.dateOfPurchase = "Date of purchase is required.";
    } else if (isOutsideSubmissionWindow(dateOfPurchase)) {
      errors.dateOfPurchase =
        "Reimbursements must be submitted within 24 hours of the purchase date. This purchase is outside that window and can't be submitted — contact your finance chair directly.";
    }

    const receiptError = validateReceiptFile(receiptFile);
    if (receiptError) {
      errors.receipt = receiptError;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);

    if (!validateForm() || !receiptFile || submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setLoading(true);
    setUploadProgress(0);

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();
      const submitterName = `${firstName.trim()} ${lastName.trim()}`;
      const reimbursementId = crypto.randomUUID();
      const receiptPath = getReceiptStoragePath(
        getSubmitterStorageKey(normalizedEmail),
        reimbursementId,
        receiptFile.name,
      );

      await uploadReceipt({
        supabase,
        path: receiptPath,
        file: receiptFile,
        onProgress: setUploadProgress,
      });

      const { error } = await supabase.rpc("submit_public_reimbursement", {
        p_id: reimbursementId,
        p_description: description.trim(),
        p_amount: Number(amount),
        p_category: category,
        p_competition_id: competitionId || null,
        p_submitter_name: submitterName,
        p_submitter_email: normalizedEmail,
        p_date_of_purchase: dateOfPurchase,
        p_receipt_url: receiptPath,
        p_notes: notes.trim() || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setView("success");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not submit reimbursement.",
      );
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  }

  if (view === "success") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
          ✓
        </div>
        <h2 className="text-2xl font-semibold text-zinc-900">Request submitted</h2>
        <p className="text-zinc-600">
          Finance will review your reimbursement and follow up about payment.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <SectionHeading
          title="Your information"
          description="So finance knows who to reimburse."
        />

        <div className="space-y-2">
          <label htmlFor="first-name" className={labelClassName}>
            First name {requiredMark}
          </label>
          <input
            id="first-name"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={inputClassName}
          />
          <FieldError message={fieldErrors.firstName} />
        </div>

        <div className="space-y-2">
          <label htmlFor="last-name" className={labelClassName}>
            Last name {requiredMark}
          </label>
          <input
            id="last-name"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className={inputClassName}
          />
          <FieldError message={fieldErrors.lastName} />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className={labelClassName}>
            Email {requiredMark}
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClassName}
            placeholder="you@iu.edu"
          />
          <FieldError message={fieldErrors.email} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Expense details"
          description="Tell us what you paid for out of pocket."
        />

        <div className="space-y-2">
          <label htmlFor="description" className={labelClassName}>
            Description {requiredMark}
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClassName}
            placeholder="What did you purchase?"
          />
          <FieldError message={fieldErrors.description} />
        </div>

        <div className="space-y-2">
          <label htmlFor="amount" className={labelClassName}>
            Amount {requiredMark}
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClassName}
            placeholder="0.00"
          />
          <p className="text-sm text-zinc-500">
            Under {formatCurrency(MAX_REIMBURSEMENT_AMOUNT)} only. Bigger purchases need
            pre-approval from finance first.
          </p>
          <FieldError message={fieldErrors.amount} />
        </div>

        <div className="space-y-2">
          <label htmlFor="dateOfPurchase" className={labelClassName}>
            Date of purchase {requiredMark}
          </label>
          <input
            id="dateOfPurchase"
            type="date"
            value={dateOfPurchase}
            onChange={(event) => setDateOfPurchase(event.target.value)}
            className={inputClassName}
          />
          <FieldError message={fieldErrors.dateOfPurchase} />
        </div>

        {showSubmissionWindowWarning ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This purchase is outside the 24-hour submission window and can&apos;t be
            submitted here. Contact your finance chair directly.
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="category" className={labelClassName}>
            Category {requiredMark}
          </label>
          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            className={inputClassName}
          >
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="competitionId" className={labelClassName}>
            Competition
          </label>
          <select
            id="competitionId"
            value={competitionId}
            onChange={(event) => setCompetitionId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Not competition-specific</option>
            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-zinc-500">
            Optional — leave blank for general team expenses.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Receipt"
          description="Upload a photo or PDF of your receipt (max 10 MB)."
        />

        <input
          id="receipt"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
          onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#990000]/10 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-[#990000]"
        />
        {receiptFile ? (
          <p className="text-sm text-zinc-600">Selected: {receiptFile.name}</p>
        ) : null}
        <FieldError message={fieldErrors.receipt} />
      </section>

      <section className="space-y-2">
        <label htmlFor="notes" className={labelClassName}>
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={inputClassName}
          placeholder="Optional context for finance review"
        />
      </section>

      {loading && uploadProgress > 0 && uploadProgress < 100 ? (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-[#990000] transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Uploading receipt... {uploadProgress}%
          </p>
        </div>
      ) : null}

      {saveError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#990000] px-4 py-3.5 text-base font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Submit reimbursement request"}
      </button>
    </form>
  );
}

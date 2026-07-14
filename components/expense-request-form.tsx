"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type ExpenseCategory,
  type ExpenseFundingPool,
  type PublicExpenseCategoryOption,
  type PublicIufbLineItemOption,
} from "@/lib/finance";
import { isValidEmail } from "@/lib/members";
import type { Competition } from "@/lib/competitions";

type FormView = "form" | "success";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-3 text-base text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const labelClassName = "block text-sm font-medium text-zinc-700";

const requiredMark = <span className="text-[#990000]">*</span>;

type ExpenseRequestFormProps = {
  competitions: Pick<Competition, "id" | "name" | "competition_date">[];
  generalPoolCategories: PublicExpenseCategoryOption[];
  iufbLineItems: PublicIufbLineItemOption[];
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

export default function ExpenseRequestForm({
  competitions,
  generalPoolCategories,
  iufbLineItems,
}: ExpenseRequestFormProps) {
  const [view, setView] = useState<FormView>("form");

  const hasGeneralPool = generalPoolCategories.length > 0;
  const hasIufb = iufbLineItems.length > 0;
  const canSubmit = hasGeneralPool || hasIufb;

  const defaultPool = useMemo<ExpenseFundingPool>(() => {
    if (hasGeneralPool) {
      return "general_pool";
    }

    if (hasIufb) {
      return "iufb";
    }

    return "general_pool";
  }, [hasGeneralPool, hasIufb]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [fundingPool, setFundingPool] = useState<ExpenseFundingPool>(defaultPool);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "">(
    generalPoolCategories[0]?.value ?? "",
  );
  const [iufbLineItemId, setIufbLineItemId] = useState(iufbLineItems[0]?.id ?? "");
  const [competitionId, setCompetitionId] = useState("");
  const [justification, setJustification] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

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
    }

    if (fundingPool === "general_pool" && !category) {
      errors.category = "Select a general pool category.";
    }

    if (fundingPool === "iufb" && !iufbLineItemId) {
      errors.iufbLineItemId = "Select an IUFB line item.";
    }

    if (!justification.trim()) {
      errors.justification = "Justification is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);

    if (!canSubmit || !validateForm() || submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();
      const submitterName = `${firstName.trim()} ${lastName.trim()}`;

      const { error } = await supabase.rpc("submit_public_expense_request", {
        p_id: crypto.randomUUID(),
        p_description: description.trim(),
        p_amount: Number(amount),
        p_category: fundingPool === "general_pool" ? category : null,
        p_iufb_line_item_id: fundingPool === "iufb" ? iufbLineItemId : null,
        p_competition_id: competitionId || null,
        p_submitter_name: submitterName,
        p_submitter_email: normalizedEmail,
        p_justification: justification.trim(),
      });

      if (error) {
        throw new Error(error.message);
      }

      setView("success");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not submit expense request.",
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
          Finance will review your expense request and follow up with a decision.
        </p>
      </div>
    );
  }

  if (!canSubmit) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-600">
        <p className="font-medium text-zinc-900">No budget categories available yet.</p>
        <p className="mt-1">
          Finance hasn&apos;t set up general pool category budgets or IUFB line items
          for this season yet. Check back soon or contact your finance chair.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <SectionHeading
          title="Your information"
          description="So finance knows who is requesting this."
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
          description="Tell finance what you need pre-approval for."
        />

        <div className="space-y-2">
          <label htmlFor="fundingPool" className={labelClassName}>
            Funding source {requiredMark}
          </label>
          <select
            id="fundingPool"
            value={fundingPool}
            onChange={(event) => {
              setFundingPool(event.target.value as ExpenseFundingPool);
              setFieldErrors({});
            }}
            className={inputClassName}
          >
            {hasGeneralPool ? (
              <option value="general_pool">General Pool</option>
            ) : null}
            {hasIufb ? <option value="iufb">IUFB Envelope</option> : null}
          </select>
        </div>

        {fundingPool === "general_pool" ? (
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
              {generalPoolCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.category} />
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="iufbLineItemId" className={labelClassName}>
              IUFB line item {requiredMark}
            </label>
            <select
              id="iufbLineItemId"
              value={iufbLineItemId}
              onChange={(event) => setIufbLineItemId(event.target.value)}
              className={inputClassName}
            >
              {iufbLineItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.description}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.iufbLineItemId} />
          </div>
        )}

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
            placeholder="What is this expense for?"
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
          <FieldError message={fieldErrors.amount} />
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
            <option value="">No competition</option>
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

        <div className="space-y-2">
          <label htmlFor="justification" className={labelClassName}>
            Justification {requiredMark}
          </label>
          <textarea
            id="justification"
            rows={3}
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            className={inputClassName}
            placeholder="Explain why this expense is needed."
          />
          <FieldError message={fieldErrors.justification} />
        </div>
      </section>

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
        {loading ? "Submitting..." : "Submit expense request"}
      </button>
    </form>
  );
}

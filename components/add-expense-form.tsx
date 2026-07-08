"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  type ExpenseCategory,
  type ExpenseFundingPool,
  type PopulatedGeneralPoolCategory,
  type PopulatedIufbLineItemOption,
} from "@/lib/finance";
import type { Competition } from "@/lib/competitions";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const compactInputClassName =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const requiredMark = <span className="text-[#990000]">*</span>;

type AddExpenseFormProps = {
  requesterMemberId: string;
  season: string;
  competitions: Pick<Competition, "id" | "name" | "competition_date">[];
  generalPoolCategories: PopulatedGeneralPoolCategory[];
  iufbLineItems: PopulatedIufbLineItemOption[];
  compact?: boolean;
};

export default function AddExpenseForm({
  requesterMemberId,
  season,
  competitions,
  generalPoolCategories,
  iufbLineItems,
  compact = false,
}: AddExpenseFormProps) {
  const router = useRouter();

  const defaultPool = useMemo<ExpenseFundingPool>(() => {
    if (generalPoolCategories.length > 0) {
      return "general_pool";
    }

    if (iufbLineItems.length > 0) {
      return "iufb";
    }

    return "general_pool";
  }, [generalPoolCategories.length, iufbLineItems.length]);

  const [fundingPool, setFundingPool] = useState<ExpenseFundingPool>(defaultPool);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "">(
    generalPoolCategories[0]?.value ?? "",
  );
  const [iufbLineItemId, setIufbLineItemId] = useState(
    iufbLineItems[0]?.id ?? "",
  );
  const [competitionId, setCompetitionId] = useState("");
  const [justification, setJustification] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  const hasGeneralPool = generalPoolCategories.length > 0;
  const hasIufb = iufbLineItems.length > 0;
  const canSubmit = hasGeneralPool || hasIufb;

  function validateForm() {
    const errors: Record<string, string> = {};

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
    const supabase = createClient();

    const { error } = await supabase.from("expense_requests").insert({
      season,
      description: description.trim(),
      amount: Number(amount),
      category: fundingPool === "general_pool" ? category : null,
      iufb_line_item_id: fundingPool === "iufb" ? iufbLineItemId : null,
      competition_id: competitionId || null,
      requester_member_id: requesterMemberId,
      justification: justification.trim(),
      status: "pending",
    });

    setLoading(false);
    submitLockRef.current = false;

    if (error) {
      setSaveError(error.message);
      return;
    }

    setDescription("");
    setAmount("");
    setCategory(generalPoolCategories[0]?.value ?? "");
    setIufbLineItemId(iufbLineItems[0]?.id ?? "");
    setCompetitionId("");
    setJustification("");
    setFieldErrors({});
    router.refresh();
  }

  const fieldClassName = compact ? compactInputClassName : inputClassName;

  if (!canSubmit) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-600">
        <p className="font-medium text-zinc-900">No budget categories available yet.</p>
        <p className="mt-1">
          Set up general pool category budgets or IUFB line items in Budget Setup
          before submitting expenses.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-3" : "space-y-5"}>
      <div className={compact ? "space-y-3" : "grid gap-5 md:grid-cols-2"}>
        <div>
          <label htmlFor="fundingPool" className="mb-1 block text-xs font-medium text-zinc-700">
            Funding source {requiredMark}
          </label>
          <select
            id="fundingPool"
            value={fundingPool}
            onChange={(event) => {
              setFundingPool(event.target.value as ExpenseFundingPool);
              setFieldErrors({});
            }}
            className={fieldClassName}
          >
            {hasGeneralPool ? (
              <option value="general_pool">General Pool</option>
            ) : null}
            {hasIufb ? <option value="iufb">IUFB Envelope</option> : null}
          </select>
        </div>

        {fundingPool === "general_pool" ? (
          <div>
            <label htmlFor="category" className="mb-1 block text-xs font-medium text-zinc-700">
              Category {requiredMark}
            </label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
              className={fieldClassName}
            >
              {generalPoolCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                  {!compact
                    ? ` (${item.allocated.toLocaleString("en-US", { style: "currency", currency: "USD" })} allocated)`
                    : ""}
                </option>
              ))}
            </select>
            {fieldErrors.category ? (
              <p className="mt-1.5 text-sm text-red-600">{fieldErrors.category}</p>
            ) : null}
          </div>
        ) : (
          <div>
            <label htmlFor="iufbLineItemId" className="mb-1 block text-xs font-medium text-zinc-700">
              IUFB line item {requiredMark}
            </label>
            <select
              id="iufbLineItemId"
              value={iufbLineItemId}
              onChange={(event) => setIufbLineItemId(event.target.value)}
              className={fieldClassName}
            >
              {iufbLineItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.description}
                </option>
              ))}
            </select>
            {fieldErrors.iufbLineItemId ? (
              <p className="mt-1.5 text-sm text-red-600">{fieldErrors.iufbLineItemId}</p>
            ) : null}
          </div>
        )}

        <div>
          <label htmlFor="description" className="mb-1 block text-xs font-medium text-zinc-700">
            Description {requiredMark}
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={fieldClassName}
            placeholder="What is this expense for?"
          />
          {fieldErrors.description ? (
            <p className="mt-1.5 text-sm text-red-600">{fieldErrors.description}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="amount" className="mb-1 block text-xs font-medium text-zinc-700">
            Amount {requiredMark}
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={fieldClassName}
            placeholder="0.00"
          />
          {fieldErrors.amount ? (
            <p className="mt-1.5 text-sm text-red-600">{fieldErrors.amount}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="competitionId" className="mb-1 block text-xs font-medium text-zinc-700">
            Competition
          </label>
          <select
            id="competitionId"
            value={competitionId}
            onChange={(event) => setCompetitionId(event.target.value)}
            className={fieldClassName}
          >
            <option value="">No competition</option>
            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="justification" className="mb-1 block text-xs font-medium text-zinc-700">
          Justification {requiredMark}
        </label>
        <textarea
          id="justification"
          rows={compact ? 2 : 3}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          className={fieldClassName}
          placeholder="Explain why this expense is needed."
        />
        {fieldErrors.justification ? (
          <p className="mt-1.5 text-sm text-red-600">{fieldErrors.justification}</p>
        ) : null}
      </div>

      {saveError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Add Expense"}
      </button>
    </form>
  );
}

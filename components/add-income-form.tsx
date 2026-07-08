"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  INCOME_CATEGORIES,
  type ActiveMemberOption,
  type IncomeCategory,
} from "@/lib/finance";
import { formatMemberName } from "@/lib/members";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const requiredMark = <span className="text-[#990000]">*</span>;

type AddIncomeFormProps = {
  activeMembers: ActiveMemberOption[];
  season: string;
};

export default function AddIncomeForm({ activeMembers, season }: AddIncomeFormProps) {
  const router = useRouter();

  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<IncomeCategory>("dues");
  const [dateApplied, setDateApplied] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [memberId, setMemberId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  const showMemberSelector = category === "dues";

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!source.trim()) {
      errors.source = "Source is required.";
    }

    if (!amount.trim()) {
      errors.amount = "Amount is required.";
    } else if (Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      errors.amount = "Enter a valid amount greater than zero.";
    }

    if (!dateApplied) {
      errors.dateApplied = "Date applied is required.";
    }

    if (!dateReceived) {
      errors.dateReceived = "Date received is required.";
    }

    if (showMemberSelector && !memberId) {
      errors.memberId =
        "Select which member this dues payment is for, so the team can track who's paid.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);

    if (!validateForm() || submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("income_entries").insert({
      season,
      source: source.trim(),
      amount: Number(amount),
      category,
      date_applied: dateApplied,
      date_received: dateReceived,
      payment_method: paymentMethod.trim() || null,
      notes: notes.trim() || null,
      member_id: showMemberSelector && memberId ? memberId : null,
    });

    setLoading(false);
    submitLockRef.current = false;

    if (error) {
      setSaveError(error.message);
      return;
    }

    setSource("");
    setAmount("");
    setCategory("dues");
    setDateApplied("");
    setDateReceived("");
    setPaymentMethod("");
    setNotes("");
    setMemberId("");
    setFieldErrors({});
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="source" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Source {requiredMark}
          </label>
          <input
            id="source"
            type="text"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className={inputClassName}
            placeholder="e.g. Member dues, Garba ticket sales"
          />
          {fieldErrors.source ? (
            <p className="mt-1.5 text-sm text-red-600">{fieldErrors.source}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Amount {requiredMark}
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClassName}
            placeholder="0.00"
          />
          {fieldErrors.amount ? (
            <p className="mt-1.5 text-sm text-red-600">{fieldErrors.amount}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Category {requiredMark}
          </label>
          <select
            id="category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as IncomeCategory);
              if (event.target.value !== "dues") {
                setMemberId("");
              }
            }}
            className={inputClassName}
          >
            {INCOME_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {showMemberSelector ? (
          <div>
            <label htmlFor="memberId" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Member {requiredMark}
            </label>
            <select
              id="memberId"
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
              className={inputClassName}
            >
              <option value="">Select a member</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {formatMemberName(member)}
                </option>
              ))}
            </select>
            {fieldErrors.memberId ? (
              <p className="mt-1.5 text-sm text-red-600">{fieldErrors.memberId}</p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label htmlFor="dateApplied" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Date Applied {requiredMark}
          </label>
          <input
            id="dateApplied"
            type="date"
            value={dateApplied}
            onChange={(event) => setDateApplied(event.target.value)}
            className={inputClassName}
          />
          {fieldErrors.dateApplied ? (
            <p className="mt-1.5 text-sm text-red-600">{fieldErrors.dateApplied}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="dateReceived" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Date Received {requiredMark}
          </label>
          <input
            id="dateReceived"
            type="date"
            value={dateReceived}
            onChange={(event) => setDateReceived(event.target.value)}
            className={inputClassName}
          />
          {fieldErrors.dateReceived ? (
            <p className="mt-1.5 text-sm text-red-600">{fieldErrors.dateReceived}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="paymentMethod" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Payment Method
          </label>
          <input
            id="paymentMethod"
            type="text"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className={inputClassName}
            placeholder="e.g. Venmo, check, cash"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-zinc-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={inputClassName}
          placeholder="Optional details"
        />
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
        {loading ? "Saving..." : "Add Income"}
      </button>
    </form>
  );
}

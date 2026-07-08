"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  EXPENSE_CATEGORIES,
  formatCurrency,
  type CategoryReimbursement,
  type ExpenseCategory,
  type ExpenseRequest,
  type IufbLineItem,
} from "@/lib/finance";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

type EditableIufbLineItem = {
  clientId: string;
  id: string | null;
  description: string;
  approvedAmount: string;
};

type BudgetSetupFormProps = {
  season: string;
  canWrite: boolean;
  generalPoolAvailable: number;
  iufbAvailable: number;
  initialAllocations: Record<ExpenseCategory, string>;
  initialLineItems: IufbLineItem[];
  approvedRequests: Pick<ExpenseRequest, "category" | "amount">[];
  paidReimbursements: CategoryReimbursement[];
};

function createEditableLineItem(
  item?: Pick<IufbLineItem, "id" | "description" | "approved_amount">,
): EditableIufbLineItem {
  return {
    clientId: item?.id ?? crypto.randomUUID(),
    id: item?.id ?? null,
    description: item?.description ?? "",
    approvedAmount:
      item?.approved_amount !== undefined ? String(item.approved_amount) : "",
  };
}

function parseAmount(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed < 0 ? Number.NaN : parsed;
}

export default function BudgetSetupForm({
  season,
  canWrite,
  generalPoolAvailable,
  iufbAvailable,
  initialAllocations,
  initialLineItems,
  approvedRequests,
  paidReimbursements,
}: BudgetSetupFormProps) {
  const router = useRouter();

  const [allocations, setAllocations] =
    useState<Record<ExpenseCategory, string>>(initialAllocations);
  const [lineItems, setLineItems] = useState<EditableIufbLineItem[]>(() =>
    initialLineItems.length > 0
      ? initialLineItems.map((item) => createEditableLineItem(item))
      : [],
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const initialExistingIds = useMemo(
    () => initialLineItems.map((item) => item.id),
    [initialLineItems],
  );

  const categoryRows = EXPENSE_CATEGORIES.map((category) => {
    const allocated = parseAmount(allocations[category.value]) || 0;
    const spentOnExpenses = approvedRequests
      .filter((request) => request.category === category.value)
      .reduce((sum, request) => sum + Number(request.amount), 0);
    const spentOnReimbursements = paidReimbursements
      .filter((reimbursement) => reimbursement.category === category.value)
      .reduce((sum, reimbursement) => sum + Number(reimbursement.amount), 0);
    const spent = spentOnExpenses + spentOnReimbursements;

    return {
      ...category,
      allocated,
      spent,
      remaining: allocated - spent,
    };
  });

  const totalGeneralPoolAllocated = categoryRows.reduce(
    (sum, row) => sum + row.allocated,
    0,
  );

  const totalIufbApproved = lineItems.reduce((sum, item) => {
    const amount = parseAmount(item.approvedAmount);
    return sum + (Number.isNaN(amount) ? 0 : amount);
  }, 0);

  const iufbRemaining = iufbAvailable - totalIufbApproved;

  function updateAllocation(category: ExpenseCategory, value: string) {
    setAllocations((current) => ({
      ...current,
      [category]: value,
    }));
    setSaveSuccess(false);
  }

  function addLineItem() {
    setLineItems((current) => [...current, createEditableLineItem()]);
    setSaveSuccess(false);
  }

  function updateLineItem(
    clientId: string,
    field: "description" | "approvedAmount",
    value: string,
  ) {
    setLineItems((current) =>
      current.map((item) =>
        item.clientId === clientId ? { ...item, [field]: value } : item,
      ),
    );
    setSaveSuccess(false);
  }

  function removeLineItem(clientId: string) {
    setLineItems((current) =>
      current.filter((item) => item.clientId !== clientId),
    );
    setSaveSuccess(false);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWrite) {
      return;
    }

    setSaveError(null);
    setSaveSuccess(false);

    for (const category of EXPENSE_CATEGORIES) {
      const amount = parseAmount(allocations[category.value]);
      if (Number.isNaN(amount)) {
        setSaveError(`Enter a valid amount for ${category.label}.`);
        return;
      }
    }

    for (const item of lineItems) {
      if (!item.description.trim()) {
        setSaveError("Every IUFB line item needs a description.");
        return;
      }

      const amount = parseAmount(item.approvedAmount);
      if (Number.isNaN(amount)) {
        setSaveError("Enter valid approved amounts for all IUFB line items.");
        return;
      }
    }

    if (totalIufbApproved > iufbAvailable) {
      setSaveError(
        "Total IUFB approved exceeds available IUFB income. Reduce line item amounts before saving.",
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const budgetRows = EXPENSE_CATEGORIES.map((category) => ({
      season,
      category: category.value,
      allocated_amount: parseAmount(allocations[category.value]) || 0,
    }));

    const { error: budgetError } = await supabase
      .from("budgets")
      .upsert(budgetRows, { onConflict: "season,category" });

    if (budgetError) {
      setLoading(false);
      setSaveError(budgetError.message);
      return;
    }

    const currentExistingIds = lineItems
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));
    const idsToDelete = initialExistingIds.filter(
      (id) => !currentExistingIds.includes(id),
    );

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("iufb_line_items")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        setLoading(false);
        setSaveError(deleteError.message);
        return;
      }
    }

    for (const item of lineItems) {
      const approvedAmount = parseAmount(item.approvedAmount) || 0;

      if (item.id) {
        const { error } = await supabase
          .from("iufb_line_items")
          .update({
            description: item.description.trim(),
            approved_amount: approvedAmount,
          })
          .eq("id", item.id);

        if (error) {
          setLoading(false);
          setSaveError(error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("iufb_line_items").insert({
          season,
          description: item.description.trim(),
          approved_amount: approvedAmount,
          spent_amount: 0,
        });

        if (error) {
          setLoading(false);
          setSaveError(error.message);
          return;
        }
      }
    }

    setLoading(false);
    setSaveSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              General Pool Category Budgets
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Dues, sponsorships, fundraising, and donations share one pool.
              Set how much to allocate across expense categories.
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 px-4 py-3 text-sm">
            <p className="text-zinc-500">General pool available</p>
            <p className="mt-1 font-semibold text-zinc-900">
              {formatCurrency(generalPoolAvailable)}
            </p>
            <p className="mt-2 text-zinc-500">Total allocated</p>
            <p className="mt-1 font-semibold text-zinc-900">
              {formatCurrency(totalGeneralPoolAllocated)}
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Allocated</th>
                <th className="px-3 py-3 font-medium text-right">Spent</th>
                <th className="px-3 py-3 font-medium text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((row) => (
                <tr key={row.value} className="border-b border-zinc-100">
                  <td className="px-3 py-3 text-zinc-900">{row.label}</td>
                  <td className="px-3 py-3">
                    {canWrite ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={allocations[row.value]}
                        onChange={(event) =>
                          updateAllocation(row.value, event.target.value)
                        }
                        className={inputClassName}
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="font-medium text-zinc-900">
                        {formatCurrency(row.allocated)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-zinc-600">
                    {formatCurrency(row.spent)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-zinc-900">
                    {formatCurrency(row.remaining)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">IUFB Envelope</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Track approved IUFB spending against specific line items. The
              envelope cannot exceed available IUFB income.
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 px-4 py-3 text-sm">
            <p className="text-zinc-500">IUFB available</p>
            <p className="mt-1 font-semibold text-zinc-900">
              {formatCurrency(iufbAvailable)}
            </p>
            <p className="mt-2 text-zinc-500">Total IUFB approved</p>
            <p
              className={`mt-1 font-semibold ${
                totalIufbApproved > iufbAvailable
                  ? "text-red-600"
                  : "text-zinc-900"
              }`}
            >
              {formatCurrency(totalIufbApproved)}
            </p>
            <p className="mt-2 text-zinc-500">Remaining envelope</p>
            <p
              className={`mt-1 font-semibold ${
                iufbRemaining < 0 ? "text-red-600" : "text-[#990000]"
              }`}
            >
              {formatCurrency(iufbRemaining)}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {lineItems.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
              No IUFB line items yet. Add one to start building the envelope.
            </p>
          ) : (
            lineItems.map((item) => (
              <div
                key={item.clientId}
                className="grid gap-3 rounded-lg border border-zinc-200 p-4 md:grid-cols-[1fr_180px_auto]"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Description
                  </label>
                  {canWrite ? (
                    <input
                      type="text"
                      value={item.description}
                      onChange={(event) =>
                        updateLineItem(
                          item.clientId,
                          "description",
                          event.target.value,
                        )
                      }
                      className={inputClassName}
                      placeholder="e.g. Competition travel stipend"
                    />
                  ) : (
                    <p className="text-sm text-zinc-900">{item.description}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Approved Amount
                  </label>
                  {canWrite ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.approvedAmount}
                      onChange={(event) =>
                        updateLineItem(
                          item.clientId,
                          "approvedAmount",
                          event.target.value,
                        )
                      }
                      className={inputClassName}
                      placeholder="0.00"
                    />
                  ) : (
                    <p className="text-sm font-medium text-zinc-900">
                      {formatCurrency(parseAmount(item.approvedAmount) || 0)}
                    </p>
                  )}
                </div>

                {canWrite ? (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.clientId)}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}

          {canWrite ? (
            <button
              type="button"
              onClick={addLineItem}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Add IUFB Line Item
            </button>
          ) : null}
        </div>
      </section>

      {saveError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}

      {saveSuccess ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          Budget saved successfully.
        </div>
      ) : null}

      {canWrite ? (
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Budget"}
        </button>
      ) : null}
    </form>
  );
}

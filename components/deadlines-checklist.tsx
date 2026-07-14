"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DeadlineRow } from "@/lib/deadline-types";
import { isBlockedByHardCutoff, sortDeadlines } from "@/lib/deadline-checklist";
import DeadlineChecklistItem from "@/components/deadline-checklist-item";
import { toUserFacingDeadlineError } from "@/lib/user-facing-errors";

type DeadlinesChecklistProps = {
  competitionId: string;
  deadlines: DeadlineRow[];
  canWrite: boolean;
};

type ManualDeadlineDraft = {
  name: string;
  due_date: string;
  fine_amount: string;
  is_hard_cutoff: boolean;
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const emptyManualDraft: ManualDeadlineDraft = {
  name: "",
  due_date: "",
  fine_amount: "",
  is_hard_cutoff: false,
};

const COLLAPSED_VISIBLE_COUNT = 3;

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function DeadlinesChecklist({
  competitionId,
  deadlines,
  canWrite,
}: DeadlinesChecklistProps) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(deadlines);
  const [error, setError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualDeadlineDraft>(
    emptyManualDraft,
  );
  const [addingManual, setAddingManual] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const sortedRows = useMemo(() => sortDeadlines(rows), [rows]);
  const completeCount = rows.filter((row) => row.status === "complete").length;
  const progressPercent =
    rows.length === 0 ? 0 : Math.round((completeCount / rows.length) * 100);
  const hasMoreThanPreview = sortedRows.length > COLLAPSED_VISIBLE_COUNT;
  const visibleRows =
    expanded || showManualForm || !hasMoreThanPreview
      ? sortedRows
      : sortedRows.slice(0, COLLAPSED_VISIBLE_COUNT);
  const hiddenCount = sortedRows.length - COLLAPSED_VISIBLE_COUNT;

  function replaceRow(updatedRow: DeadlineRow) {
    setRows((current) =>
      current.map((row) => (row.id === updatedRow.id ? updatedRow : row)),
    );
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function syncDeadlineUpdate(
    deadline: DeadlineRow,
    previous: DeadlineRow,
    patch: Pick<DeadlineRow, "status" | "completed_at">,
  ) {
    setSyncingId(deadline.id);

    const { error: updateError } = await supabase
      .from("deadlines")
      .update(patch)
      .eq("id", deadline.id);

    setSyncingId(null);

    if (updateError) {
      replaceRow(previous);
      setError(toUserFacingDeadlineError(updateError));
    }
  }

  function handleCheckboxChange(deadline: DeadlineRow) {
    if (!canWrite) {
      return;
    }

    setError(null);

    if (deadline.status === "complete") {
      const confirmed = window.confirm(
        "Are you sure you want to uncheck this?",
      );
      if (!confirmed) {
        return;
      }

      // completed_at is intentionally left as-is — unchecking is often a correction,
      // not an undo, and clearing it would erase the record of when this was
      // originally completed if it gets checked again later.
      const previous = deadline;
      const optimistic: DeadlineRow = {
        ...deadline,
        status: "pending",
      };

      replaceRow(optimistic);
      void syncDeadlineUpdate(deadline, previous, {
        status: "pending",
        completed_at: deadline.completed_at,
      });
      return;
    }

    if (isBlockedByHardCutoff(deadline)) {
      setError(
        `${deadline.name} is a hard cutoff and its due date has passed — it can no longer be marked complete.`,
      );
      return;
    }

    // Re-completing a deadline that already has a completed_at (i.e. it was
    // previously checked and then unchecked) keeps the original timestamp instead
    // of overwriting it with "now".
    const completedAt = deadline.completed_at ?? new Date().toISOString();
    const previous = deadline;
    const optimistic: DeadlineRow = {
      ...deadline,
      status: "complete",
      completed_at: completedAt,
    };

    replaceRow(optimistic);
    void syncDeadlineUpdate(deadline, previous, {
      status: "complete",
      completed_at: completedAt,
    });
  }

  async function handleAddManualItem() {
    if (!canWrite) {
      return;
    }

    if (!manualDraft.name.trim()) {
      setError("Name is required to add a manual deadline.");
      return;
    }

    setAddingManual(true);
    setError(null);

    const optimisticId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const fineAmount = parseOptionalNumber(manualDraft.fine_amount);
    const optimisticRow: DeadlineRow = {
      id: optimisticId,
      competition_id: competitionId,
      name: manualDraft.name.trim(),
      due_date: manualDraft.due_date || null,
      fine_amount: fineAmount,
      is_hard_cutoff: manualDraft.is_hard_cutoff,
      status: "pending",
      completed_at: null,
      created_at: createdAt,
    };

    setRows((current) => [...current, optimisticRow]);
    setManualDraft(emptyManualDraft);
    setShowManualForm(false);

    const { data, error: insertError } = await supabase
      .from("deadlines")
      .insert({
        competition_id: competitionId,
        name: optimisticRow.name,
        due_date: optimisticRow.due_date,
        fine_amount: optimisticRow.fine_amount,
        is_hard_cutoff: optimisticRow.is_hard_cutoff,
        status: "pending",
        completed_at: null,
      })
      .select("*")
      .single();

    setAddingManual(false);

    if (insertError || !data) {
      removeRow(optimisticId);
      setError(
        insertError
          ? toUserFacingDeadlineError(insertError)
          : "We could not add this deadline. Please try again.",
      );
      setShowManualForm(true);
      setManualDraft(manualDraft);
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.id === optimisticId ? (data as DeadlineRow) : row,
      ),
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Deadlines checklist
          </h2>
          {expanded || showManualForm ? (
            <p className="mt-1 text-sm text-zinc-600">
              Mark deadlines complete as you finish requirements.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {hasMoreThanPreview && !showManualForm ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              {expanded
                ? "Show less"
                : `Show all ${sortedRows.length} deadlines`}
            </button>
          ) : null}
          {canWrite ? (
            <button
              type="button"
              onClick={() => {
                setShowManualForm((current) => {
                  const next = !current;
                  if (next) {
                    setExpanded(true);
                  }
                  return next;
                });
              }}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              {showManualForm ? "Close form" : "Add Manual Item"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-medium text-zinc-900">
            {completeCount} of {rows.length} items complete
          </p>
          <p className="text-zinc-600">{progressPercent}%</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-[#990000] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {showManualForm && canWrite ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Add manual deadline</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block md:col-span-2 xl:col-span-1">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Name
              </span>
              <input
                type="text"
                value={manualDraft.name}
                onChange={(event) =>
                  setManualDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Due date
              </span>
              <input
                type="date"
                value={manualDraft.due_date}
                onChange={(event) =>
                  setManualDraft((current) => ({
                    ...current,
                    due_date: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Fine amount
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualDraft.fine_amount}
                onChange={(event) =>
                  setManualDraft((current) => ({
                    ...current,
                    fine_amount: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="flex items-center gap-2 self-end rounded-lg border border-zinc-200 px-3 py-2">
              <input
                type="checkbox"
                checked={manualDraft.is_hard_cutoff}
                onChange={(event) =>
                  setManualDraft((current) => ({
                    ...current,
                    is_hard_cutoff: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-zinc-300 text-[#990000] focus:ring-[#990000]/20"
              />
              <span className="text-sm text-zinc-700">Hard cutoff</span>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddManualItem}
              disabled={addingManual}
              className="rounded-lg bg-[#990000] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#7a0000] disabled:opacity-60"
            >
              {addingManual ? "Adding..." : "Add deadline"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManualForm(false);
                setManualDraft(emptyManualDraft);
              }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {sortedRows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          No deadlines yet. Extract and confirm packet data, or add a manual item.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {visibleRows.map((deadline) => (
            <DeadlineChecklistItem
              key={deadline.id}
              deadline={deadline}
              onToggle={handleCheckboxChange}
              compact={!expanded && !showManualForm && hasMoreThanPreview}
              showCompletedTimestamp={expanded || showManualForm || !hasMoreThanPreview}
              syncing={syncingId === deadline.id}
              readOnly={!canWrite}
            />
          ))}

          {!expanded && !showManualForm && hasMoreThanPreview ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
            >
              + {hiddenCount} more deadline{hiddenCount === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!canWrite ? (
        <p className="mt-4 text-sm text-amber-800">
          You have read-only access. Only Captain and Team Manager can update deadlines.
        </p>
      ) : null}
    </section>
  );
}

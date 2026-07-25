"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReminderSettings } from "@/lib/reminder-types";

type ReminderSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  settings: ReminderSettings;
  onSaved: (settings: ReminderSettings) => void;
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

function leadDayLabel(day: number) {
  if (day === 0) {
    return "Due date";
  }

  return `${day} day${day === 1 ? "" : "s"} before`;
}

export default function ReminderSettingsDialog({
  open,
  onClose,
  settings,
  onSaved,
}: ReminderSettingsDialogProps) {
  const supabase = useMemo(() => createClient(), []);
  const [leadDays, setLeadDays] = useState<number[]>(settings.lead_days);
  const [newDay, setNewDay] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setLeadDays(settings.lead_days);
      setNewDay("");
      setSaving(false);
      setError(null);
    }

    wasOpenRef.current = open;
  }, [open, settings]);

  if (!open) {
    return null;
  }

  const sortedLeadDays = [...leadDays].sort((a, b) => a - b);

  function handleAddDay() {
    const parsed = Number(newDay);

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 90) {
      setError("Enter a whole number of days between 0 and 90.");
      return;
    }

    setError(null);
    setNewDay("");

    if (leadDays.includes(parsed)) {
      return;
    }

    setLeadDays((current) => [...current, parsed]);
  }

  function handleRemoveDay(day: number) {
    setLeadDays((current) => current.filter((value) => value !== day));
  }

  async function handleSave() {
    if (leadDays.length === 0) {
      setError("Add at least one reminder lead time.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("reminder_settings")
      .update({ lead_days: sortedLeadDays, updated_at: new Date().toISOString() })
      .eq("id", 1);

    setSaving(false);

    if (updateError) {
      setError(
        updateError.message.toLowerCase().includes("row-level security")
          ? "You do not have permission to update reminder settings."
          : "We could not save reminder settings. Please try again.",
      );
      return;
    }

    onSaved({ lead_days: sortedLeadDays });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close reminder settings dialog"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-settings-title"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 id="reminder-settings-title" className="text-xl font-semibold text-zinc-900">
            Deadline reminder emails
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            The HR gmail will receive an email this many days before each
            pending deadline is due.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <p className="text-xs text-zinc-500">
            Each lead time below sends its own email. Adding more than one means
            multiple reminder emails for the same deadline.
          </p>

          <div className="flex flex-wrap gap-2">
            {sortedLeadDays.length === 0 ? (
              <p className="text-sm text-zinc-500">No reminders configured.</p>
            ) : (
              sortedLeadDays.map((day) => (
                <span
                  key={day}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
                >
                  {leadDayLabel(day)}
                  <button
                    type="button"
                    onClick={() => handleRemoveDay(day)}
                    aria-label={`Remove ${leadDayLabel(day).toLowerCase()} reminder`}
                    className="text-zinc-400 transition hover:text-red-600"
                  >
                    &times;
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="flex items-end gap-2">
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Days before due date
              </span>
              <input
                type="number"
                min="0"
                max="90"
                value={newDay}
                onChange={(event) => setNewDay(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddDay();
                  }
                }}
                className={inputClassName}
              />
            </label>
            <button
              type="button"
              onClick={handleAddDay}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Add
            </button>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

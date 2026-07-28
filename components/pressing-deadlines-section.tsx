"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DeadlineRow, PressingDeadlineGroup } from "@/lib/deadline-types";
import type { ReminderSettings } from "@/lib/reminder-types";
import DeadlineChecklistItem from "@/components/deadline-checklist-item";
import ReminderSettingsDialog from "@/components/reminder-settings-dialog";
import { toUserFacingDeadlineError } from "@/lib/user-facing-errors";

type PressingDeadlinesSectionProps = {
  groups: PressingDeadlineGroup[];
  canManageReminders: boolean;
  reminderSettings: ReminderSettings;
};

function removeDeadlineFromGroups(
  groups: PressingDeadlineGroup[],
  deadlineId: string,
) {
  return groups
    .map((group) => ({
      ...group,
      deadlines: group.deadlines.filter((deadline) => deadline.id !== deadlineId),
    }))
    .filter((group) => group.deadlines.length > 0);
}

function updateDeadlineInGroups(
  groups: PressingDeadlineGroup[],
  updatedDeadline: DeadlineRow,
) {
  return groups.map((group) => ({
    ...group,
    deadlines: group.deadlines.map((deadline) =>
      deadline.id === updatedDeadline.id ? updatedDeadline : deadline,
    ),
  }));
}

function getPressingGridClass(count: number) {
  if (count <= 1) {
    return "grid grid-cols-1 gap-4";
  }

  if (count === 2) {
    return "grid grid-cols-1 gap-4 sm:grid-cols-2";
  }

  if (count === 3) {
    return "grid grid-cols-1 gap-4 sm:grid-cols-3";
  }

  return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";
}

export default function PressingDeadlinesSection({
  groups: initialGroups,
  canManageReminders,
  reminderSettings: initialReminderSettings,
}: PressingDeadlinesSectionProps) {
  const supabase = useMemo(() => createClient(), []);
  const [groups, setGroups] = useState(initialGroups);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [reminderSettings, setReminderSettings] = useState(initialReminderSettings);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const setRemindersButton = canManageReminders ? (
    <button
      type="button"
      onClick={() => setReminderDialogOpen(true)}
      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
    >
      Set email reminders
    </button>
  ) : null;

  async function handleToggle(deadline: DeadlineRow) {
    setError(null);
    const snapshot = groups;
    setSyncingId(deadline.id);

    if (deadline.status === "complete") {
      const confirmed = window.confirm(
        "Are you sure you want to uncheck this?",
      );
      if (!confirmed) {
        setSyncingId(null);
        return;
      }

      const optimistic: DeadlineRow = {
        ...deadline,
        status: "pending",
        completed_at: null,
      };

      setGroups((current) => updateDeadlineInGroups(current, optimistic));

      const { error: updateError } = await supabase
        .from("deadlines")
        .update({
          status: "pending",
          completed_at: null,
        })
        .eq("id", deadline.id);

      if (updateError) {
        setGroups(snapshot);
        setError(toUserFacingDeadlineError(updateError));
      }

      setSyncingId(null);
      return;
    }

    const completedAt = new Date().toISOString();
    setGroups((current) => removeDeadlineFromGroups(current, deadline.id));

    const { error: updateError } = await supabase
      .from("deadlines")
      .update({
        status: "complete",
        completed_at: completedAt,
      })
      .eq("id", deadline.id);

    if (updateError) {
      setGroups(snapshot);
      setError(toUserFacingDeadlineError(updateError));
    }

    setSyncingId(null);
  }

  if (groups.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Pressing deadlines</h2>
          {setRemindersButton}
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          No pending deadlines right now. Confirm packet data on a competition to
          build a checklist.
        </p>
        {canManageReminders ? (
          <ReminderSettingsDialog
            open={reminderDialogOpen}
            onClose={() => setReminderDialogOpen(false)}
            settings={reminderSettings}
            onSaved={setReminderSettings}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Pressing deadlines</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Most urgent pending deadlines across active competitions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/team-manager/competitions"
            className="text-sm font-medium text-[#990000] hover:underline"
          >
            View all competitions
          </Link>
          {setRemindersButton}
        </div>
      </div>

      <div className={`mt-4 ${getPressingGridClass(groups.length)}`}>
        {groups.map((group) => (
          <div
            key={group.competitionId}
            className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3"
          >
            <Link
              href={`/team-manager/competitions/${group.competitionId}`}
              className="block truncate text-sm font-semibold text-[#990000] hover:underline"
            >
              {group.competitionName}
            </Link>
            <div className="mt-3 space-y-2">
              {group.deadlines.map((deadline) => (
                <DeadlineChecklistItem
                  key={deadline.id}
                  deadline={deadline}
                  onToggle={handleToggle}
                  compact
                  showCompletedTimestamp={false}
                  syncing={syncingId === deadline.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {canManageReminders ? (
        <ReminderSettingsDialog
          open={reminderDialogOpen}
          onClose={() => setReminderDialogOpen(false)}
          settings={reminderSettings}
          onSaved={setReminderSettings}
        />
      ) : null}
    </section>
  );
}

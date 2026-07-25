import type { DeadlineRow } from "@/lib/deadline-types";

export type DueReminder = {
  deadline: DeadlineRow;
  leadDays: number;
};

export function reminderKey(deadlineId: string, leadDays: number) {
  return `${deadlineId}:${leadDays}`;
}

// Duplicated from lib/deadline-checklist.ts's dayDiff rather than imported —
// this file is unit-tested via a direct `node --test` import, which can't
// resolve the "@/lib/..." path alias that only webpack/tsc understand.
function dayDiff(from: Date, to: Date) {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

/** A deadline is due for a reminder when today is exactly `leadDays` before its
 *  due date — not "within" that window — so each configured lead time fires
 *  once, on its own day, rather than every day counting down to the deadline. */
export function findDeadlinesDueForReminder(
  deadlines: DeadlineRow[],
  leadDays: number[],
  alreadySentKeys: Set<string>,
  today = new Date(),
): DueReminder[] {
  const due: DueReminder[] = [];

  for (const deadline of deadlines) {
    if (deadline.status !== "pending" || !deadline.due_date) {
      continue;
    }

    const dueDate = new Date(`${deadline.due_date}T00:00:00`);
    const daysUntilDue = dayDiff(today, dueDate);

    for (const lead of leadDays) {
      if (daysUntilDue !== lead) {
        continue;
      }

      if (alreadySentKeys.has(reminderKey(deadline.id, lead))) {
        continue;
      }

      due.push({ deadline, leadDays: lead });
    }
  }

  return due;
}

import type { DeadlineRow } from "@/lib/deadline-types";

export type ReminderEmailContext = {
  deadline: DeadlineRow;
  leadDays: number;
  competitionName: string;
  competitionUrl: string;
};

// Duplicated from lib/deadline-checklist.ts rather than imported — this file is
// unit-tested via a direct `node --test` import, which can't resolve the
// "@/lib/..." path alias that only webpack/tsc understand.
function formatDueDate(date: string | null) {
  if (!date) {
    return "No due date";
  }

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number | null) {
  if (amount == null) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function leadDaysLabel(leadDays: number) {
  if (leadDays === 0) {
    return "today";
  }

  return `in ${leadDays} day${leadDays === 1 ? "" : "s"}`;
}

export function buildReminderEmailSubject({
  deadline,
  leadDays,
  competitionName,
}: ReminderEmailContext) {
  return `Deadline due ${leadDaysLabel(leadDays)}: ${deadline.name} (${competitionName})`;
}

export function buildReminderEmailHtml({
  deadline,
  leadDays,
  competitionName,
  competitionUrl,
}: ReminderEmailContext) {
  const fine = formatCurrency(deadline.fine_amount);

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <p style="font-size: 16px; color: #18181b;">
        <strong>${deadline.name}</strong> is due ${leadDaysLabel(leadDays)}
        for <strong>${competitionName}</strong>.
      </p>
      <p style="font-size: 14px; color: #3f3f46;">
        Due ${formatDueDate(deadline.due_date)}${fine ? ` &middot; Fine ${fine} if missed` : ""}
      </p>
      <p style="margin-top: 24px;">
        <a
          href="${competitionUrl}"
          style="background-color: #990000; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;"
        >
          View competition
        </a>
      </p>
    </div>
  `;
}

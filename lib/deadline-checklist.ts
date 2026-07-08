import type { DeadlineRow } from "@/lib/deadline-types";

export function dayDiff(from: Date, to: Date) {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

export function isOverdue(deadline: DeadlineRow, today = new Date()) {
  if (deadline.status === "complete" || !deadline.due_date) {
    return false;
  }

  const due = new Date(`${deadline.due_date}T00:00:00`);
  return dayDiff(today, due) < 0;
}

/** Due within 48 hours. due_date has no time component, so this is measured in
 *  whole days — due today, tomorrow, or the day after counts as "due soon." */
export function isDueSoon(deadline: DeadlineRow, today = new Date()) {
  if (deadline.status === "complete" || !deadline.due_date) {
    return false;
  }

  const due = new Date(`${deadline.due_date}T00:00:00`);
  const daysUntilDue = dayDiff(today, due);
  return daysUntilDue >= 0 && daysUntilDue <= 2;
}

export function sortDeadlines(rows: DeadlineRow[]) {
  const today = new Date();

  function bucket(deadline: DeadlineRow) {
    if (deadline.status === "complete") {
      return 2;
    }

    if (deadline.due_date && isOverdue(deadline, today)) {
      return 0;
    }

    return 1;
  }

  function sortKey(deadline: DeadlineRow) {
    if (deadline.status === "complete") {
      return deadline.completed_at ?? deadline.due_date ?? deadline.created_at;
    }

    return deadline.due_date ?? "9999-12-31";
  }

  return [...rows].sort((left, right) => {
    const bucketDiff = bucket(left) - bucket(right);
    if (bucketDiff !== 0) {
      return bucketDiff;
    }

    const leftKey = sortKey(left);
    const rightKey = sortKey(right);

    if (bucket(left) === 2) {
      return rightKey.localeCompare(leftKey);
    }

    return leftKey.localeCompare(rightKey);
  });
}

export function formatDueDate(date: string | null) {
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

export function formatCurrency(amount: number | null) {
  if (amount == null) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatCompletedAt(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return "Completed";
  }

  const formatted = parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `Completed ${formatted}`;
}

export function getRowTone(deadline: DeadlineRow, today = new Date()) {
  if (deadline.status === "complete") {
    return "border-green-200 bg-green-50";
  }

  if (isOverdue(deadline, today)) {
    return "border-red-200 bg-red-50";
  }

  if (isDueSoon(deadline, today)) {
    return "border-amber-200 bg-amber-50";
  }

  return "border-zinc-200 bg-white";
}

import type { DeadlineRow, PressingDeadlineGroup } from "@/lib/deadline-types";
import { dayDiff, sortDeadlines } from "@/lib/deadline-checklist";

const MAX_COMPETITIONS = 4;
const MAX_DEADLINES_PER_COMPETITION = 4;

type DeadlineWithCompetition = DeadlineRow & {
  competitions:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

function getCompetition(
  competitions: DeadlineWithCompetition["competitions"],
) {
  if (!competitions) {
    return null;
  }

  return Array.isArray(competitions) ? (competitions[0] ?? null) : competitions;
}

function mostUrgentDueDate(deadlines: DeadlineRow[]) {
  const sorted = sortDeadlines(
    deadlines.filter((deadline) => deadline.status === "pending"),
  );
  const first = sorted[0];

  if (!first?.due_date) {
    return "9999-12-31";
  }

  return first.due_date;
}

function competitionUrgency(deadlines: DeadlineRow[]) {
  const pending = deadlines.filter((deadline) => deadline.status === "pending");
  const sorted = sortDeadlines(pending);
  const first = sorted[0];

  if (!first?.due_date) {
    return Number.MAX_SAFE_INTEGER;
  }

  const due = new Date(`${first.due_date}T00:00:00`);
  return dayDiff(new Date(), due);
}

export function buildPressingDeadlineGroups(
  rows: DeadlineWithCompetition[],
): PressingDeadlineGroup[] {
  const byCompetition = new Map<
    string,
    { name: string; deadlines: DeadlineRow[] }
  >();

  for (const row of rows) {
    const competition = getCompetition(row.competitions);
    if (row.status !== "pending" || !competition) {
      continue;
    }

    const existing = byCompetition.get(row.competition_id) ?? {
      name: competition.name,
      deadlines: [],
    };

    const { competitions: _competitions, ...deadline } = row;
    existing.deadlines.push(deadline);
    byCompetition.set(row.competition_id, existing);
  }

  const groups = [...byCompetition.entries()]
    .map(([competitionId, { name, deadlines }]) => ({
      competitionId,
      competitionName: name,
      deadlines: sortDeadlines(deadlines).slice(0, MAX_DEADLINES_PER_COMPETITION),
      urgency: competitionUrgency(deadlines),
      sortKey: mostUrgentDueDate(deadlines),
    }))
    .sort((left, right) => {
      if (left.urgency !== right.urgency) {
        return left.urgency - right.urgency;
      }

      return left.sortKey.localeCompare(right.sortKey);
    })
    .slice(0, MAX_COMPETITIONS)
    .map(({ competitionId, competitionName, deadlines }) => ({
      competitionId,
      competitionName,
      deadlines,
    }));

  return groups;
}

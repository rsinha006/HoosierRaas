export type CompetitionStatus = "upcoming" | "active" | "complete";

export type Competition = {
  id: string;
  created_at: string;
  season: string;
  name: string;
  competition_date: string;
  venue: string | null;
  location: string | null;
  min_performance_duration: number | null;
  max_performance_duration: number | null;
  mix_format: string | null;
  roster_min: number | null;
  roster_max: number | null;
  per_person_registration_cost: number | null;
  tech_rehearsal_required: boolean | null;
  status: CompetitionStatus;
  packet_url: string | null;
  packet_uploaded_at: string | null;
};

export const COMPETITION_STATUSES: CompetitionStatus[] = [
  "upcoming",
  "active",
  "complete",
];

export function formatCompetitionDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Whether a competition date falls outside the season it is being filed under.
 *
 * Nothing checked this, so the list holds a competition dated June 2006 and
 * another dated March 2025, both filed under 2025-2026 - and both show up in
 * the public expense and reimbursement dropdowns a dancer picks from.
 *
 * Both bounds are inclusive: a competition on the first or last day of the
 * season belongs to it. Dates are ISO (YYYY-MM-DD) throughout, which compares
 * correctly as text and avoids re-reading the season boundary through a
 * timezone. A missing date is left to the required-field check, and missing
 * season bounds mean there is nothing to measure against.
 */
export function isOutsideSeasonWindow(
  competitionDate: string,
  startsOn: string | null | undefined,
  endsOn: string | null | undefined,
) {
  if (!competitionDate || !startsOn || !endsOn) {
    return false;
  }

  return competitionDate < startsOn || competitionDate > endsOn;
}

export function formatSeasonWindow(startsOn: string, endsOn: string) {
  return `${formatCompetitionDate(startsOn)} to ${formatCompetitionDate(endsOn)}`;
}

export function formatCompetitionStatus(status: CompetitionStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatDurationRange(
  min: number | null,
  max: number | null,
) {
  if (min == null && max == null) {
    return null;
  }

  if (min != null && max != null) {
    return `${min}–${max} min`;
  }

  if (min != null) {
    return `${min}+ min`;
  }

  return `Up to ${max} min`;
}

export function formatRosterRange(min: number | null, max: number | null) {
  if (min == null && max == null) {
    return null;
  }

  if (min != null && max != null) {
    return `${min}–${max}`;
  }

  if (min != null) {
    return `${min}+`;
  }

  return `Up to ${max}`;
}

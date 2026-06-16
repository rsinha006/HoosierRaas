export type CompetitionStatus = "upcoming" | "active" | "complete";

export type Competition = {
  id: string;
  created_at: string;
  name: string;
  competition_date: string;
  venue: string | null;
  location: string | null;
  min_performance_duration: number | null;
  max_performance_duration: number | null;
  mix_format: string | null;
  roster_min: number | null;
  roster_max: number | null;
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

export const PRACTICE_SESSION_TYPES = [
  "practice",
  "fundraiser",
  "exec meeting",
] as const;

export type PracticeSessionType = (typeof PRACTICE_SESSION_TYPES)[number];

export const PRACTICE_SESSION_STATUSES = ["open", "closed"] as const;

export type PracticeSessionStatus = (typeof PRACTICE_SESSION_STATUSES)[number];

export const ATTENDANCE_STATUSES = [
  "present",
  "late",
  "absent_excused",
  "absent_unexcused",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const PRACTICE_VIDEO_STATUSES = ["on_time", "late", "missing"] as const;

export type PracticeVideoStatus = (typeof PRACTICE_VIDEO_STATUSES)[number];

export type PracticeSession = {
  id: string;
  created_at: string;
  season: string;
  session_date: string;
  session_time: string;
  type: PracticeSessionType;
  response_window_closes_at: string;
  status: PracticeSessionStatus;
  shareable_token: string;
};

export type AttendanceRecord = {
  id: string;
  created_at: string;
  session_id: string;
  member_id: string | null;
  respondent_name: string;
  respondent_email: string;
  attendance_status: AttendanceStatus;
  excuse_text: string | null;
  advance_notice: boolean;
  is_emergency: boolean;
  response_timestamp: string;
  overridden: boolean;
  override_reason: string | null;
  original_attendance_status: AttendanceStatus | null;
  practice_video_status: PracticeVideoStatus | null;
  practice_video_excuse: string | null;
  auto_flagged: boolean;
};

export type AttendanceChoice = "attended" | "late" | "absent";

export type PublicAttendanceSession = {
  id: string;
  session_date: string;
  session_time: string;
  type: PracticeSessionType;
  status: PracticeSessionStatus;
  response_window_closes_at: string;
  is_accepting_responses: boolean;
};

export type PracticeSessionWithResponseCount = PracticeSession & {
  response_count: number;
};

const SESSION_TYPE_LABELS: Record<PracticeSessionType, string> = {
  practice: "Practice",
  fundraiser: "Fundraiser",
  "exec meeting": "Exec Meeting",
};

const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  absent_excused: "Absent (Excused)",
  absent_unexcused: "Absent (Unexcused)",
};

export function formatSessionType(type: PracticeSessionType) {
  return SESSION_TYPE_LABELS[type];
}

export function formatAttendanceStatus(status: AttendanceStatus) {
  return ATTENDANCE_STATUS_LABELS[status];
}

const ATTENDANCE_STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-800",
  late: "bg-amber-100 text-amber-800",
  absent_excused: "bg-blue-100 text-blue-800",
  absent_unexcused: "bg-red-100 text-red-800",
};

export function getAttendanceStatusStyle(status: AttendanceStatus) {
  return ATTENDANCE_STATUS_STYLES[status];
}

/** There's no distinct "no response" status in the database — a no-show gets
 *  stored as absent_unexcused with auto_flagged=true, which is correct for
 *  contract scoring (a no-show should count against the limit) but looks
 *  identical to a dancer who explicitly said "I didn't attend, no excuse."
 *  Overriding doesn't clear auto_flagged, so also check overridden. */
export function isDisplayedAsNoResponse(autoFlagged: boolean, overridden: boolean) {
  return autoFlagged && !overridden;
}

export function formatAttendanceStatusForDisplay(
  status: AttendanceStatus,
  isNoResponse: boolean,
) {
  return isNoResponse ? "No Response" : formatAttendanceStatus(status);
}

export function getAttendanceStatusStyleForDisplay(
  status: AttendanceStatus,
  isNoResponse: boolean,
) {
  return isNoResponse ? "bg-zinc-200 text-zinc-700" : getAttendanceStatusStyle(status);
}

export function formatResponseTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function getAudienceLabel(sessionType: PracticeSessionType) {
  return sessionType === "exec meeting" ? "exec members" : "dancers";
}

export function formatSessionTime(time: string) {
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getAttendUrl(shareableToken: string, origin?: string) {
  const base = origin ?? "";
  return `${base}/attend/${shareableToken}`;
}

export function requiresExcuseDetails(status: AttendanceStatus) {
  return status === "absent_excused" || status === "absent_unexcused";
}

export function requiresExcuseForChoice(choice: AttendanceChoice) {
  return choice === "late" || choice === "absent";
}

export function isVideoDeadlineDay(date: Date = new Date()) {
  const day = date.getDay();
  return day === 0 || day === 4;
}

export function getPracticeVideoStatusLabel(status: PracticeVideoStatus | null) {
  switch (status) {
    case "on_time":
      return "Submitted on time";
    case "late":
      return "Submitted late";
    case "missing":
      return "Missing";
    default:
      return "—";
  }
}

export function mapAttendanceChoiceToStatus(
  choice: AttendanceChoice,
  advanceNotice: boolean,
  isEmergency: boolean,
): AttendanceStatus {
  if (choice === "attended") {
    return "present";
  }

  if (choice === "late") {
    return "late";
  }

  if (advanceNotice || isEmergency) {
    return "absent_excused";
  }

  return "absent_unexcused";
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidShareableToken(token: string) {
  return UUID_PATTERN.test(token);
}

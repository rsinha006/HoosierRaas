import { formatMemberName, type ExecTitle } from "@/lib/members";

export const ASSIGNABLE_EXEC_TITLES = [
  { value: "captain", label: "Captain" },
  { value: "team_manager", label: "Team Manager" },
  { value: "finance", label: "Finance" },
] as const;

export type AssignableExecTitle = (typeof ASSIGNABLE_EXEC_TITLES)[number]["value"];

/** Sentinel value for the role dropdown meaning "remove exec access, keep the login." */
export const NONE_ROLE_VALUE = "none" as const;

export const ROLE_SELECT_OPTIONS = [
  { value: NONE_ROLE_VALUE, label: "No access" },
  ...ASSIGNABLE_EXEC_TITLES,
] as const;

export type RoleSelectValue = (typeof ROLE_SELECT_OPTIONS)[number]["value"];

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  exec_title: ExecTitle | null;
  member_id: string | null;
  on_roster: boolean;
  access_status: "pending" | "active";
};

export function mergeExecRole(roles: string[]): string[] {
  return roles.includes("exec") ? roles : [...roles, "exec"];
}

export function splitFullName(fullName: string | null): {
  firstName: string;
  lastName: string;
} {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) {
    return { firstName: "User", lastName: "-" };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName: firstName || "User",
    lastName: rest.join(" ") || "-",
  };
}

export function isAssignableExecTitle(value: string): value is AssignableExecTitle {
  return ASSIGNABLE_EXEC_TITLES.some((title) => title.value === value);
}

/** The titles that can administer HROS - including handing out roles. Finance
 *  writes to Finance only, so it cannot restore anyone's access. */
export const ADMIN_EXEC_TITLES = ["captain", "team_manager"] as const;

export function isAdminExecTitle(value: string | null | undefined): boolean {
  return (ADMIN_EXEC_TITLES as readonly string[]).includes(value ?? "");
}

/**
 * Whether a role change would leave the season with nobody who can hand out
 * roles.
 *
 * Only Captain and Team Manager can assign access, so once the last one is
 * demoted or revoked - including by themselves, which nothing prevented - there
 * is no way back in through the app and the org needs direct database access to
 * recover. A confirmation prompt does not help here: the person means to do it,
 * they just cannot see that it is one-way.
 *
 * Handing off still works, because it goes the other way round: promote the
 * successor first, then step down.
 */
export function wouldRemoveLastAdmin(
  currentExecTitle: string | null | undefined,
  nextExecTitle: string | null | undefined,
  otherAdminCount: number,
): boolean {
  if (!isAdminExecTitle(currentExecTitle)) {
    return false;
  }

  if (isAdminExecTitle(nextExecTitle)) {
    return false;
  }

  return otherAdminCount === 0;
}

/**
 * Type-to-confirm check for permission changes. Trimmed and case-insensitive:
 * the point is to force the person to look at whose row they are on, not to
 * test their typing.
 */
export function matchesConfirmationName(typed: string, expected: string): boolean {
  const target = expected.trim().toLowerCase();

  if (!target) {
    return false;
  }

  return typed.trim().toLowerCase() === target;
}

export function buildUserRowFromProfile(
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
  },
  member?: {
    id: string;
    exec_title: string | null;
    roles: string[];
    first_name: string;
    last_name: string;
  } | null,
): UserRow {
  const execTitle = (member?.exec_title as ExecTitle | null) ?? null;
  const hasAccess =
    !!execTitle && Array.isArray(member?.roles) && member.roles.includes("exec");

  // The roster (members table) is the source of truth for someone's name — prefer
  // it over the signup full_name whenever this login is linked to a roster member.
  const fullName = member ? formatMemberName(member) : profile.full_name;

  return {
    id: profile.id,
    email: profile.email.toLowerCase(),
    full_name: fullName,
    created_at: profile.created_at,
    exec_title: execTitle,
    member_id: member?.id ?? null,
    on_roster: !!member,
    access_status: hasAccess ? "active" : "pending",
  };
}

export function buildUserRows(
  profiles: Array<{
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
  }>,
  membersByEmail: Map<
    string,
    { id: string; exec_title: string | null; roles: string[]; first_name: string; last_name: string }
  >,
): UserRow[] {
  return profiles.map((profile) =>
    buildUserRowFromProfile(profile, membersByEmail.get(profile.email.toLowerCase())),
  );
}

import type { ExecTitle } from "@/lib/members";

export const ASSIGNABLE_EXEC_TITLES = [
  { value: "captain", label: "Captain" },
  { value: "team_manager", label: "Team Manager" },
  { value: "finance", label: "Finance" },
] as const;

export type AssignableExecTitle = (typeof ASSIGNABLE_EXEC_TITLES)[number]["value"];

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

export function buildUserRowFromProfile(
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
  },
  member?: { id: string; exec_title: string | null; roles: string[] } | null,
): UserRow {
  const execTitle = (member?.exec_title as ExecTitle | null) ?? null;
  const hasAccess =
    !!execTitle && Array.isArray(member?.roles) && member.roles.includes("exec");

  return {
    id: profile.id,
    email: profile.email.toLowerCase(),
    full_name: profile.full_name,
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
    { id: string; exec_title: string | null; roles: string[] }
  >,
): UserRow[] {
  return profiles.map((profile) =>
    buildUserRowFromProfile(profile, membersByEmail.get(profile.email.toLowerCase())),
  );
}

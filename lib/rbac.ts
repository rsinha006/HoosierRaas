import type { ExecTitle } from "@/lib/members";

export type AppModuleId =
  | "dashboard"
  | "team-manager"
  | "finance"
  | "attendance"
  | "members";

const FULL_WRITE_TITLES: ExecTitle[] = ["captain", "team_manager"];

export function hasWriteAccess(
  execTitle: ExecTitle | string | null,
  module: AppModuleId,
): boolean {
  if (!execTitle) {
    return false;
  }

  if (FULL_WRITE_TITLES.includes(execTitle as ExecTitle)) {
    return true;
  }

  if (execTitle === "finance") {
    return module === "finance";
  }

  return false;
}

export function isExecMember(roles: string[]) {
  return roles.includes("exec");
}

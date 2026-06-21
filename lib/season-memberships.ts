import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExecTitle, MemberStatus } from "@/lib/members";

export type SeasonMembership = {
  id: string;
  member_id: string;
  season: string;
  status: MemberStatus;
  exec_title: ExecTitle | null;
  created_at: string;
};

const ACCESS_EXEC_TITLES = new Set(["captain", "team_manager", "finance"]);

export function normalizeMembershipExecTitle(
  value: string | null | undefined,
): ExecTitle | null {
  if (!value || !ACCESS_EXEC_TITLES.has(value)) {
    return null;
  }

  return value as ExecTitle;
}

export async function fetchExecTitleByMemberId(
  supabase: SupabaseClient,
  activeSeasonLabel: string,
): Promise<Map<string, string | null>> {
  const { data, error } = await supabase
    .from("season_memberships")
    .select("member_id, exec_title")
    .eq("season", activeSeasonLabel);

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((row) => [row.member_id, row.exec_title as string | null]),
  );
}

export async function getActiveSeasonMembershipExecTitle(
  supabase: SupabaseClient,
  memberId: string,
  activeSeasonLabel: string,
): Promise<ExecTitle | null> {
  const { data, error } = await supabase
    .from("season_memberships")
    .select("exec_title")
    .eq("member_id", memberId)
    .eq("season", activeSeasonLabel)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeMembershipExecTitle(data?.exec_title);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Member } from "@/lib/members";
import type { MemberSummary } from "@/lib/attendance-stats";

/**
 * The people a season's attendance is measured against.
 *
 * The members table is not season-scoped: a dancer added in any season stays in
 * it as "active" forever. season_memberships is what the Members page treats as
 * the roster, so attendance has to read the same thing - otherwise the team
 * percentage, the "x of y responded" rates and the absence alerts are all
 * computed over a larger, invisible population and cannot be reconciled against
 * the roster anyone actually manages.
 *
 * Matches the Members page definition exactly: this season's memberships, still
 * active, excluding submissions that are awaiting onboarding review.
 */

type SeasonMembershipRow = {
  members: Member | Member[];
};

function getJoinedMember(row: SeasonMembershipRow): Member | null {
  const member = Array.isArray(row.members) ? row.members[0] : row.members;
  return member ?? null;
}

export async function fetchSeasonRoster(
  supabase: SupabaseClient,
  season: string,
): Promise<{ data: MemberSummary[]; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from("season_memberships")
    .select(
      `
      members!inner (
        id,
        first_name,
        last_name,
        email,
        roles
      )
    `,
    )
    .eq("season", season)
    .eq("status", "active")
    .eq("members.pending_review", false);

  if (error) {
    return { data: [], error };
  }

  const roster = ((data ?? []) as unknown as SeasonMembershipRow[])
    .map(getJoinedMember)
    .filter((member): member is Member => member !== null)
    .map((member) => ({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      roles: Array.isArray(member.roles) ? member.roles : [],
    }))
    .sort(
      (left, right) =>
        left.last_name.localeCompare(right.last_name) ||
        left.first_name.localeCompare(right.first_name),
    );

  return { data: roster, error: null };
}

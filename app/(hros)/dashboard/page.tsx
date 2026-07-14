import ArchiveSeasonLauncher from "@/components/archive-season-launcher";
import DashboardSeasonsList from "@/components/dashboard-seasons-list";
import {
  isAssignableExecTitleValue,
  type ArchiveRosterMember,
} from "@/lib/archive-season";
import { loadArchiveFinancePreview } from "@/lib/archive-season-server";
import { getUserMember } from "@/lib/get-user-member";
import { formatMemberName, type Member } from "@/lib/members";
import { getActiveSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

type SeasonMembershipRow = {
  status: ArchiveRosterMember["status"];
  exec_title: string | null;
  members: Member | Member[];
};

function getJoinedMember(row: SeasonMembershipRow): Member {
  return Array.isArray(row.members) ? row.members[0] : row.members;
}

function buildArchiveRoster(
  rows: SeasonMembershipRow[],
  loginEmails: Set<string>,
): ArchiveRosterMember[] {
  return rows
    .map((row) => {
      const member = getJoinedMember(row);

      return {
        memberId: member.id,
        name: formatMemberName(member),
        email: member.email,
        status: row.status,
        execTitle: isAssignableExecTitleValue(row.exec_title) ? row.exec_title : null,
        hasExecRole: Array.isArray(member.roles) && member.roles.includes("exec"),
        hasLogin: loginEmails.has(member.email.toLowerCase()),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

type DashboardPageProps = {
  searchParams: Promise<{
    season_archived?: string;
    login_delete_warnings?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const archivedSeasonLabel = params.season_archived;
  const showLoginDeleteWarning = params.login_delete_warnings === "1";

  const supabase = await createClient();
  const [userMember, activeSeason] = await Promise.all([
    getUserMember(),
    getActiveSeason(),
  ]);

  const canArchive =
    userMember?.exec_title === "captain" ||
    userMember?.exec_title === "team_manager";

  const [
    { data: seasonsData, error: seasonsError },
    { data: membershipData, error: rosterError },
    { data: profileData, error: profilesError },
    financePreview,
  ] = await Promise.all([
    supabase.from("seasons").select("*").order("starts_on", { ascending: false }),
    supabase
      .from("season_memberships")
      .select(
        `
        status,
        exec_title,
        members!inner (
          id,
          first_name,
          last_name,
          email,
          roles
        )
      `,
      )
      .eq("season", activeSeason.label),
    supabase.from("profiles").select("email"),
    loadArchiveFinancePreview(activeSeason),
  ]);

  const loginEmails = new Set(
    (profileData ?? [])
      .map((profile) => profile.email?.toLowerCase())
      .filter((email): email is string => !!email),
  );

  const seasons = seasonsData ?? [];
  const roster = buildArchiveRoster(
    (membershipData ?? []) as SeasonMembershipRow[],
    loginEmails,
  );
  const error = seasonsError ?? rosterError ?? profilesError;

  return (
    <div className="space-y-6">
      {archivedSeasonLabel ? (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50 px-6 py-4 text-green-800"
        >
          <p className="font-medium">
            Season archived successfully. {archivedSeasonLabel} is now the current season.
          </p>
          {showLoginDeleteWarning ? (
            <p className="mt-1 text-sm">
              The season transition completed, but one or more login deletions failed.
              Review the Users tab and remove any remaining accounts manually.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
            <p className="mt-2 text-zinc-600">
              Season overview for HoosierRaas. Current season: {activeSeason.label}.
            </p>
          </div>

          {canArchive ? (
            <ArchiveSeasonLauncher
              activeSeasonLabel={activeSeason.label}
              roster={roster}
              financePreview={financePreview}
            />
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load dashboard data</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      ) : (
        <DashboardSeasonsList seasons={seasons} />
      )}
    </div>
  );
}

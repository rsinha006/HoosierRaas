import Link from "next/link";
import MembersTable from "@/components/members-table";
import AddMemberButton from "@/components/add-member-button";
import OnboardingLinkGenerator from "@/components/onboarding-link-generator";
import PendingOnboardingReviews from "@/components/pending-onboarding-reviews";
import MemberExportLog from "@/components/member-export-log";
import { getUserMember } from "@/lib/get-user-member";
import {
  MEMBER_EXPORT_LOG_LIMIT,
  type MemberExportLogEntry,
} from "@/lib/member-export-log";
import { formatMemberName, type Member, type MemberStatus } from "@/lib/members";
import { getActiveSeason, getViewingSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";
import { hasWriteAccess } from "@/lib/rbac";

type MembersPageProps = {
  searchParams: Promise<{ created?: string; season?: string }>;
};

type SeasonMembershipMemberRow = {
  status: MemberStatus;
  exec_title: string | null;
  members: Member | Member[];
};

function getJoinedMember(row: SeasonMembershipMemberRow): Member {
  return Array.isArray(row.members) ? row.members[0] : row.members;
}

function mergeMemberWithSeasonMembership(row: SeasonMembershipMemberRow): Member {
  const member = getJoinedMember(row);
  return {
    ...member,
    status: row.status,
    exec_title: row.exec_title,
  };
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const showSuccess = params.created === "1";
  const { label: season } = await getViewingSeason(params.season);
  const { label: activeSeason } = await getActiveSeason();

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  const canManageOnboarding = hasWriteAccess(
    userMember?.exec_title ?? null,
    "members",
  );

  const [
    { data, error },
    { data: pendingData, error: pendingError },
    { data: exportLogData, error: exportLogError },
  ] = await Promise.all([
    supabase
      .from("season_memberships")
      .select(
        `
        status,
        exec_title,
        members!inner (*)
      `,
      )
      .eq("season", season)
      .eq("members.pending_review", false),
    canManageOnboarding
      ? supabase
          .from("members")
          .select("*")
          .eq("pending_review", true)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("member_export_log")
      .select("*")
      .order("exported_at", { ascending: false })
      .limit(MEMBER_EXPORT_LOG_LIMIT),
  ]);

  const members = ((data ?? []) as SeasonMembershipMemberRow[])
    .map(mergeMemberWithSeasonMembership)
    .sort((left, right) => {
      const lastNameCompare = left.last_name.localeCompare(right.last_name);
      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }

      return left.first_name.localeCompare(right.first_name);
    });
  const pendingMembers = (pendingData ?? []) as Member[];
  const exportLogEntries = (exportLogData ?? []) as MemberExportLogEntry[];

  // The log stores bare member ids, so it needs names to be readable. Most of those
  // ids belong to people already loaded above, so seed from them and only spend a
  // round trip on the leftovers — alumni exported in a past season, or an exporter
  // who has since rolled off the roster.
  const memberNames: Record<string, string> = {};
  for (const member of [...members, ...pendingMembers]) {
    memberNames[member.id] = formatMemberName(member);
  }

  const unresolvedMemberIds = [
    ...new Set(
      exportLogEntries
        .flatMap((entry) => [entry.exported_by_member_id, ...entry.member_ids])
        .filter((id): id is string => !!id && !memberNames[id]),
    ),
  ];

  if (unresolvedMemberIds.length > 0) {
    const { data: exportedMemberData } = await supabase
      .from("members")
      .select("id, first_name, last_name")
      .in("id", unresolvedMemberIds);

    const exportedMembers = (exportedMemberData ?? []) as Pick<
      Member,
      "id" | "first_name" | "last_name"
    >[];

    for (const member of exportedMembers) {
      memberNames[member.id] = formatMemberName(member);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Members</h1>
            <p className="mt-2 text-zinc-600">Team roster for the {season} season</p>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-start">
            <AddMemberButton />
            {canManageOnboarding ? <OnboardingLinkGenerator /> : null}
          </div>
        </div>
      </div>

      {showSuccess && (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50 px-6 py-4 text-green-800"
        >
          <p className="font-medium">Member created successfully.</p>
          <p className="mt-1 text-sm">
            The new member has been added to the roster.
          </p>
        </div>
      )}

      {canManageOnboarding ? (
        pendingError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-medium">Could not load pending reviews</p>
            <p className="mt-1 text-sm">{pendingError.message}</p>
          </div>
        ) : (
          <PendingOnboardingReviews
            members={pendingMembers}
            canWrite={canManageOnboarding}
            activeSeason={activeSeason}
          />
        )
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load members</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <MembersTable
            members={members}
            canDelete={canManageOnboarding}
            canExport={canManageOnboarding}
            currentMemberId={userMember?.id ?? ""}
          />
        </div>
      )}

      {exportLogError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load the export log</p>
          <p className="mt-1 text-sm">{exportLogError.message}</p>
        </div>
      ) : (
        <MemberExportLog entries={exportLogEntries} memberNames={memberNames} />
      )}
    </div>
  );
}

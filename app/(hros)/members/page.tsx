import MembersTable from "@/components/members-table";
import AddMemberButton from "@/components/add-member-button";
import OnboardingLinkGenerator from "@/components/onboarding-link-generator";
import PendingOnboardingReviews from "@/components/pending-onboarding-reviews";
import { getUserMember } from "@/lib/get-user-member";
import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/members";
import { hasWriteAccess } from "@/lib/rbac";

type MembersPageProps = {
  searchParams: Promise<{ created?: string }>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const showSuccess = params.created === "1";

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
  ] = await Promise.all([
    supabase
      .from("members")
      .select("*")
      .eq("pending_review", false)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true }),
    canManageOnboarding
      ? supabase
          .from("members")
          .select("*")
          .eq("pending_review", true)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const members = (data ?? []) as Member[];
  const pendingMembers = (pendingData ?? []) as Member[];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Members</h1>
            <p className="mt-2 text-zinc-600">Team roster</p>
          </div>

          <AddMemberButton />
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
        <>
          <OnboardingLinkGenerator />

          {pendingError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
              <p className="font-medium">Could not load pending reviews</p>
              <p className="mt-1 text-sm">{pendingError.message}</p>
            </div>
          ) : (
            <PendingOnboardingReviews
              members={pendingMembers}
              canWrite={canManageOnboarding}
            />
          )}
        </>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load members</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <MembersTable members={members} />
        </div>
      )}
    </div>
  );
}

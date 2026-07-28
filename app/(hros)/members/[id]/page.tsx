import Link from "next/link";
import MemberDetailView from "@/components/member-detail-view";
import { getUserMember } from "@/lib/get-user-member";
import { formatMemberName, type Member } from "@/lib/members";
import { hasWriteAccess } from "@/lib/rbac";
import { getViewingSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

type MemberDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; season?: string }>;
};

export default async function MemberDetailPage({
  params,
  searchParams,
}: MemberDetailPageProps) {
  const { id } = await params;
  const { updated, season: seasonParam } = await searchParams;
  const showUpdated = updated === "1";

  const [supabase, viewingSeason, userMember] = await Promise.all([
    createClient(),
    getViewingSeason(seasonParam),
    getUserMember(),
  ]);
  const canWrite = hasWriteAccess(userMember?.exec_title ?? null, "members");

  const { data, error } = await supabase.from("members").select("*").eq("id", id).maybeSingle();

  const member = data as Member | null;

  if (error || !member) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
          <h1 className="text-2xl font-semibold">Member not found</h1>
          <p className="mt-2 text-sm">
            {error?.message ?? "This member could not be loaded."}
          </p>
          <Link
            href="/members"
            className="mt-4 inline-block text-sm font-medium text-[#990000] hover:underline"
          >
            Back to members
          </Link>
        </div>
      </div>
    );
  }

  const { data: membership } = await supabase
    .from("season_memberships")
    .select("exec_title")
    .eq("member_id", member.id)
    .eq("season", viewingSeason.label)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/members"
              className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
            >
              ← Back to members
            </Link>
            <h1 className="mt-4 text-2xl font-semibold text-zinc-900">
              {formatMemberName(member)}
            </h1>
            <p className="mt-2 text-zinc-600">{member.email}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/attendance/members/${member.id}`}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
            >
              View attendance
            </Link>
            {canWrite ? (
              <Link
                href={`/members/${member.id}/edit`}
                className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
              >
                Edit member
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {showUpdated && (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50 px-6 py-4 text-green-800"
        >
          <p className="font-medium">Member updated successfully.</p>
        </div>
      )}

      <MemberDetailView
        member={member}
        seasonExecTitle={membership?.exec_title ?? null}
        season={viewingSeason.label}
      />
    </div>
  );
}

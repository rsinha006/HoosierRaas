import Link from "next/link";
import MemberDetailView from "@/components/member-detail-view";
import { formatMemberName, type Member } from "@/lib/members";
import { getActiveSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

type MemberDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { id } = await params;

  const [supabase, activeSeason] = await Promise.all([createClient(), getActiveSeason()]);

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
    .eq("season", activeSeason.label)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
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

      <MemberDetailView
        member={member}
        seasonExecTitle={membership?.exec_title ?? null}
        season={activeSeason.label}
      />
    </div>
  );
}

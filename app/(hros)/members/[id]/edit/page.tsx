import Link from "next/link";
import { redirect } from "next/navigation";
import MemberEditForm from "@/components/member-edit-form";
import { getUserProfile } from "@/lib/get-user-profile";
import { getUserMember } from "@/lib/get-user-member";
import { formatMemberName, type ExecTitle, type Member } from "@/lib/members";
import { hasWriteAccess } from "@/lib/rbac";
import { getActiveSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

type MemberEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberEditPage({ params }: MemberEditPageProps) {
  const { id } = await params;
  const user = await getUserProfile();

  if (!user) {
    redirect("/login");
  }

  const [supabase, userMember, activeSeason] = await Promise.all([
    createClient(),
    getUserMember(),
    getActiveSeason(),
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

  if (!canWrite) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-800">
        <h1 className="text-2xl font-semibold">Edit member</h1>
        <p className="mt-2">Only Captain and Team Manager can edit members.</p>
        <Link
          href={`/members/${member.id}`}
          className="mt-4 inline-block text-sm font-medium text-[#990000] hover:underline"
        >
          Back to {formatMemberName(member)}
        </Link>
      </div>
    );
  }

  const { data: membership } = await supabase
    .from("season_memberships")
    .select("status, exec_title")
    .eq("member_id", member.id)
    .eq("season", activeSeason.label)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link
          href={`/members/${member.id}`}
          className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
        >
          ← Back to {formatMemberName(member)}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Edit member</h1>
        <p className="mt-2 text-zinc-600">
          Update {formatMemberName(member)}&apos;s roster details.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <MemberEditForm
          member={member}
          activeSeason={activeSeason.label}
          initialStatus={membership?.status ?? member.status}
          initialExecTitle={
            (membership?.exec_title as ExecTitle | null) ??
            (member.exec_title as ExecTitle | null)
          }
        />
      </div>
    </div>
  );
}

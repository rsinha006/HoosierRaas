import Link from "next/link";
import { redirect } from "next/navigation";
import CompetitionCreateForm from "@/components/competition-create-form";
import { getUserProfile } from "@/lib/get-user-profile";
import { getUserMember } from "@/lib/get-user-member";
import { hasWriteAccess } from "@/lib/rbac";

export default async function NewCompetitionPage() {
  const user = await getUserProfile();

  if (!user) {
    redirect("/login");
  }

  const member = await getUserMember();
  const canWrite = hasWriteAccess(member?.exec_title ?? null, "team-manager");

  if (!canWrite) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-800">
        <h1 className="text-2xl font-semibold">Add competition</h1>
        <p className="mt-2">
          Only Captain and Team Manager can create competitions.
        </p>
        <Link
          href="/team-manager/competitions"
          className="mt-4 inline-block text-sm font-medium text-[#990000] hover:underline"
        >
          Back to competitions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link
          href="/team-manager/competitions"
          className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
        >
          ← Back to competitions
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">Add competition</h1>
        <p className="mt-2 text-zinc-600">
          Create a new competition entry for the season.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <CompetitionCreateForm />
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import PracticeSessionCreateForm from "@/components/practice-session-create-form";
import { getUserProfile } from "@/lib/get-user-profile";
import { getUserMember } from "@/lib/get-user-member";
import { hasWriteAccess } from "@/lib/rbac";

export default async function NewPracticeSessionPage() {
  const user = await getUserProfile();

  if (!user) {
    redirect("/login");
  }

  const member = await getUserMember();
  const canWrite = hasWriteAccess(member?.exec_title ?? null, "attendance");

  if (!canWrite) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-800">
        <h1 className="text-2xl font-semibold">New practice session</h1>
        <p className="mt-2">
          Only Captain and Team Manager can create practice sessions.
        </p>
        <Link
          href="/attendance"
          className="mt-4 inline-block text-sm font-medium text-[#990000] hover:underline"
        >
          Back to attendance
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link
          href="/attendance"
          className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
        >
          ← Back to attendance
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">New practice session</h1>
        <p className="mt-2 text-zinc-600">
          Create a session and share the attendance link with your team.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <PracticeSessionCreateForm />
      </div>
    </div>
  );
}

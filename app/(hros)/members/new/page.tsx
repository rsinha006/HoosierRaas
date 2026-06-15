import Link from "next/link";
import { redirect } from "next/navigation";
import MemberCreateForm from "@/components/member-create-form";
import { getUserProfile } from "@/lib/get-user-profile";

export default async function NewMemberPage() {
  const user = await getUserProfile();

  if (!user) {
    redirect("/login");
  }

  if (!user.isExec) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-800">
        <h1 className="text-2xl font-semibold">Add member</h1>
        <p className="mt-2">
          Only executive board members can create new members.
        </p>
        <Link
          href="/members"
          className="mt-4 inline-block text-sm font-medium text-[#990000] hover:underline"
        >
          Back to members
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Add member</h1>
        <p className="mt-2 text-zinc-600">
          Create a new roster entry for HoosierRaas.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <MemberCreateForm />
      </div>
    </div>
  );
}

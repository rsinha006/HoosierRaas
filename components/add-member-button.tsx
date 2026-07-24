"use client";

import Link from "next/link";
import { useUserRole } from "@/hooks/use-user-role";
import { hasWriteAccess } from "@/lib/rbac";

const buttonClassName =
  "rounded-lg border border-[#990000] bg-white px-4 py-2.5 text-sm font-semibold text-[#990000] transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white";

export default function AddMemberButton() {
  const { execTitle, loading } = useUserRole();
  const canWrite = hasWriteAccess(execTitle, "members");

  if (loading) {
    return (
      <button type="button" disabled className={buttonClassName}>
        Add Member
      </button>
    );
  }

  if (canWrite) {
    return (
      <Link href="/members/new" className={buttonClassName}>
        Add Member
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled
      title="Only Captains and TM's can add members"
      className={buttonClassName}
    >
      Add Member
    </button>
  );
}

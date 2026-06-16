"use client";

import Link from "next/link";
import { useUserRole } from "@/hooks/use-user-role";
import { hasWriteAccess } from "@/lib/rbac";

const buttonClassName =
  "rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#990000]";

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

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMemberName, type Member } from "@/lib/members";

type MemberDeleteButtonProps = {
  member: Pick<Member, "id" | "first_name" | "last_name" | "email">;
  currentMemberId: string;
};

export default function MemberDeleteButton({
  member,
  currentMemberId,
}: MemberDeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = member.id === currentMemberId;
  const memberName = formatMemberName(member);

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (isSelf) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${memberName} (${member.email})?\n\nThis will permanently remove their member profile, uploaded documents, and login account if one exists. This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not delete this member.");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Could not delete this member.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading || isSelf}
        title={isSelf ? "You cannot delete your own member record" : undefined}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Deleting..." : "Delete"}
      </button>
      {error ? <p className="max-w-xs text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MemberDeleteConfirmDialog from "@/components/member-delete-confirm-dialog";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = member.id === currentMemberId;
  const memberName = formatMemberName(member);

  async function handleDelete() {
    if (isSelf) {
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

      setConfirmOpen(false);
      router.refresh();
    } catch {
      setError("Could not delete this member.");
      setLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col items-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
        disabled={loading || isSelf}
        title={isSelf ? "You cannot delete your own member record" : undefined}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Deleting..." : "Delete"}
      </button>
      {error && !confirmOpen ? (
        <p className="max-w-40 text-right text-xs text-red-600">{error}</p>
      ) : null}

      <MemberDeleteConfirmDialog
        open={confirmOpen}
        confirmationName={memberName}
        email={member.email}
        submitting={loading}
        error={error}
        onConfirm={handleDelete}
        onClose={() => {
          if (loading) {
            return;
          }

          setConfirmOpen(false);
          setError(null);
        }}
      />
    </div>
  );
}

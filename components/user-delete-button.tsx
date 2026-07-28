"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UserDeleteButtonProps = {
  userId: string;
  email: string;
  currentUserId: string;
};

export default function UserDeleteButton({
  userId,
  email,
  currentUserId,
}: UserDeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = userId === currentUserId;

  async function handleDelete() {
    if (isSelf) {
      return;
    }

    const confirmed = window.confirm(
      `Delete user account for ${email}?\nThis permanently removes their login. After deletion, the same email can be used to sign up again.\nNote: they may still appear on the roster if they are listed under Members.\nThis deletion cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not delete this user.");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Could not delete this user.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading || isSelf}
        title={isSelf ? "You cannot delete your own account" : undefined}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Deleting..." : "Delete"}
      </button>
      {error ? <p className="max-w-40 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

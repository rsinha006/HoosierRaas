"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExecTitle } from "@/lib/members";
import { ASSIGNABLE_EXEC_TITLES } from "@/lib/users";

type UserRoleAssignProps = {
  userId: string;
  currentExecTitle: ExecTitle | null;
};

export default function UserRoleAssign({ userId, currentExecTitle }: UserRoleAssignProps) {
  const router = useRouter();
  const [execTitle, setExecTitle] = useState<ExecTitle>(
    currentExecTitle ?? ASSIGNABLE_EXEC_TITLES[0].value,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnchanged = currentExecTitle === execTitle;

  async function handleAssign() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ exec_title: execTitle }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not assign this role.");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Could not assign this role.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={execTitle}
          onChange={(event) => setExecTitle(event.target.value as ExecTitle)}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-900 outline-none focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
        >
          {ASSIGNABLE_EXEC_TITLES.map((title) => (
            <option key={title.value} value={title.value}>
              {title.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAssign}
          disabled={loading || isUnchanged}
          className="rounded-lg bg-[#990000] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : currentExecTitle ? "Update" : "Assign"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

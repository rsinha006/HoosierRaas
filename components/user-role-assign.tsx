"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import RoleChangeConfirmDialog from "@/components/role-change-confirm-dialog";
import type { ExecTitle } from "@/lib/members";
import {
  NONE_ROLE_VALUE,
  ROLE_SELECT_OPTIONS,
  type RoleSelectValue,
} from "@/lib/users";

type UserRoleAssignProps = {
  userId: string;
  currentExecTitle: ExecTitle | null;
  /** Shown in the dialog and typed back to confirm. */
  fullName: string | null;
  email: string;
  isSelf: boolean;
};

function roleLabel(value: RoleSelectValue) {
  return (
    ROLE_SELECT_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export default function UserRoleAssign({
  userId,
  currentExecTitle,
  fullName,
  email,
  isSelf,
}: UserRoleAssignProps) {
  const router = useRouter();
  const [execTitle, setExecTitle] = useState<RoleSelectValue>(
    currentExecTitle ?? NONE_ROLE_VALUE,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentValue: RoleSelectValue = currentExecTitle ?? NONE_ROLE_VALUE;
  const isUnchanged = currentValue === execTitle;
  const isRevoking = execTitle === NONE_ROLE_VALUE;

  // A login that signed up but never filled in a name still has to be
  // confirmable, so fall back to the address it was created with.
  const confirmationName = fullName?.trim() || email;

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

      setConfirmOpen(false);
      setLoading(false);
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
          onChange={(event) => setExecTitle(event.target.value as RoleSelectValue)}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-900 outline-none focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
        >
          {ROLE_SELECT_OPTIONS.map((title) => (
            <option key={title.value} value={title.value}>
              {title.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          // Opens the confirmation rather than saving. Changing someone's
          // access used to be one dropdown and one click, with no step in
          // between to notice you were on the wrong row.
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
          disabled={loading || isUnchanged}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isRevoking ? "bg-zinc-700 hover:bg-zinc-800" : "bg-[#990000] hover:bg-[#7a0000]"
          }`}
        >
          {isRevoking ? "Revoke access" : currentExecTitle ? "Update" : "Assign"}
        </button>
      </div>

      {/* Errors from a rejected save show inside the dialog; this covers the
          case where it has since been dismissed. */}
      {error && !confirmOpen ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : null}

      <RoleChangeConfirmDialog
        open={confirmOpen}
        confirmationName={confirmationName}
        currentRoleLabel={roleLabel(currentValue)}
        nextRoleLabel={roleLabel(execTitle)}
        isRevoking={isRevoking}
        isSelf={isSelf}
        submitting={loading}
        error={error}
        onConfirm={handleAssign}
        onClose={() => {
          if (loading) {
            return;
          }
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}

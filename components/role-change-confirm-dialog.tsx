"use client";

import { useEffect, useRef, useState } from "react";
import { matchesConfirmationName } from "@/lib/users";

type RoleChangeConfirmDialogProps = {
  open: boolean;
  /** What the confirming person has to type - full name, or email when the
   *  login has no name on it yet. */
  confirmationName: string;
  currentRoleLabel: string;
  nextRoleLabel: string;
  isRevoking: boolean;
  isSelf: boolean;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export default function RoleChangeConfirmDialog({
  open,
  confirmationName,
  currentRoleLabel,
  nextRoleLabel,
  isRevoking,
  isSelf,
  submitting,
  error,
  onConfirm,
  onClose,
}: RoleChangeConfirmDialogProps) {
  const [typedName, setTypedName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setTypedName("");
      // Focus the one control the person has to act on, so the dialog is
      // usable without reaching for the mouse.
      inputRef.current?.focus();
    }

    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const confirmed = matchesConfirmationName(typedName, confirmationName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel this access change"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-change-title"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 id="role-change-title" className="text-xl font-semibold text-zinc-900">
            {isRevoking ? "Remove HROS access" : "Change HROS access"}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {confirmationName} will go from{" "}
            <span className="font-medium text-zinc-900">{currentRoleLabel}</span> to{" "}
            <span className="font-medium text-zinc-900">{nextRoleLabel}</span>.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {isSelf ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">This is your own account.</p>
              <p className="mt-1">
                {isRevoking
                  ? "You will lose access to HROS immediately and cannot restore it yourself - another Captain or Team Manager will have to."
                  : "You may lose access to parts of HROS immediately, and you may not be able to change your own role back."}
              </p>
            </div>
          ) : null}

          {isRevoking ? (
            <p className="text-sm text-zinc-600">
              Their login stays, but they will be signed out of HROS and land on
              the access-pending screen until someone assigns them a role again.
            </p>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor="role-change-confirm"
              className="block text-sm font-medium text-zinc-700"
            >
              Type{" "}
              <span className="font-semibold text-zinc-900">{confirmationName}</span>{" "}
              to confirm
            </label>
            <input
              id="role-change-confirm"
              ref={inputRef}
              type="text"
              autoComplete="off"
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!confirmed || submitting}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isRevoking ? "bg-zinc-900 hover:bg-zinc-800" : "bg-[#990000] hover:bg-[#7a0000]"
            }`}
          >
            {submitting
              ? "Saving..."
              : isRevoking
                ? "Remove access"
                : "Change access"}
          </button>
        </div>
      </div>
    </div>
  );
}

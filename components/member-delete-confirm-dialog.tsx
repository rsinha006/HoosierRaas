"use client";

import { useEffect, useRef, useState } from "react";
import { matchesConfirmationName } from "@/lib/users";

type MemberDeleteConfirmDialogProps = {
  open: boolean;
  /** What the confirming person has to type - the name exactly as the roster row
   *  shows it. */
  confirmationName: string;
  email: string;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export default function MemberDeleteConfirmDialog({
  open,
  confirmationName,
  email,
  submitting,
  error,
  onConfirm,
  onClose,
}: MemberDeleteConfirmDialogProps) {
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
        aria-label="Cancel this deletion"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-delete-title"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 id="member-delete-title" className="text-xl font-semibold text-zinc-900">
            Delete {confirmationName}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{email}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-medium">This cannot be undone.</p>
            <p className="mt-1">Deleting removes, permanently:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>their member profile</li>
              <li>
                their uploaded documents - government ID, IU student ID,
                vaccination card and photo
              </li>
              <li>their login account, if they have one</li>
              <li>their dues records, and their place on every season roster</li>
            </ul>
            <p className="mt-2">
              Their attendance records stay, but stop being linked to anyone.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="member-delete-confirm"
              className="block text-sm font-medium text-zinc-700"
            >
              Type{" "}
              <span className="font-semibold text-zinc-900">{confirmationName}</span>{" "}
              to confirm
            </label>
            <input
              id="member-delete-confirm"
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
            className="rounded-lg bg-[#990000] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Deleting..." : "Delete member"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { Member } from "@/lib/members";
import { formatMemberName } from "@/lib/members";
import {
  buildDefaultCategorySelection,
  DATA_CATEGORIES,
  DOCUMENT_CATEGORIES,
  type ExportCategoryKey,
} from "@/lib/member-export";

type MemberExportDialogProps = {
  open: boolean;
  onClose: () => void;
  members: Member[];
};

function buildInitialSelection(members: Member[]): Record<string, boolean> {
  return Object.fromEntries(members.map((member) => [member.id, true]));
}

export default function MemberExportDialog({ open, onClose, members }: MemberExportDialogProps) {
  // Identity is the closest thing to "basic roster info" — everything else (medical,
  // sizing, emergency contact, individual documents) is sensitive enough that a
  // manager should opt in deliberately rather than have it included by default.
  const [selectedCategories, setSelectedCategories] = useState<Record<ExportCategoryKey, boolean>>(
    buildDefaultCategorySelection(),
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSelectedCategories(buildDefaultCategorySelection());
      setSelectedMemberIds(buildInitialSelection(members));
      setSubmitting(false);
      setErrorMessage(null);
    }

    wasOpenRef.current = open;
  }, [open, members]);

  if (!open) {
    return null;
  }

  const selectedMemberCount = Object.values(selectedMemberIds).filter(Boolean).length;
  const allSelected = selectedMemberCount === members.length && members.length > 0;

  function toggleSelectAll() {
    setSelectedMemberIds(allSelected ? {} : buildInitialSelection(members));
  }

  async function handleExport() {
    const memberIds = Object.entries(selectedMemberIds)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    const categories = (Object.entries(selectedCategories) as [ExportCategoryKey, boolean][])
      .filter(([, checked]) => checked)
      .map(([key]) => key);

    if (memberIds.length === 0) {
      setErrorMessage("Select at least one member to export.");
      return;
    }

    if (categories.length === 0) {
      setErrorMessage("Select at least one data category to export.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/members/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds, categories }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErrorMessage(body?.error ?? "Export failed. Please try again.");
        setSubmitting(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `member-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setSubmitting(false);
      onClose();
    } catch {
      setErrorMessage("Export failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close export dialog"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-export-title"
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 id="member-export-title" className="text-xl font-semibold text-zinc-900">
            Export member data
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Choose data categories and members, then download a spreadsheet (and any
            uploaded documents) to send to competitions.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Data categories</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DATA_CATEGORIES.map((category) => (
                <label
                  key={category.key}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories[category.key]}
                    onChange={(event) =>
                      setSelectedCategories((current) => ({
                        ...current,
                        [category.key]: event.target.checked,
                      }))
                    }
                    className="rounded border-zinc-300 text-[#990000] focus:ring-[#990000]"
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Documents</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Choose which uploaded documents to bundle into the download alongside the
              spreadsheet.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DOCUMENT_CATEGORIES.map((category) => (
                <label
                  key={category.key}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories[category.key]}
                    onChange={(event) =>
                      setSelectedCategories((current) => ({
                        ...current,
                        [category.key]: event.target.checked,
                      }))
                    }
                    className="rounded border-zinc-300 text-[#990000] focus:ring-[#990000]"
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">
                Members ({selectedMemberCount} of {members.length} selected)
              </h3>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-sm font-medium text-[#990000] hover:underline"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            {members.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
                No members match the current filters.
              </p>
            ) : (
              <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-zinc-200">
                <table className="min-w-full text-left text-sm">
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-t border-zinc-100 first:border-t-0">
                        <td className="px-4 py-2.5">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedMemberIds[member.id] ?? false}
                              onChange={(event) =>
                                setSelectedMemberIds((current) => ({
                                  ...current,
                                  [member.id]: event.target.checked,
                                }))
                              }
                              className="rounded border-zinc-300 text-[#990000] focus:ring-[#990000]"
                            />
                            <span className="font-medium text-zinc-900">
                              {formatMemberName(member)}
                            </span>
                            <span className="text-xs text-zinc-500">{member.email}</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={submitting}
            className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { archiveSeason } from "@/app/actions/archive-season";
import {
  buildArchivePayload,
  buildArchiveReviewSummary,
  buildInitialAccessChoices,
  buildInitialStatusChoices,
  getAccessEligibleMembers,
  type ArchiveFinancePreview,
  type ArchiveRosterMember,
} from "@/lib/archive-season";
import { MEMBER_STATUSES, type MemberStatus } from "@/lib/members";
import { formatCurrency } from "@/lib/finance";
import { ASSIGNABLE_EXEC_TITLES } from "@/lib/users";

const selectClassName =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

type ArchiveSeasonDialogProps = {
  open: boolean;
  onClose: () => void;
  activeSeasonLabel: string;
  roster: ArchiveRosterMember[];
  financePreview: ArchiveFinancePreview;
};

export default function ArchiveSeasonDialog({
  open,
  onClose,
  activeSeasonLabel,
  roster,
  financePreview,
}: ArchiveSeasonDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [statusByMemberId, setStatusByMemberId] = useState<Record<string, MemberStatus>>(
    {},
  );
  const [accessChoices, setAccessChoices] = useState<
    Record<string, { nextExecTitle: (typeof ASSIGNABLE_EXEC_TITLES)[number]["value"] | "none"; deleteLogin: boolean }>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(1);
    setStatusByMemberId(buildInitialStatusChoices(roster));
    setAccessChoices({});
    setSubmitting(false);
    setErrorMessage(null);
  }, [open, roster]);

  const accessEligible = useMemo(
    () => getAccessEligibleMembers(roster, statusByMemberId),
    [roster, statusByMemberId],
  );

  const review = useMemo(
    () =>
      buildArchiveReviewSummary(
        roster,
        statusByMemberId,
        accessChoices,
        financePreview,
      ),
    [roster, statusByMemberId, accessChoices, financePreview],
  );

  if (!open) {
    return null;
  }

  function goToAccessStep() {
    setAccessChoices(buildInitialAccessChoices(accessEligible));
    setStep(2);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setErrorMessage(null);

    const payload = buildArchivePayload(
      roster,
      statusByMemberId,
      accessChoices,
      activeSeasonLabel,
    );

    const result = await archiveSeason(payload);
    setSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    onClose();

    const params = new URLSearchParams({
      season_archived: result.nextSeasonLabel,
    });

    if (result.loginDeletionFailures.length > 0) {
      params.set("login_delete_warnings", "1");
    }

    router.push(`/dashboard?${params.toString()}`);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close archive season dialog"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-season-title"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 id="archive-season-title" className="text-xl font-semibold text-zinc-900">
            Archive {activeSeasonLabel}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Step {step} of 3 · Opens {financePreview.nextSeasonLabel} when confirmed
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                Choose each member&apos;s roster status for {financePreview.nextSeasonLabel}.
                Marking someone as alumni will delete their login at the final confirm.
              </p>

              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Next status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((member) => {
                      const status = statusByMemberId[member.memberId] ?? member.status;

                      return (
                        <tr key={member.memberId} className="border-t border-zinc-100">
                          <td className="px-4 py-3">
                            <p className="font-medium text-zinc-900">{member.name}</p>
                            <p className="text-xs text-zinc-500">{member.email}</p>
                            {status === "alumni" && member.hasLogin ? (
                              <p className="mt-1 text-xs font-medium text-red-700">
                                Login will be deleted
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={status}
                              onChange={(event) =>
                                setStatusByMemberId((current) => ({
                                  ...current,
                                  [member.memberId]: event.target.value as MemberStatus,
                                }))
                              }
                              className={selectClassName}
                            >
                              {MEMBER_STATUSES.map((value) => (
                                <option key={value} value={value}>
                                  {value.charAt(0).toUpperCase() + value.slice(1)}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                Set next-season access for staying members who currently have exec login
                accounts. Choosing None keeps the account but removes access unless you
                check Delete login.
              </p>

              {accessEligible.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
                  No staying members with exec login accounts to carry over.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Member</th>
                        <th className="px-4 py-3 font-medium">Next access</th>
                        <th className="px-4 py-3 font-medium">Delete login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessEligible.map((member) => {
                        const choice = accessChoices[member.memberId] ?? {
                          nextExecTitle: member.execTitle ?? "none",
                          deleteLogin: false,
                        };

                        return (
                          <tr key={member.memberId} className="border-t border-zinc-100">
                            <td className="px-4 py-3">
                              <p className="font-medium text-zinc-900">{member.name}</p>
                              <p className="text-xs text-zinc-500">{member.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={choice.nextExecTitle}
                                onChange={(event) =>
                                  setAccessChoices((current) => ({
                                    ...current,
                                    [member.memberId]: {
                                      ...choice,
                                      nextExecTitle: event.target
                                        .value as typeof choice.nextExecTitle,
                                    },
                                  }))
                                }
                                className={selectClassName}
                              >
                                {ASSIGNABLE_EXEC_TITLES.map((title) => (
                                  <option key={title.value} value={title.value}>
                                    {title.label}
                                  </option>
                                ))}
                                <option value="none">None</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                                <input
                                  type="checkbox"
                                  checked={choice.deleteLogin}
                                  onChange={(event) =>
                                    setAccessChoices((current) => ({
                                      ...current,
                                      [member.memberId]: {
                                        ...choice,
                                        deleteLogin: event.target.checked,
                                      },
                                    }))
                                  }
                                  className="rounded border-zinc-300 text-[#990000] focus:ring-[#990000]"
                                />
                                Delete login
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <h3 className="text-sm font-semibold text-zinc-900">Season transition</h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                  <li>
                    Archive <strong>{activeSeasonLabel}</strong> and open{" "}
                    <strong>{review.nextSeasonLabel}</strong>.
                  </li>
                  <li>
                    Copy {review.budgetCount} budget
                    {review.budgetCount === 1 ? "" : "s"} and {review.lineItemCount} IUFB line
                    item{review.lineItemCount === 1 ? "" : "s"} (spent amounts reset to 0).
                  </li>
                  <li>
                    Ending balance: {formatCurrency(review.endingBalance)}.{" "}
                    {review.carryoverDescription}
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <h3 className="text-sm font-semibold text-zinc-900">Access changes</h3>
                {review.accessChanges.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-600">
                    No exec access changes for staying members.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                    {review.accessChanges.map((change) => (
                      <li key={change.name}>
                        {change.name}: {change.from} → {change.to}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h3 className="text-sm font-semibold text-red-900">Logins to delete</h3>
                {review.loginsToDelete.length === 0 ? (
                  <p className="mt-2 text-sm text-red-800">No login accounts will be deleted.</p>
                ) : (
                  <ul className="mt-3 space-y-1 text-sm text-red-800">
                    {review.loginsToDelete.map((email) => (
                      <li key={email}>{email}</li>
                    ))}
                  </ul>
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
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>

          <div className="flex flex-wrap gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
                disabled={submitting}
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Back
              </button>
            ) : null}

            {step === 1 ? (
              <button
                type="button"
                onClick={goToAccessStep}
                className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
              >
                Next: Login / access
              </button>
            ) : null}

            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
              >
                Next: Review
              </button>
            ) : null}

            {step === 3 ? (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Archiving..." : "Confirm archive"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearPacketReviewDraft,
  createEmptyContactRow,
  createEmptyDeadlineRow,
  createEmptyFeeRow,
  hasPacketReviewValidationErrors,
  type PacketReviewFormState,
  type PacketReviewValidationErrors,
  savePacketReviewDraft,
  validatePacketReviewFormState,
} from "@/lib/packet-review";
import { saveCompetitionPacketData } from "@/lib/save-competition-packet-data";
import { toUserFacingSaveError } from "@/lib/user-facing-errors";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const aiInputClassName =
  "bg-amber-50 border-amber-200 focus:border-amber-400 focus:ring-amber-100";

type PacketExtractionReviewFormProps = {
  initialState: PacketReviewFormState;
};

function fieldClassName(aiHighlighted: boolean) {
  return aiHighlighted ? `${inputClassName} ${aiInputClassName}` : inputClassName;
}

function toggleClassName(aiHighlighted: boolean) {
  return aiHighlighted
    ? "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
    : "rounded-lg border border-zinc-200 px-3 py-2";
}

export default function PacketExtractionReviewForm({
  initialState,
}: PacketExtractionReviewFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState(initialState);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<PacketReviewValidationErrors | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  function handleCancel() {
    clearPacketReviewDraft();
    router.push(`/team-manager/competitions/${formState.competitionId}`);
  }

  async function handleSave() {
    setSaveError(null);

    const errors = validatePacketReviewFormState(formState);
    if (hasPacketReviewValidationErrors(errors)) {
      setValidationErrors(errors);
      setSaveError("Fix the highlighted fields before saving.");
      return;
    }

    setValidationErrors(null);
    setSaving(true);

    try {
      await saveCompetitionPacketData(formState);
      clearPacketReviewDraft();
      router.push(`/team-manager/competitions/${formState.competitionId}`);
      router.refresh();
    } catch (error) {
      setSaveError(toUserFacingSaveError(error));
    } finally {
      setSaving(false);
    }
  }

  function persistDraft(nextState: PacketReviewFormState) {
    setFormState(nextState);
    savePacketReviewDraft(nextState);
  }

  return (
    <div className="space-y-6">
      {formState.extractionWarnings && formState.extractionWarnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-amber-900">
            Heads up while you review
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {formState.extractionWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-amber-800">
          Review AI-extracted details before saving. Highlighted fields were
          auto-filled from the registration packet.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Edit anything that looks wrong, add missing rows, or remove items that
          do not apply.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">Deadlines</h2>
          <button
            type="button"
            onClick={() =>
              persistDraft({
                ...formState,
                deadlines: [...formState.deadlines, createEmptyDeadlineRow()],
              })
            }
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Add deadline
          </button>
        </div>

        {formState.deadlines.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No deadlines yet. Add one if needed.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {formState.deadlines.map((deadline, index) => (
              <div
                key={deadline.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-700">
                    Deadline {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      persistDraft({
                        ...formState,
                        deadlines: formState.deadlines.filter(
                          (row) => row.id !== deadline.id,
                        ),
                      })
                    }
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block md:col-span-2 xl:col-span-1">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Name
                    </span>
                    <input
                      type="text"
                      value={deadline.name}
                      onChange={(event) => {
                        const nextDeadlines = [...formState.deadlines];
                        nextDeadlines[index] = {
                          ...deadline,
                          name: event.target.value,
                          aiFields: { ...deadline.aiFields, name: false },
                        };
                        persistDraft({ ...formState, deadlines: nextDeadlines });
                      }}
                      className={fieldClassName(Boolean(deadline.aiFields.name))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Due date
                    </span>
                    <input
                      type="date"
                      value={deadline.due_date}
                      onChange={(event) => {
                        const nextDeadlines = [...formState.deadlines];
                        nextDeadlines[index] = {
                          ...deadline,
                          due_date: event.target.value,
                          aiFields: { ...deadline.aiFields, due_date: false },
                        };
                        persistDraft({ ...formState, deadlines: nextDeadlines });
                      }}
                      className={fieldClassName(Boolean(deadline.aiFields.due_date))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Fine amount
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={deadline.fine_amount}
                      onChange={(event) => {
                        const nextDeadlines = [...formState.deadlines];
                        nextDeadlines[index] = {
                          ...deadline,
                          fine_amount: event.target.value,
                          aiFields: { ...deadline.aiFields, fine_amount: false },
                        };
                        persistDraft({ ...formState, deadlines: nextDeadlines });
                      }}
                      className={fieldClassName(
                        Boolean(deadline.aiFields.fine_amount),
                      )}
                    />
                  </label>
                  <label
                    className={`flex items-center gap-2 self-end ${toggleClassName(
                      Boolean(deadline.aiFields.is_hard_cutoff),
                    )}`}
                  >
                    <input
                      type="checkbox"
                      checked={deadline.is_hard_cutoff}
                      onChange={(event) => {
                        const nextDeadlines = [...formState.deadlines];
                        nextDeadlines[index] = {
                          ...deadline,
                          is_hard_cutoff: event.target.checked,
                          aiFields: {
                            ...deadline.aiFields,
                            is_hard_cutoff: false,
                          },
                        };
                        persistDraft({ ...formState, deadlines: nextDeadlines });
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-[#990000] focus:ring-[#990000]/20"
                    />
                    <span className="text-sm text-zinc-700">Hard cutoff</span>
                  </label>
                </div>
                {validationErrors?.deadlines[deadline.id] ? (
                  <p className="mt-2 text-sm text-red-600">
                    {validationErrors.deadlines[deadline.id]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">Fees</h2>
          <button
            type="button"
            onClick={() =>
              persistDraft({
                ...formState,
                fees: [...formState.fees, createEmptyFeeRow()],
              })
            }
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Add fee
          </button>
        </div>

        {formState.fees.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No fees yet. Add one if needed.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {formState.fees.map((fee, index) => (
              <div
                key={fee.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-700">Fee {index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      persistDraft({
                        ...formState,
                        fees: formState.fees.filter((row) => row.id !== fee.id),
                      })
                    }
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Name
                    </span>
                    <input
                      type="text"
                      value={fee.name}
                      onChange={(event) => {
                        const nextFees = [...formState.fees];
                        nextFees[index] = {
                          ...fee,
                          name: event.target.value,
                          aiFields: { ...fee.aiFields, name: false },
                        };
                        persistDraft({ ...formState, fees: nextFees });
                      }}
                      className={fieldClassName(Boolean(fee.aiFields.name))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Amount
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={fee.amount}
                      onChange={(event) => {
                        const nextFees = [...formState.fees];
                        nextFees[index] = {
                          ...fee,
                          amount: event.target.value,
                          aiFields: { ...fee.aiFields, amount: false },
                        };
                        persistDraft({ ...formState, fees: nextFees });
                      }}
                      className={fieldClassName(Boolean(fee.aiFields.amount))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Due date
                    </span>
                    <input
                      type="date"
                      value={fee.due_date}
                      onChange={(event) => {
                        const nextFees = [...formState.fees];
                        nextFees[index] = {
                          ...fee,
                          due_date: event.target.value,
                          aiFields: { ...fee.aiFields, due_date: false },
                        };
                        persistDraft({ ...formState, fees: nextFees });
                      }}
                      className={fieldClassName(Boolean(fee.aiFields.due_date))}
                    />
                  </label>
                  <label
                    className={`flex items-center gap-2 ${toggleClassName(
                      Boolean(fee.aiFields.is_per_person),
                    )}`}
                  >
                    <input
                      type="checkbox"
                      checked={fee.is_per_person}
                      onChange={(event) => {
                        const nextFees = [...formState.fees];
                        nextFees[index] = {
                          ...fee,
                          is_per_person: event.target.checked,
                          aiFields: { ...fee.aiFields, is_per_person: false },
                        };
                        persistDraft({ ...formState, fees: nextFees });
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-[#990000] focus:ring-[#990000]/20"
                    />
                    <span className="text-sm text-zinc-700">Per person</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 ${toggleClassName(
                      Boolean(fee.aiFields.is_refundable),
                    )}`}
                  >
                    <input
                      type="checkbox"
                      checked={fee.is_refundable}
                      onChange={(event) => {
                        const nextFees = [...formState.fees];
                        nextFees[index] = {
                          ...fee,
                          is_refundable: event.target.checked,
                          aiFields: { ...fee.aiFields, is_refundable: false },
                        };
                        persistDraft({ ...formState, fees: nextFees });
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-[#990000] focus:ring-[#990000]/20"
                    />
                    <span className="text-sm text-zinc-700">Refundable</span>
                  </label>
                </div>
                {validationErrors?.fees[fee.id] ? (
                  <p className="mt-2 text-sm text-red-600">{validationErrors.fees[fee.id]}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-900">Roster rules</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Min size
              </span>
              <input
                type="number"
                min="0"
                value={formState.roster_rules.min_size}
                onChange={(event) =>
                  persistDraft({
                    ...formState,
                    roster_rules: {
                      ...formState.roster_rules,
                      min_size: event.target.value,
                      aiFields: {
                        ...formState.roster_rules.aiFields,
                        min_size: false,
                      },
                    },
                  })
                }
                className={fieldClassName(
                  Boolean(formState.roster_rules.aiFields.min_size),
                )}
              />
              {validationErrors?.rosterRules.min_size ? (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.rosterRules.min_size}
                </p>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Max size
              </span>
              <input
                type="number"
                min="0"
                value={formState.roster_rules.max_size}
                onChange={(event) =>
                  persistDraft({
                    ...formState,
                    roster_rules: {
                      ...formState.roster_rules,
                      max_size: event.target.value,
                      aiFields: {
                        ...formState.roster_rules.aiFields,
                        max_size: false,
                      },
                    },
                  })
                }
                className={fieldClassName(
                  Boolean(formState.roster_rules.aiFields.max_size),
                )}
              />
              {validationErrors?.rosterRules.max_size ? (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.rosterRules.max_size}
                </p>
              ) : null}
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Per-person registration cost
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formState.roster_rules.per_person_registration_cost}
                onChange={(event) =>
                  persistDraft({
                    ...formState,
                    roster_rules: {
                      ...formState.roster_rules,
                      per_person_registration_cost: event.target.value,
                      aiFields: {
                        ...formState.roster_rules.aiFields,
                        per_person_registration_cost: false,
                      },
                    },
                  })
                }
                className={fieldClassName(
                  Boolean(
                    formState.roster_rules.aiFields.per_person_registration_cost,
                  ),
                )}
              />
              {validationErrors?.rosterRules.per_person_registration_cost ? (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.rosterRules.per_person_registration_cost}
                </p>
              ) : null}
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-900">Performance rules</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Min duration (minutes)
              </span>
              <input
                type="number"
                min="0"
                value={formState.performance_rules.min_duration_minutes}
                onChange={(event) =>
                  persistDraft({
                    ...formState,
                    performance_rules: {
                      ...formState.performance_rules,
                      min_duration_minutes: event.target.value,
                      aiFields: {
                        ...formState.performance_rules.aiFields,
                        min_duration_minutes: false,
                      },
                    },
                  })
                }
                className={fieldClassName(
                  Boolean(formState.performance_rules.aiFields.min_duration_minutes),
                )}
              />
              {validationErrors?.performanceRules.min_duration_minutes ? (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.performanceRules.min_duration_minutes}
                </p>
              ) : null}
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Max duration (minutes)
              </span>
              <input
                type="number"
                min="0"
                value={formState.performance_rules.max_duration_minutes}
                onChange={(event) =>
                  persistDraft({
                    ...formState,
                    performance_rules: {
                      ...formState.performance_rules,
                      max_duration_minutes: event.target.value,
                      aiFields: {
                        ...formState.performance_rules.aiFields,
                        max_duration_minutes: false,
                      },
                    },
                  })
                }
                className={fieldClassName(
                  Boolean(formState.performance_rules.aiFields.max_duration_minutes),
                )}
              />
              {validationErrors?.performanceRules.max_duration_minutes ? (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.performanceRules.max_duration_minutes}
                </p>
              ) : null}
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Mix format
              </span>
              <input
                type="text"
                value={formState.performance_rules.mix_format}
                onChange={(event) =>
                  persistDraft({
                    ...formState,
                    performance_rules: {
                      ...formState.performance_rules,
                      mix_format: event.target.value,
                      aiFields: {
                        ...formState.performance_rules.aiFields,
                        mix_format: false,
                      },
                    },
                  })
                }
                className={fieldClassName(
                  Boolean(formState.performance_rules.aiFields.mix_format),
                )}
              />
            </label>
            <label
              className={`flex items-center gap-2 sm:col-span-2 ${toggleClassName(
                Boolean(formState.performance_rules.aiFields.tech_rehearsal_required),
              )}`}
            >
              <input
                type="checkbox"
                checked={formState.performance_rules.tech_rehearsal_required === true}
                onChange={(event) =>
                  persistDraft({
                    ...formState,
                    performance_rules: {
                      ...formState.performance_rules,
                      tech_rehearsal_required: event.target.checked,
                      aiFields: {
                        ...formState.performance_rules.aiFields,
                        tech_rehearsal_required: false,
                      },
                    },
                  })
                }
                className="h-4 w-4 rounded border-zinc-300 text-[#990000] focus:ring-[#990000]/20"
              />
              <span className="text-sm text-zinc-700">Tech rehearsal required</span>
            </label>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">Contacts</h2>
          <button
            type="button"
            onClick={() =>
              persistDraft({
                ...formState,
                contacts: [...formState.contacts, createEmptyContactRow()],
              })
            }
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Add contact
          </button>
        </div>

        {formState.contacts.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No contacts yet. Add one if needed.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {formState.contacts.map((contact, index) => (
              <div
                key={contact.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-700">
                    Contact {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      persistDraft({
                        ...formState,
                        contacts: formState.contacts.filter(
                          (row) => row.id !== contact.id,
                        ),
                      })
                    }
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Name
                    </span>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(event) => {
                        const nextContacts = [...formState.contacts];
                        nextContacts[index] = {
                          ...contact,
                          name: event.target.value,
                          aiFields: { ...contact.aiFields, name: false },
                        };
                        persistDraft({ ...formState, contacts: nextContacts });
                      }}
                      className={fieldClassName(Boolean(contact.aiFields.name))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Role
                    </span>
                    <input
                      type="text"
                      value={contact.role}
                      onChange={(event) => {
                        const nextContacts = [...formState.contacts];
                        nextContacts[index] = {
                          ...contact,
                          role: event.target.value,
                          aiFields: { ...contact.aiFields, role: false },
                        };
                        persistDraft({ ...formState, contacts: nextContacts });
                      }}
                      className={fieldClassName(Boolean(contact.aiFields.role))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Email
                    </span>
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(event) => {
                        const nextContacts = [...formState.contacts];
                        nextContacts[index] = {
                          ...contact,
                          email: event.target.value,
                          aiFields: { ...contact.aiFields, email: false },
                        };
                        persistDraft({ ...formState, contacts: nextContacts });
                      }}
                      className={fieldClassName(Boolean(contact.aiFields.email))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Phone
                    </span>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(event) => {
                        const nextContacts = [...formState.contacts];
                        nextContacts[index] = {
                          ...contact,
                          phone: event.target.value,
                          aiFields: { ...contact.aiFields, phone: false },
                        };
                        persistDraft({ ...formState, contacts: nextContacts });
                      }}
                      className={fieldClassName(Boolean(contact.aiFields.phone))}
                    />
                  </label>
                </div>
                {validationErrors?.contacts[contact.id] ? (
                  <p className="mt-2 text-sm text-red-600">
                    {validationErrors.contacts[contact.id]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {saveError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7a0000] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Confirm and Save"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

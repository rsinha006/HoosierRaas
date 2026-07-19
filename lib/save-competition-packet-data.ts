import { createClient } from "@/lib/supabase/client";
import type { PacketReviewFormState } from "@/lib/packet-review";
import { toUserFacingSaveError } from "@/lib/user-facing-errors";

type ExistingDeadline = {
  id: string;
  name: string;
  due_date: string | null;
  status: "pending" | "complete";
  completed_at: string | null;
};

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalInteger(value: string) {
  const parsed = parseOptionalNumber(value);
  if (parsed == null) {
    return null;
  }

  return Math.trunc(parsed);
}

function parseOptionalDate(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function throwSaveError(error: { message: string }) {
  throw new Error(toUserFacingSaveError(error));
}

function normalizeDeadlineName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function deadlineExactKey(name: string, dueDate: string | null) {
  return `${normalizeDeadlineName(name)}::${dueDate ?? ""}`;
}

function snapshotIds(ids: string[] | undefined) {
  return Array.isArray(ids) ? ids : [];
}

function takeDeadlineMatch(
  reviewed: { name: string; due_date: string | null },
  exactMatches: Map<string, ExistingDeadline[]>,
  uniqueNameMatches: Map<string, ExistingDeadline>,
  usedIds: Set<string>,
) {
  const exactKey = deadlineExactKey(reviewed.name, reviewed.due_date);
  const exactCandidates = exactMatches.get(exactKey) ?? [];

  while (exactCandidates.length > 0) {
    const candidate = exactCandidates.shift();
    if (candidate && !usedIds.has(candidate.id)) {
      usedIds.add(candidate.id);
      return candidate;
    }
  }

  const nameKey = normalizeDeadlineName(reviewed.name);
  const nameCandidate = uniqueNameMatches.get(nameKey);
  if (nameCandidate && !usedIds.has(nameCandidate.id)) {
    usedIds.add(nameCandidate.id);
    return nameCandidate;
  }

  return null;
}

export async function saveCompetitionPacketData(state: PacketReviewFormState) {
  const supabase = createClient();

  const { data: existingDeadlines, error: existingDeadlinesError } = await supabase
    .from("deadlines")
    .select("id, name, due_date, status, completed_at")
    .eq("competition_id", state.competitionId);

  if (existingDeadlinesError) {
    throwSaveError(existingDeadlinesError);
  }

  const exactDeadlineMatches = new Map<string, ExistingDeadline[]>();
  const deadlinesByName = new Map<string, ExistingDeadline[]>();
  const deadlinesById = new Map<string, ExistingDeadline>();

  for (const deadline of (existingDeadlines ?? []) as ExistingDeadline[]) {
    deadlinesById.set(deadline.id, deadline);

    const exactKey = deadlineExactKey(deadline.name, deadline.due_date);
    const exactCandidates = exactDeadlineMatches.get(exactKey) ?? [];
    exactCandidates.push(deadline);
    exactDeadlineMatches.set(exactKey, exactCandidates);

    const nameKey = normalizeDeadlineName(deadline.name);
    const nameCandidates = deadlinesByName.get(nameKey) ?? [];
    nameCandidates.push(deadline);
    deadlinesByName.set(nameKey, nameCandidates);
  }

  const uniqueDeadlineNameMatches = new Map<string, ExistingDeadline>();
  for (const [nameKey, candidates] of deadlinesByName) {
    if (candidates.length === 1) {
      uniqueDeadlineNameMatches.set(nameKey, candidates[0]);
    }
  }

  const usedDeadlineIds = new Set<string>();
  const useLegacyDeadlineMatching = !state.rowSnapshot;
  const deadlinesToSave = state.deadlines
    .filter((deadline) => deadline.name.trim())
    .map((deadline) => {
      const databaseId = deadline.databaseId ?? null;
      const reviewedDeadline = {
        competition_id: state.competitionId,
        name: deadline.name.trim(),
        due_date: parseOptionalDate(deadline.due_date),
        fine_amount: parseOptionalNumber(deadline.fine_amount),
        is_hard_cutoff: deadline.is_hard_cutoff,
      };
      const existingDeadline = databaseId
        ? deadlinesById.get(databaseId) ?? null
        : useLegacyDeadlineMatching
          ? takeDeadlineMatch(
              reviewedDeadline,
              exactDeadlineMatches,
              uniqueDeadlineNameMatches,
              usedDeadlineIds,
            )
          : null;

      return {
        id: databaseId ?? existingDeadline?.id ?? null,
        name: reviewedDeadline.name,
        due_date: reviewedDeadline.due_date,
        fine_amount: reviewedDeadline.fine_amount,
        is_hard_cutoff: reviewedDeadline.is_hard_cutoff,
        status: existingDeadline?.status ?? ("pending" as const),
        completed_at: existingDeadline?.completed_at ?? null,
      };
    });

  const feesToSave = state.fees
    .filter((fee) => fee.name.trim())
    .map((fee) => ({
      id: fee.databaseId ?? null,
      name: fee.name.trim(),
      amount: parseOptionalNumber(fee.amount) ?? 0,
      is_per_person: fee.is_per_person,
      is_refundable: fee.is_refundable,
      due_date: parseOptionalDate(fee.due_date),
    }));

  const contactsToSave = state.contacts
    .filter((contact) => contact.name.trim())
    .map((contact, index) => ({
      id: contact.databaseId ?? null,
      name: contact.name.trim(),
      role: contact.role.trim() || null,
      email: contact.email.trim() || null,
      phone: contact.phone.trim() || null,
      sort_order: index,
    }));

  const { error: saveError } = await supabase.rpc("save_competition_packet_data", {
    p_competition_id: state.competitionId,
    p_roster_min: parseOptionalInteger(state.roster_rules.min_size),
    p_roster_max: parseOptionalInteger(state.roster_rules.max_size),
    p_per_person_registration_cost: parseOptionalNumber(
      state.roster_rules.per_person_registration_cost,
    ),
    p_min_performance_duration: parseOptionalInteger(
      state.performance_rules.min_duration_minutes,
    ),
    p_max_performance_duration: parseOptionalInteger(
      state.performance_rules.max_duration_minutes,
    ),
    p_mix_format: state.performance_rules.mix_format.trim() || null,
    p_tech_rehearsal_required: state.performance_rules.tech_rehearsal_required,
    p_deadlines: deadlinesToSave,
    p_fees: feesToSave,
    p_contacts: contactsToSave,
    p_known_deadline_ids: snapshotIds(state.rowSnapshot?.deadlineIds),
    p_known_fee_ids: snapshotIds(state.rowSnapshot?.feeIds),
    p_known_contact_ids: snapshotIds(state.rowSnapshot?.contactIds),
  });

  if (saveError) {
    throwSaveError(saveError);
  }
}

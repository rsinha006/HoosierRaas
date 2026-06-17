import { createClient } from "@/lib/supabase/client";
import type { PacketReviewFormState } from "@/lib/packet-review";
import { toUserFacingSaveError } from "@/lib/user-facing-errors";

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

export async function saveCompetitionPacketData(state: PacketReviewFormState) {
  const supabase = createClient();

  const { data: updatedCompetition, error: competitionError } = await supabase
    .from("competitions")
    .update({
      status: "active",
      roster_min: parseOptionalInteger(state.roster_rules.min_size),
      roster_max: parseOptionalInteger(state.roster_rules.max_size),
      per_person_registration_cost: parseOptionalNumber(
        state.roster_rules.per_person_registration_cost,
      ),
      min_performance_duration: parseOptionalInteger(
        state.performance_rules.min_duration_minutes,
      ),
      max_performance_duration: parseOptionalInteger(
        state.performance_rules.max_duration_minutes,
      ),
      mix_format: state.performance_rules.mix_format.trim() || null,
      tech_rehearsal_required: state.performance_rules.tech_rehearsal_required,
    })
    .eq("id", state.competitionId)
    .select("id")
    .maybeSingle();

  if (competitionError) {
    throwSaveError(competitionError);
  }

  if (!updatedCompetition) {
    throw new Error(
      "We could not find this competition. It may have been deleted or you may not have access.",
    );
  }

  const { error: deleteDeadlinesError } = await supabase
    .from("deadlines")
    .delete()
    .eq("competition_id", state.competitionId);

  if (deleteDeadlinesError) {
    throwSaveError(deleteDeadlinesError);
  }

  const { error: deleteFeesError } = await supabase
    .from("fees")
    .delete()
    .eq("competition_id", state.competitionId);

  if (deleteFeesError) {
    throwSaveError(deleteFeesError);
  }

  const { error: deleteContactsError } = await supabase
    .from("competition_contacts")
    .delete()
    .eq("competition_id", state.competitionId);

  if (deleteContactsError) {
    throwSaveError(deleteContactsError);
  }

  const deadlinesToInsert = state.deadlines
    .filter((deadline) => deadline.name.trim())
    .map((deadline) => ({
      competition_id: state.competitionId,
      name: deadline.name.trim(),
      due_date: parseOptionalDate(deadline.due_date),
      fine_amount: parseOptionalNumber(deadline.fine_amount),
      is_hard_cutoff: deadline.is_hard_cutoff,
      status: "pending" as const,
      completed_at: null,
    }));

  if (deadlinesToInsert.length > 0) {
    const { error } = await supabase
      .from("deadlines")
      .insert(deadlinesToInsert);

    if (error) {
      throwSaveError(error);
    }
  }

  const feesToInsert = state.fees
    .filter((fee) => fee.name.trim())
    .map((fee) => ({
      competition_id: state.competitionId,
      name: fee.name.trim(),
      amount: parseOptionalNumber(fee.amount) ?? 0,
      is_per_person: fee.is_per_person,
      is_refundable: fee.is_refundable,
      due_date: parseOptionalDate(fee.due_date),
    }));

  if (feesToInsert.length > 0) {
    const { error } = await supabase.from("fees").insert(feesToInsert);

    if (error) {
      throwSaveError(error);
    }
  }

  const contactsToInsert = state.contacts
    .filter((contact) => contact.name.trim())
    .map((contact, index) => ({
      competition_id: state.competitionId,
      name: contact.name.trim(),
      role: contact.role.trim() || null,
      email: contact.email.trim() || null,
      phone: contact.phone.trim() || null,
      sort_order: index,
    }));

  if (contactsToInsert.length > 0) {
    const { error } = await supabase
      .from("competition_contacts")
      .insert(contactsToInsert);

    if (error) {
      throwSaveError(error);
    }
  }
}

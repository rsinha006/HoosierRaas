import {
  computeSeasonEndingBalance,
  type ArchiveFinancePreview,
  type ArchiveMemberDecision,
} from "@/lib/archive-season";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSeasonDateRange,
  getSeasonTimestampBounds,
  type ExpenseRequest,
  type IncomeEntry,
} from "@/lib/finance";
import { getNextSeasonLabel } from "@/lib/season-label";
import { createClient } from "@/lib/supabase/server";

export async function loadArchiveFinancePreview(
  activeSeasonLabel: string,
): Promise<ArchiveFinancePreview> {
  const supabase = await createClient();
  const { start, end } = getSeasonDateRange(activeSeasonLabel);
  const { start: expenseStart, end: expenseEnd } =
    getSeasonTimestampBounds(activeSeasonLabel);

  const [
    { data: incomeData },
    { data: approvedExpenseData },
    { count: budgetCount },
    { count: lineItemCount },
  ] = await Promise.all([
    supabase
      .from("income_entries")
      .select("amount")
      .gte("date_received", start)
      .lte("date_received", end),
    supabase
      .from("expense_requests")
      .select("amount")
      .eq("status", "approved")
      .gte("created_at", expenseStart)
      .lte("created_at", expenseEnd),
    supabase
      .from("budgets")
      .select("*", { count: "exact", head: true })
      .eq("season", activeSeasonLabel),
    supabase
      .from("iufb_line_items")
      .select("*", { count: "exact", head: true })
      .eq("season", activeSeasonLabel),
  ]);

  const endingBalance = computeSeasonEndingBalance(
    (incomeData ?? []) as Pick<IncomeEntry, "amount">[],
    (approvedExpenseData ?? []) as Pick<ExpenseRequest, "amount">[],
  );

  return {
    budgetCount: budgetCount ?? 0,
    lineItemCount: lineItemCount ?? 0,
    endingBalance,
    nextSeasonLabel: getNextSeasonLabel(activeSeasonLabel),
  };
}

export async function deleteMemberLoginsByEmail(
  emails: string[],
): Promise<string[]> {
  if (emails.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const normalizedEmails = [
    ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];

  if (normalizedEmails.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, email")
    .in("email", normalizedEmails);

  if (profilesError) {
    return normalizedEmails.map((email) => `${email}: ${profilesError.message}`);
  }

  const profileIdByEmail = new Map(
    (profiles ?? [])
      .filter((profile) => profile.email)
      .map((profile) => [profile.email!.toLowerCase(), profile.id]),
  );

  const failures: string[] = [];

  for (const email of normalizedEmails) {
    const userId = profileIdByEmail.get(email);

    if (!userId) {
      continue;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      failures.push(`${email}: ${deleteError.message}`);
    }
  }

  return failures;
}

export async function resolveLoginDeletionEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  members: ArchiveMemberDecision[],
): Promise<string[]> {
  const memberIds = members
    .filter((member) => member.delete_login)
    .map((member) => member.member_id);

  if (memberIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("members")
    .select("email")
    .in("id", memberIds);

  if (error) {
    throw error;
  }

  return (data ?? []).map((member) => member.email);
}

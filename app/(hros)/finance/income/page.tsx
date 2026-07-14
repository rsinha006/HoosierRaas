import Link from "next/link";
import AddIncomeForm from "@/components/add-income-form";
import { getUserMember } from "@/lib/get-user-member";
import {
  formatCurrency,
  getSeasonDateRange,
  sumIncomeByCategory,
  type IncomeEntry,
} from "@/lib/finance";
import { formatMemberName } from "@/lib/members";
import { hasWriteAccess } from "@/lib/rbac";
import { getViewingSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

type FinanceIncomePageProps = {
  searchParams: Promise<{ season?: string }>;
};

export default async function FinanceIncomePage({
  searchParams,
}: FinanceIncomePageProps) {
  const params = await searchParams;
  const viewingSeason = await getViewingSeason(params.season);
  const season = viewingSeason.label;
  const { start, end } = getSeasonDateRange(season);

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  const canWrite =
    hasWriteAccess(userMember?.exec_title ?? null, "finance") && viewingSeason.is_active;

  const [
    { data: incomeData, error: incomeError },
    { data: membersData, error: membersError },
  ] = await Promise.all([
    supabase
      .from("income_entries")
      .select("amount, category, member_id")
      .gte("date_received", start)
      .lte("date_received", end),
    supabase
      .from("members")
      .select("id, first_name, last_name")
      .eq("status", "active")
      .eq("pending_review", false)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true }),
  ]);

  const incomeEntries = (incomeData ?? []) as Pick<
    IncomeEntry,
    "amount" | "category" | "member_id"
  >[];
  const totalIncome = incomeEntries.reduce(
    (sum, entry) => sum + Number(entry.amount),
    0,
  );
  const categoryBreakdown = sumIncomeByCategory(incomeEntries);

  const activeMembers = (membersData ?? []) as {
    id: string;
    first_name: string;
    last_name: string;
  }[];
  const duesPaidByMember = new Map<string, number>();
  for (const entry of incomeEntries) {
    if (entry.category !== "dues" || !entry.member_id) {
      continue;
    }
    duesPaidByMember.set(
      entry.member_id,
      (duesPaidByMember.get(entry.member_id) ?? 0) + Number(entry.amount),
    );
  }
  const duesStatusRows = activeMembers.map((member) => ({
    member,
    paid: duesPaidByMember.get(member.id) ?? 0,
    hasPaid: duesPaidByMember.has(member.id),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Income</h1>
            <p className="mt-2 text-zinc-600">
              Income tracking for the {season} season.
            </p>
          </div>

          <Link
            href="/finance"
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Back to Finance
          </Link>
        </div>
      </div>

      {incomeError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load income data</p>
          <p className="mt-1 text-sm">{incomeError.message}</p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Total Income</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">
              {formatCurrency(totalIncome)}
            </p>
            <p className="mt-1 text-sm text-zinc-500">Received {season}</p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Income by Category
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Breakdown for the {season} season.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-3 font-medium">Category</th>
                    <th className="px-3 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((row) => (
                    <tr key={row.category} className="border-b border-zinc-100">
                      <td className="px-3 py-3 text-zinc-900">{row.label}</td>
                      <td className="px-3 py-3 text-right font-medium text-zinc-900">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-3 py-3 font-semibold text-zinc-900">Total</td>
                    <td className="px-3 py-3 text-right font-semibold text-zinc-900">
                      {formatCurrency(totalIncome)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Dues Status</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Who&apos;s paid dues for {season}, based on dues income linked to a member.
            </p>

            {membersError ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Could not load members: {membersError.message}
              </div>
            ) : duesStatusRows.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">No active members on the roster yet.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500">
                      <th className="px-3 py-3 font-medium">Member</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium text-right">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duesStatusRows.map((row) => (
                      <tr key={row.member.id} className="border-b border-zinc-100">
                        <td className="px-3 py-3 text-zinc-900">
                          {formatMemberName(row.member)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              row.hasPaid
                                ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            }`}
                          >
                            {row.hasPaid ? "Paid" : "Not paid"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-zinc-900">
                          {formatCurrency(row.paid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {canWrite ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Add Income</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Record a new income entry for the team.
          </p>

          {membersError ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not load active members: {membersError.message}
            </div>
          ) : (
            <div className="mt-6">
              <AddIncomeForm activeMembers={activeMembers} season={season} />
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

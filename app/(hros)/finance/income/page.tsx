import Link from "next/link";
import AddIncomeForm from "@/components/add-income-form";
import { getUserMember } from "@/lib/get-user-member";
import {
  formatCurrency,
  getCurrentSeason,
  getSeasonDateRange,
  sumIncomeByCategory,
  type IncomeEntry,
} from "@/lib/finance";
import { hasWriteAccess } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export default async function FinanceIncomePage() {
  const season = getCurrentSeason();
  const { start, end } = getSeasonDateRange(season);

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  const canWrite = hasWriteAccess(userMember?.exec_title ?? null, "finance");

  const [
    { data: incomeData, error: incomeError },
    { data: membersData, error: membersError },
  ] = await Promise.all([
    supabase
      .from("income_entries")
      .select("amount, category")
      .gte("date_received", start)
      .lte("date_received", end),
    canWrite
      ? supabase
          .from("members")
          .select("id, first_name, last_name")
          .eq("status", "active")
          .eq("pending_review", false)
          .order("last_name", { ascending: true })
          .order("first_name", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const incomeEntries = (incomeData ?? []) as Pick<
    IncomeEntry,
    "amount" | "category"
  >[];
  const totalIncome = incomeEntries.reduce(
    (sum, entry) => sum + Number(entry.amount),
    0,
  );
  const categoryBreakdown = sumIncomeByCategory(incomeEntries);

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
              <AddIncomeForm activeMembers={membersData ?? []} />
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

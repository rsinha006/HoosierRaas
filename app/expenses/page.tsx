import type { Metadata } from "next";
import ExpenseRequestForm from "@/components/expense-request-form";
import { buildPublicExpenseCategories } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import type { Competition } from "@/lib/competitions";

export const metadata: Metadata = {
  title: "Expense Request | HoosierRaas",
  description: "Submit a pre-approval expense request for HoosierRaas.",
};

export default async function PublicExpenseRequestPage() {
  const supabase = await createClient();

  const [
    { data: competitionData, error: competitionError },
    { data: categoryData, error: categoryError },
    { data: lineItemData, error: lineItemError },
  ] = await Promise.all([
    supabase
      .from("competitions")
      .select("id, name, competition_date")
      .order("competition_date", { ascending: true }),
    supabase.rpc("list_active_season_expense_categories"),
    supabase.rpc("list_active_season_iufb_line_items"),
  ]);

  const loadError = competitionError ?? categoryError ?? lineItemError;

  const competitions = (competitionData ?? []) as Pick<
    Competition,
    "id" | "name" | "competition_date"
  >[];
  const generalPoolCategories = buildPublicExpenseCategories(
    (categoryData ?? []) as { category: string }[],
  );
  const iufbLineItems = (lineItemData ?? []) as { id: string; description: string }[];

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#990000]">
            HoosierRaas
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
            Expense request
          </h1>
          <p className="mt-2 text-sm text-zinc-600 sm:text-base">
            Request pre-approval for a team expense before you spend any money.
          </p>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-medium">Could not load the form</p>
            <p className="mt-1 text-sm">{loadError.message}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <ExpenseRequestForm
              competitions={competitions}
              generalPoolCategories={generalPoolCategories}
              iufbLineItems={iufbLineItems}
            />
          </div>
        )}
      </div>
    </main>
  );
}

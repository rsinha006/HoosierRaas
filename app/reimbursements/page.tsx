import type { Metadata } from "next";
import ReimbursementForm from "@/components/reimbursement-form";
import { buildPublicExpenseCategories } from "@/lib/finance";
import { PUBLIC_PAGE_ROBOTS } from "@/lib/public-links";
import { createClient } from "@/lib/supabase/server";
import type { Competition } from "@/lib/competitions";

export const metadata: Metadata = {
  title: "Reimbursement Request | HoosierRaas",
  description: "Submit an out-of-pocket reimbursement request for HoosierRaas.",
  robots: PUBLIC_PAGE_ROBOTS,
};

export default async function PublicReimbursementsPage() {
  const supabase = await createClient();

  // Active season only. Reading public.competitions from here would list every
  // competition HROS has ever held, and this page cannot filter by season itself -
  // public.seasons is readable by authenticated users only.
  const [
    { data: competitionData, error: competitionError },
    { data: categoryData, error: categoryError },
  ] = await Promise.all([
    supabase.rpc("list_active_season_competitions"),
    supabase.rpc("list_active_season_expense_categories"),
  ]);

  const loadError = competitionError ?? categoryError;

  const competitions = (competitionData ?? []) as Pick<
    Competition,
    "id" | "name" | "competition_date"
  >[];
  const generalPoolCategories = buildPublicExpenseCategories(
    (categoryData ?? []) as { category: string }[],
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#990000]">
            HoosierRaas
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
            Reimbursement request
          </h1>
          <p className="mt-2 text-sm text-zinc-600 sm:text-base">
            Submit out-of-pocket team expenses for finance review. Requests must
            be submitted within 24 hours of purchase — late submissions
            can&apos;t be accepted.
          </p>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-medium">Could not load the form</p>
            <p className="mt-1 text-sm">{loadError.message}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <ReimbursementForm
              competitions={competitions}
              generalPoolCategories={generalPoolCategories}
            />
          </div>
        )}
      </div>
    </main>
  );
}

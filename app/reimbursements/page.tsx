import type { Metadata } from "next";
import ReimbursementForm from "@/components/reimbursement-form";
import { createClient } from "@/lib/supabase/server";
import type { Competition } from "@/lib/competitions";

export const metadata: Metadata = {
  title: "Reimbursement Request | HoosierRaas",
  description: "Submit an out-of-pocket reimbursement request for HoosierRaas.",
};

export default async function PublicReimbursementsPage() {
  const supabase = await createClient();

  const { data: competitionData, error: competitionError } = await supabase
    .from("competitions")
    .select("id, name, competition_date")
    .order("competition_date", { ascending: true });

  const competitions = (competitionData ?? []) as Pick<
    Competition,
    "id" | "name" | "competition_date"
  >[];

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
            Submit out-of-pocket team expenses for finance review. Upload your
            receipt within 24 hours of purchase when possible.
          </p>
        </div>

        {competitionError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-medium">Could not load the form</p>
            <p className="mt-1 text-sm">{competitionError.message}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <ReimbursementForm competitions={competitions} />
          </div>
        )}
      </div>
    </main>
  );
}

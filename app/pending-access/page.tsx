import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

export default async function PendingAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#990000]">
            HoosierRaas
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Access pending</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Your account has been created, but a Captain or Team Manager still needs to assign
            your role before you can use HROS.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Signed in as <span className="font-medium text-zinc-900">{user.email}</span>
          </p>
          <div className="mt-6">
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import UserSignupForm from "@/components/user-signup-form";

export const metadata: Metadata = {
  title: "Create Account | HoosierRaas",
  description: "Create your HROS login account.",
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#990000]">
            HoosierRaas
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Create your account</h1>
          <p className="mt-2 text-sm text-zinc-600 sm:text-base">
            Set up login credentials for the HROS executive portal.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <UserSignupForm />
        </div>
      </div>
    </main>
  );
}

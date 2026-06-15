import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#990000]">
            HoosierRaas
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">HROS</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Executive board sign-in
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("teams").select("*");

  console.log("Supabase connection test:", { data, error });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
        HROS — Supabase connection test
      </h1>

      <p className="max-w-lg text-center text-zinc-600 dark:text-zinc-400">
        Open the terminal where <code className="text-sm">npm run dev</code> is
        running. You should see a log line that starts with{" "}
        <strong>Supabase connection test:</strong>
      </p>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          Connection failed: {error.message}
        </p>
      ) : (
        <pre className="max-w-lg overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 text-left text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PRACTICE_SESSION_TYPES,
  type PracticeSessionType,
} from "@/lib/attendance";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const requiredMark = <span className="text-[#990000]">*</span>;

type PracticeSessionCreateFormProps = {
  season: string;
};

export default function PracticeSessionCreateForm({ season }: PracticeSessionCreateFormProps) {
  const router = useRouter();

  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [type, setType] = useState<PracticeSessionType>("practice");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!sessionDate) {
      errors.sessionDate = "Session date is required.";
    }

    if (!sessionTime) {
      errors.sessionTime = "Session time is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data: session, error } = await supabase
      .from("practice_sessions")
      .insert({
        season,
        session_date: sessionDate,
        session_time: sessionTime,
        type,
      })
      .select("id")
      .single();

    setLoading(false);

    if (error || !session) {
      setSaveError(error?.message ?? "Could not create practice session.");
      return;
    }

    router.push(`/attendance/${session.id}?created=1`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label htmlFor="session-date" className="block text-sm font-medium text-zinc-700">
          Session date {requiredMark}
        </label>
        <input
          id="session-date"
          type="date"
          value={sessionDate}
          onChange={(event) => setSessionDate(event.target.value)}
          className={inputClassName}
        />
        {fieldErrors.sessionDate ? (
          <p className="text-sm text-red-600">{fieldErrors.sessionDate}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="session-time" className="block text-sm font-medium text-zinc-700">
          Session time {requiredMark}
        </label>
        <input
          id="session-time"
          type="time"
          value={sessionTime}
          onChange={(event) => setSessionTime(event.target.value)}
          className={inputClassName}
        />
        {fieldErrors.sessionTime ? (
          <p className="text-sm text-red-600">{fieldErrors.sessionTime}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="session-type" className="block text-sm font-medium text-zinc-700">
          Type {requiredMark}
        </label>
        <select
          id="session-type"
          value={type}
          onChange={(event) => setType(event.target.value as PracticeSessionType)}
          className={inputClassName}
        >
          {PRACTICE_SESSION_TYPES.map((value) => (
            <option key={value} value={value}>
              {value === "exec meeting"
                ? "Exec Meeting"
                : value.charAt(0).toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {saveError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create session"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/attendance")}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

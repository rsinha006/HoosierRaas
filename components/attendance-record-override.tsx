"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ATTENDANCE_STATUSES,
  formatAttendanceStatus,
  type AttendanceStatus,
} from "@/lib/attendance";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-3 text-base text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

type AttendanceRecordOverrideProps = {
  recordId: string;
  currentStatus: AttendanceStatus;
};

export default function AttendanceRecordOverride({
  recordId,
  currentStatus,
}: AttendanceRecordOverrideProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("A written reason is required.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: overrideError } = await supabase.rpc("override_attendance_record", {
      p_record_id: recordId,
      p_new_status: newStatus,
      p_reason: reason.trim(),
    });

    setLoading(false);

    if (overrideError) {
      setError(overrideError.message ?? "Could not save override.");
      return;
    }

    setOpen(false);
    setReason("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
      >
        Override
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="space-y-2">
        <label htmlFor={`override-status-${recordId}`} className="block text-sm font-medium text-zinc-700">
          New status
        </label>
        <select
          id={`override-status-${recordId}`}
          value={newStatus}
          onChange={(event) => setNewStatus(event.target.value as AttendanceStatus)}
          className={inputClassName}
        >
          {ATTENDANCE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatAttendanceStatus(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor={`override-reason-${recordId}`} className="block text-sm font-medium text-zinc-700">
          Override reason
        </label>
        <textarea
          id={`override-reason-${recordId}`}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={inputClassName}
          placeholder="Explain why this attendance record is being changed."
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#990000] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save override"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setReason("");
            setNewStatus(currentStatus);
          }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

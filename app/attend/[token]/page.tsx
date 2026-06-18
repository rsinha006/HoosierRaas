import type { Metadata } from "next";
import AttendanceResponseForm from "@/components/attendance-response-form";
import {
  formatSessionTime,
  formatSessionType,
  isValidShareableToken,
  type PracticeSessionType,
  type PracticeSessionStatus,
  type PublicAttendanceSession,
} from "@/lib/attendance";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Attendance | HoosierRaas",
  description: "Submit your practice session attendance response.",
};

type PublicAttendPageProps = {
  params: Promise<{ token: string }>;
};

type SessionLookupRow = {
  id: string;
  session_date: string;
  session_time: string;
  type: PracticeSessionType;
  status: PracticeSessionStatus;
  response_window_closes_at: string;
  is_accepting_responses: boolean;
};

function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function AttendMessageCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-lg items-center">
        <div className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#990000]">
            HoosierRaas
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">{title}</h1>
          <p className="mt-3 text-base text-zinc-600">{message}</p>
        </div>
      </div>
    </main>
  );
}

export default async function PublicAttendPage({ params }: PublicAttendPageProps) {
  const { token } = await params;

  if (!isValidShareableToken(token)) {
    return (
      <AttendMessageCard
        title="Session not found"
        message="This attendance link is invalid. Double-check the URL you were given."
      />
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_practice_session_for_attendance", {
    p_token: token,
  });

  if (error) {
    return (
      <AttendMessageCard
        title="Something went wrong"
        message="We could not load this attendance session. Please try again in a moment."
      />
    );
  }

  const sessionRow = (data?.[0] ?? null) as SessionLookupRow | null;

  if (!sessionRow) {
    return (
      <AttendMessageCard
        title="Session not found"
        message="This attendance link is invalid. Double-check the URL you were given."
      />
    );
  }

  if (!sessionRow.is_accepting_responses) {
    return (
      <AttendMessageCard
        title="Session closed"
        message="This session is no longer accepting responses. The response window has ended."
      />
    );
  }

  const session: PublicAttendanceSession = {
    id: sessionRow.id,
    session_date: sessionRow.session_date,
    session_time: sessionRow.session_time,
    type: sessionRow.type,
    status: sessionRow.status,
    response_window_closes_at: sessionRow.response_window_closes_at,
    is_accepting_responses: sessionRow.is_accepting_responses,
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 text-center sm:mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#990000]">
            HoosierRaas Attendance
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">
            {formatSessionType(session.type)}
          </h1>
          <p className="mt-2 text-base text-zinc-600">
            {formatSessionDate(session.session_date)} at{" "}
            {formatSessionTime(session.session_time)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 border-b border-zinc-200 pb-4">
            <h2 className="text-lg font-semibold text-zinc-900">Submit your response</h2>
            <p className="mt-1 text-sm text-zinc-600">
              No login required. Complete all required sections below.
            </p>
          </div>

          <AttendanceResponseForm session={session} />
        </div>
      </div>
    </main>
  );
}

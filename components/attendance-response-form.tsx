"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidEmail } from "@/lib/members";
import {
  isVideoDeadlineDay,
  mapAttendanceChoiceToStatus,
  requiresExcuseForChoice,
  type AttendanceChoice,
  type PublicAttendanceSession,
} from "@/lib/attendance";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-3 text-base text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const labelClassName = "block text-sm font-medium text-zinc-700";

const requiredMark = <span className="text-[#990000]">*</span>;

type AttendanceResponseFormProps = {
  session: PublicAttendanceSession;
};

type FormView = "form" | "success" | "duplicate";

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-zinc-200 pb-3">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      ) : null}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-red-600">{message}</p>;
}

function RadioOption({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition ${
        checked
          ? "border-[#990000] bg-[#990000]/5 ring-1 ring-[#990000]/20"
          : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 shrink-0 border-zinc-300 text-[#990000] focus:ring-[#990000]"
      />
      <span className="text-base text-zinc-900">{label}</span>
    </label>
  );
}

export default function AttendanceResponseForm({ session }: AttendanceResponseFormProps) {
  const showVideoSection = useMemo(
    () => isVideoDeadlineDay(new Date(`${session.session_date}T12:00:00`)),
    [session.session_date],
  );

  const [view, setView] = useState<FormView>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [attendanceChoice, setAttendanceChoice] = useState<AttendanceChoice>("attended");
  const [excuseText, setExcuseText] = useState("");
  const [advanceNotice, setAdvanceNotice] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [practiceVideoSubmitted, setPracticeVideoSubmitted] = useState<boolean | null>(null);
  const [practiceVideoExcuse, setPracticeVideoExcuse] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showExcuseFields = requiresExcuseForChoice(attendanceChoice);

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required.";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required.";
    }

    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!isValidEmail(email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (showExcuseFields && !excuseText.trim()) {
      errors.excuseText = "Please describe the reason.";
    }

    if (showVideoSection) {
      if (practiceVideoSubmitted === null) {
        errors.practiceVideoSubmitted =
          "Please indicate whether you submitted your practice video.";
      } else if (practiceVideoSubmitted === false && !practiceVideoExcuse.trim()) {
        errors.practiceVideoExcuse = "Please explain why your video was not submitted.";
      }
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
    const normalizedEmail = email.trim().toLowerCase();

    const { data: alreadySubmitted, error: duplicateError } = await supabase.rpc(
      "attendance_already_submitted",
      {
        p_session_id: session.id,
        p_email: normalizedEmail,
      },
    );

    if (duplicateError) {
      setLoading(false);
      setSaveError(duplicateError.message ?? "Could not verify your submission status.");
      return;
    }

    if (alreadySubmitted) {
      setLoading(false);
      setView("duplicate");
      return;
    }

    const attendanceStatus = mapAttendanceChoiceToStatus(
      attendanceChoice,
      advanceNotice,
      isEmergency,
    );

    const { error } = await supabase.rpc("submit_attendance_response", {
      p_session_id: session.id,
      p_respondent_name: `${firstName.trim()} ${lastName.trim()}`,
      p_respondent_email: normalizedEmail,
      p_attendance_status: attendanceStatus,
      p_excuse_text: showExcuseFields ? excuseText.trim() : null,
      p_advance_notice: showExcuseFields ? advanceNotice : false,
      p_is_emergency: showExcuseFields ? isEmergency : false,
      p_practice_video_submitted: showVideoSection ? practiceVideoSubmitted : null,
      p_practice_video_excuse:
        showVideoSection && practiceVideoSubmitted === false
          ? practiceVideoExcuse.trim()
          : null,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        setView("duplicate");
        return;
      }

      setSaveError(error.message ?? "Could not submit your response.");
      return;
    }

    setView("success");
  }

  if (view === "success") {
    return (
      <div
        role="status"
        className="rounded-xl border border-green-200 bg-green-50 px-5 py-5 text-green-800 sm:px-6"
      >
        <p className="text-lg font-semibold">Response submitted</p>
        <p className="mt-1 text-sm">
          Your attendance response has been recorded. You can close this page.
        </p>
      </div>
    );
  }

  if (view === "duplicate") {
    return (
      <div
        role="status"
        className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 text-amber-900 sm:px-6"
      >
        <p className="text-lg font-semibold">You already submitted for this session.</p>
        <p className="mt-1 text-sm">
          Only one response is allowed per email address for each session.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <section className="space-y-4">
        <SectionHeading
          title="Section 1 — Identity"
          description="Tell us who is submitting this response."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="first-name" className={labelClassName}>
              First name {requiredMark}
            </label>
            <input
              id="first-name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={inputClassName}
            />
            <FieldError message={fieldErrors.firstName} />
          </div>

          <div className="space-y-2">
            <label htmlFor="last-name" className={labelClassName}>
              Last name {requiredMark}
            </label>
            <input
              id="last-name"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className={inputClassName}
            />
            <FieldError message={fieldErrors.lastName} />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className={labelClassName}>
            Email {requiredMark}
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClassName}
          />
          <FieldError message={fieldErrors.email} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Section 2 — Attendance" />

        <fieldset className="space-y-3">
          <legend className="sr-only">Attendance status</legend>
          <RadioOption
            name="attendance"
            value="attended"
            checked={attendanceChoice === "attended"}
            onChange={() => setAttendanceChoice("attended")}
            label="Yes, I attended"
          />
          <RadioOption
            name="attendance"
            value="late"
            checked={attendanceChoice === "late"}
            onChange={() => setAttendanceChoice("late")}
            label="I was late"
          />
          <RadioOption
            name="attendance"
            value="absent"
            checked={attendanceChoice === "absent"}
            onChange={() => setAttendanceChoice("absent")}
            label="I did not attend"
          />
        </fieldset>

        {showExcuseFields ? (
          <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
            <div className="space-y-2">
              <label htmlFor="excuse-text" className={labelClassName}>
                Please describe the reason {requiredMark}
              </label>
              <textarea
                id="excuse-text"
                rows={4}
                value={excuseText}
                onChange={(event) => setExcuseText(event.target.value)}
                className={inputClassName}
              />
              <FieldError message={fieldErrors.excuseText} />
            </div>

            <label className="flex items-start gap-3 text-base text-zinc-700">
              <input
                type="checkbox"
                checked={advanceNotice}
                onChange={(event) => setAdvanceNotice(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-[#990000] focus:ring-[#990000]"
              />
              <span>I notified captains at least 24 hours in advance</span>
            </label>

            <label className="flex items-start gap-3 text-base text-zinc-700">
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(event) => setIsEmergency(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-[#990000] focus:ring-[#990000]"
              />
              <span>This was an emergency — I notified as soon as possible</span>
            </label>
          </div>
        ) : null}
      </section>

      {showVideoSection ? (
        <section className="space-y-4">
          <SectionHeading
            title="Section 3 — Video Submission"
            description="Practice video deadlines are on Thursdays and Sundays."
          />

          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-medium text-zinc-700">
              Did you submit your practice video before the deadline? {requiredMark}
            </legend>
            <RadioOption
              name="practice-video"
              value="yes"
              checked={practiceVideoSubmitted === true}
              onChange={() => setPracticeVideoSubmitted(true)}
              label="Yes"
            />
            <RadioOption
              name="practice-video"
              value="no"
              checked={practiceVideoSubmitted === false}
              onChange={() => setPracticeVideoSubmitted(false)}
              label="No"
            />
          </fieldset>
          <FieldError message={fieldErrors.practiceVideoSubmitted} />

          {practiceVideoSubmitted === false ? (
            <div className="space-y-2">
              <label htmlFor="video-excuse" className={labelClassName}>
                Please explain {requiredMark}
              </label>
              <textarea
                id="video-excuse"
                rows={4}
                value={practiceVideoExcuse}
                onChange={(event) => setPracticeVideoExcuse(event.target.value)}
                className={inputClassName}
              />
              <FieldError message={fieldErrors.practiceVideoExcuse} />
            </div>
          ) : null}
        </section>
      ) : null}

      {saveError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#990000] px-4 py-3.5 text-base font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Submit response"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RegistrationPacketFileField from "@/components/registration-packet-file-field";
import {
  COMPETITION_STATUSES,
  type CompetitionStatus,
} from "@/lib/competitions";
import {
  getPacketStoragePath,
  validateRegistrationPacket,
} from "@/lib/registration-packets";
import { uploadRegistrationPacket } from "@/lib/upload-registration-packet";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const requiredMark = <span className="text-[#990000]">*</span>;

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

export default function CompetitionCreateForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [competitionDate, setCompetitionDate] = useState("");
  const [venue, setVenue] = useState("");
  const [location, setLocation] = useState("");
  const [minPerformanceDuration, setMinPerformanceDuration] = useState("");
  const [maxPerformanceDuration, setMaxPerformanceDuration] = useState("");
  const [mixFormat, setMixFormat] = useState("");
  const [rosterMin, setRosterMin] = useState("");
  const [rosterMax, setRosterMax] = useState("");
  const [status, setStatus] = useState<CompetitionStatus>("upcoming");
  const [packetFile, setPacketFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Creating...");

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Competition name is required.";
    }

    if (!competitionDate) {
      errors.competitionDate = "Competition date is required.";
    }

    const minDuration = parseOptionalInteger(minPerformanceDuration);
    const maxDuration = parseOptionalInteger(maxPerformanceDuration);
    const minRoster = parseOptionalInteger(rosterMin);
    const maxRoster = parseOptionalInteger(rosterMax);

    if (Number.isNaN(minDuration)) {
      errors.minPerformanceDuration = "Enter a valid number of minutes.";
    }

    if (Number.isNaN(maxDuration)) {
      errors.maxPerformanceDuration = "Enter a valid number of minutes.";
    }

    if (
      minDuration != null &&
      maxDuration != null &&
      !Number.isNaN(minDuration) &&
      !Number.isNaN(maxDuration) &&
      minDuration > maxDuration
    ) {
      errors.maxPerformanceDuration =
        "Maximum duration must be greater than or equal to minimum duration.";
    }

    if (Number.isNaN(minRoster)) {
      errors.rosterMin = "Enter a valid roster minimum.";
    }

    if (Number.isNaN(maxRoster)) {
      errors.rosterMax = "Enter a valid roster maximum.";
    }

    if (
      minRoster != null &&
      maxRoster != null &&
      !Number.isNaN(minRoster) &&
      !Number.isNaN(maxRoster) &&
      minRoster > maxRoster
    ) {
      errors.rosterMax =
        "Roster maximum must be greater than or equal to roster minimum.";
    }

    if (packetFile) {
      const packetError = validateRegistrationPacket(packetFile);
      if (packetError) {
        errors.packetFile = packetError;
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
    setLoadingMessage("Creating...");
    setUploadProgress(0);

    const supabase = createClient();
    const { data: competition, error } = await supabase
      .from("competitions")
      .insert({
        name: name.trim(),
        competition_date: competitionDate,
        venue: venue.trim() || null,
        location: location.trim() || null,
        min_performance_duration: parseOptionalInteger(minPerformanceDuration),
        max_performance_duration: parseOptionalInteger(maxPerformanceDuration),
        mix_format: mixFormat.trim() || null,
        roster_min: parseOptionalInteger(rosterMin),
        roster_max: parseOptionalInteger(rosterMax),
        status,
      })
      .select("id")
      .single();

    if (error || !competition) {
      setLoading(false);
      setSaveError(error?.message ?? "Could not create competition.");
      return;
    }

    if (packetFile) {
      try {
        setLoadingMessage("Uploading packet...");
        const storagePath = getPacketStoragePath(competition.id, packetFile.name);
        const uploadedAt = new Date().toISOString();

        await uploadRegistrationPacket({
          supabase,
          path: storagePath,
          file: packetFile,
          onProgress: setUploadProgress,
        });

        const { error: updateError } = await supabase
          .from("competitions")
          .update({
            packet_url: storagePath,
            packet_uploaded_at: uploadedAt,
          })
          .eq("id", competition.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } catch (uploadError) {
        setLoading(false);
        setUploadProgress(0);
        setSaveError(
          uploadError instanceof Error
            ? uploadError.message
            : "Competition was created, but the packet upload failed.",
        );
        return;
      }
    }

    setLoading(false);
    setUploadProgress(0);

    router.push("/team-manager/competitions?created=1");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Registration packet</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Upload the competition registration packet as a PDF.
          </p>
        </div>
        <RegistrationPacketFileField
          selectedFile={packetFile}
          onFileChange={(file) => {
            setPacketFile(file);
            setFieldErrors((current) => {
              const next = { ...current };
              delete next.packetFile;
              return next;
            });
          }}
          error={fieldErrors.packetFile}
        />
        {loading && packetFile ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>{loadingMessage}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-[#990000] transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="competition-name" className="block text-sm font-medium text-zinc-700">
          Name {requiredMark}
        </label>
        <input
          id="competition-name"
          type="text"
          placeholder="Mania 2026"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClassName}
        />
        {fieldErrors.name ? (
          <p className="text-sm text-red-600">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="competition-date" className="block text-sm font-medium text-zinc-700">
          Competition date {requiredMark}
        </label>
        <input
          id="competition-date"
          type="date"
          value={competitionDate}
          onChange={(event) => setCompetitionDate(event.target.value)}
          className={inputClassName}
        />
        {fieldErrors.competitionDate ? (
          <p className="text-sm text-red-600">{fieldErrors.competitionDate}</p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="venue" className="block text-sm font-medium text-zinc-700">
            Venue
          </label>
          <input
            id="venue"
            type="text"
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="location" className="block text-sm font-medium text-zinc-700">
            Location
          </label>
          <input
            id="location"
            type="text"
            placeholder="City, State"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="min-performance-duration"
            className="block text-sm font-medium text-zinc-700"
          >
            Min performance duration (minutes)
          </label>
          <input
            id="min-performance-duration"
            type="number"
            min="0"
            value={minPerformanceDuration}
            onChange={(event) => setMinPerformanceDuration(event.target.value)}
            className={inputClassName}
          />
          {fieldErrors.minPerformanceDuration ? (
            <p className="text-sm text-red-600">{fieldErrors.minPerformanceDuration}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="max-performance-duration"
            className="block text-sm font-medium text-zinc-700"
          >
            Max performance duration (minutes)
          </label>
          <input
            id="max-performance-duration"
            type="number"
            min="0"
            value={maxPerformanceDuration}
            onChange={(event) => setMaxPerformanceDuration(event.target.value)}
            className={inputClassName}
          />
          {fieldErrors.maxPerformanceDuration ? (
            <p className="text-sm text-red-600">{fieldErrors.maxPerformanceDuration}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="mix-format" className="block text-sm font-medium text-zinc-700">
            Mix format
          </label>
          <input
            id="mix-format"
            type="text"
            placeholder="mp3"
            value={mixFormat}
            onChange={(event) => setMixFormat(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="block text-sm font-medium text-zinc-700">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as CompetitionStatus)}
            className={inputClassName}
          >
            {COMPETITION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="roster-min" className="block text-sm font-medium text-zinc-700">
            Roster min
          </label>
          <input
            id="roster-min"
            type="number"
            min="0"
            value={rosterMin}
            onChange={(event) => setRosterMin(event.target.value)}
            className={inputClassName}
          />
          {fieldErrors.rosterMin ? (
            <p className="text-sm text-red-600">{fieldErrors.rosterMin}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="roster-max" className="block text-sm font-medium text-zinc-700">
            Roster max
          </label>
          <input
            id="roster-max"
            type="number"
            min="0"
            value={rosterMax}
            onChange={(event) => setRosterMax(event.target.value)}
            className={inputClassName}
          />
          {fieldErrors.rosterMax ? (
            <p className="text-sm text-red-600">{fieldErrors.rosterMax}</p>
          ) : null}
        </div>
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
          {loading ? loadingMessage : "Create competition"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/team-manager/competitions")}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

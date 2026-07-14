"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatExecTitle, formatMemberName, formatRole, type Member } from "@/lib/members";
import { ONBOARDING_STORAGE_BUCKET } from "@/lib/onboarding";
import { toUserFacingStorageError } from "@/lib/user-facing-errors";

type MemberDetailViewProps = {
  member: Member;
  seasonExecTitle: string | null;
  season: string;
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900">{value || "—"}</dd>
    </div>
  );
}

function DocumentLink({ label, path }: { label: string; path: string | null | undefined }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openDocument() {
    if (!path) {
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signedUrlError } = await supabase.storage
      .from(ONBOARDING_STORAGE_BUCKET)
      .createSignedUrl(path, 3600);

    setLoading(false);

    if (signedUrlError || !data?.signedUrl) {
      setError(toUserFacingStorageError(signedUrlError ?? new Error("not found")));
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (!path) {
    return (
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
        <dd className="mt-1 text-sm text-zinc-400">Not uploaded</dd>
      </div>
    );
  }

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1">
        <button
          type="button"
          onClick={openDocument}
          disabled={loading}
          className="text-sm font-medium text-[#990000] hover:underline disabled:opacity-60"
        >
          {loading ? "Opening..." : "View uploaded file"}
        </button>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </dd>
    </div>
  );
}

export default function MemberDetailView({
  member,
  seasonExecTitle,
  season,
}: MemberDetailViewProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Roster info</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {member.roles.map((role) => (
              <span
                key={role}
                className="inline-flex rounded-full bg-[#990000]/10 px-2.5 py-0.5 text-xs font-medium text-[#990000]"
              >
                {formatRole(role)}
              </span>
            ))}
          </div>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Status" value={member.status.charAt(0).toUpperCase() + member.status.slice(1)} />
          <DetailItem label={`Exec title (${season})`} value={formatExecTitle(seasonExecTitle)} />
          <DetailItem label="Graduation year" value={member.graduation_year} />
          <DetailItem label="Email" value={member.email} />
          <DetailItem label="Phone" value={member.phone} />
        </dl>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-zinc-900">Health &amp; sizing</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Shirt size" value={member.shirt_size} />
          <DetailItem label="Pants size" value={member.pants_size} />
          <DetailItem
            label="Do they drink?"
            value={
              member.drinks_alcohol === null || member.drinks_alcohol === undefined
                ? null
                : member.drinks_alcohol
                  ? "Yes"
                  : "No"
            }
          />
          <DetailItem label="Dietary restrictions" value={member.dietary_restrictions} />
          <DetailItem label="Medical conditions" value={member.medical_conditions} />
        </dl>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-zinc-900">Emergency contact</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Name" value={member.emergency_contact_name} />
          <DetailItem label="Phone" value={member.emergency_contact_phone} />
        </dl>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-zinc-900">Documents</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Uploaded during onboarding for {formatMemberName(member)}.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DocumentLink label="Government ID" path={member.government_id_path} />
          <DocumentLink label="Student ID" path={member.student_id_path} />
          <DocumentLink label="Birthday story photo" path={member.birthday_image_path} />
          <DocumentLink label="COVID vaccination card" path={member.covid_vaccination_path} />
        </dl>
      </section>
    </div>
  );
}

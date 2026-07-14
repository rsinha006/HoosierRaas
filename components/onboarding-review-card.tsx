"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  EXEC_TITLES,
  formatMemberName,
  formatPhoneForStorage,
  isValidPhone,
  type ExecTitle,
  type Member,
  type MemberRole,
} from "@/lib/members";
import { CLOTHING_SIZES, ONBOARDING_STORAGE_BUCKET } from "@/lib/onboarding";
import {
  toUserFacingMemberSaveError,
  toUserFacingStorageError,
} from "@/lib/user-facing-errors";

import { normalizeMembershipExecTitle } from "@/lib/season-memberships";

type OnboardingReviewCardProps = {
  member: Member;
  canWrite: boolean;
  activeSeason: string;
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const labelClassName = "block text-sm font-medium text-zinc-700";

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">{value || "—"}</dd>
    </div>
  );
}

function DocumentLink({
  label,
  path,
}: {
  label: string;
  path: string | null | undefined;
}) {
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
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </dt>
        <dd className="mt-1 text-sm text-zinc-400">Not uploaded</dd>
      </div>
    );
  }

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
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

export default function OnboardingReviewCard({
  member,
  canWrite,
  activeSeason,
}: OnboardingReviewCardProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState(member.first_name);
  const [lastName, setLastName] = useState(member.last_name);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone);
  const [graduationYear, setGraduationYear] = useState(String(member.graduation_year));
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    member.dietary_restrictions ?? "",
  );
  const [medicalConditions, setMedicalConditions] = useState(
    member.medical_conditions ?? "",
  );
  const [shirtSize, setShirtSize] = useState(member.shirt_size ?? "");
  const [pantsSize, setPantsSize] = useState(member.pants_size ?? "");
  const [drinksAlcohol, setDrinksAlcohol] = useState(
    member.drinks_alcohol ? "yes" : "no",
  );
  const [emergencyContactName, setEmergencyContactName] = useState(
    member.emergency_contact_name ?? "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    member.emergency_contact_phone ?? "",
  );
  const [roles, setRoles] = useState<MemberRole[]>(
    member.roles.filter((role): role is MemberRole =>
      ["dancer", "production", "exec"].includes(role),
    ),
  );
  const [execTitle, setExecTitle] = useState<ExecTitle | "">(
    (member.exec_title as ExecTitle | null) ?? "",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const hasExecRole = roles.includes("exec");
  const submittedAt = new Date(member.created_at).toLocaleString();

  function toggleRole(role: MemberRole) {
    setRoles((current) => {
      if (current.includes(role)) {
        const next = current.filter((item) => item !== role);
        if (role === "exec") {
          setExecTitle("");
        }
        return next;
      }
      return [...current, role];
    });
  }

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = "First name is required.";
    if (!lastName.trim()) errors.lastName = "Last name is required.";
    if (!email.trim()) errors.email = "Email is required.";
    if (!phone.trim()) {
      errors.phone = "Phone is required.";
    } else if (!isValidPhone(phone)) {
      errors.phone = "Enter a valid 10-digit phone number.";
    }
    if (!graduationYear.trim()) errors.graduationYear = "Graduation year is required.";
    if (!shirtSize) errors.shirtSize = "Shirt size is required.";
    if (!pantsSize) errors.pantsSize = "Pants size is required.";
    if (!emergencyContactName.trim()) {
      errors.emergencyContactName = "Emergency contact name is required.";
    }
    if (!emergencyContactPhone.trim()) {
      errors.emergencyContactPhone = "Emergency contact phone is required.";
    } else if (!isValidPhone(emergencyContactPhone)) {
      errors.emergencyContactPhone = "Enter a valid 10-digit phone number.";
    }
    if (roles.length === 0) errors.roles = "Select at least one role.";
    if (hasExecRole && !execTitle) {
      errors.execTitle = "Exec title is required when exec role is selected.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleConfirm() {
    if (!canWrite) {
      return;
    }

    setSaveError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("members")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: formatPhoneForStorage(phone),
        graduation_year: Number(graduationYear),
        dietary_restrictions: dietaryRestrictions.trim() || "None",
        medical_conditions: medicalConditions.trim() || "None",
        shirt_size: shirtSize,
        pants_size: pantsSize,
        drinks_alcohol: drinksAlcohol === "yes",
        emergency_contact_name: emergencyContactName.trim(),
        emergency_contact_phone: formatPhoneForStorage(emergencyContactPhone),
        roles,
        exec_title: hasExecRole ? execTitle : null,
        pending_review: false,
      })
      .eq("id", member.id);

    if (error) {
      setSaveError(toUserFacingMemberSaveError(error));
      setLoading(false);
      return;
    }

    const { error: membershipError } = await supabase.from("season_memberships").upsert(
      {
        member_id: member.id,
        season: activeSeason,
        status: "active",
        exec_title: hasExecRole ? normalizeMembershipExecTitle(execTitle) : null,
      },
      { onConflict: "member_id,season" },
    );

    setLoading(false);

    if (membershipError) {
      setSaveError(toUserFacingMemberSaveError(membershipError));
      return;
    }

    router.refresh();
  }

  async function handleReject() {
    if (!canWrite) {
      return;
    }

    const confirmed = window.confirm(
      `Reject this submission for ${member.email}? They will be able to submit onboarding again with the same email.`,
    );

    if (!confirmed) {
      return;
    }

    setSaveError(null);
    setRejecting(true);

    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setSaveError(body?.error ?? "Could not reject this submission.");
        setRejecting(false);
        return;
      }

      router.refresh();
    } catch {
      setSaveError("Could not reject this submission.");
      setRejecting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">
            {formatMemberName(member)}
          </h3>
          <p className="mt-1 text-sm text-zinc-600">{member.email}</p>
          <p className="mt-1 text-xs text-zinc-500">Submitted {submittedAt}</p>
        </div>
        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
          Pending review
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={`${member.id}-first-name`} className={labelClassName}>
            First name
          </label>
          <input
            id={`${member.id}-first-name`}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          />
          {fieldErrors.firstName ? (
            <p className="text-sm text-red-600">{fieldErrors.firstName}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor={`${member.id}-last-name`} className={labelClassName}>
            Last name
          </label>
          <input
            id={`${member.id}-last-name`}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          />
          {fieldErrors.lastName ? (
            <p className="text-sm text-red-600">{fieldErrors.lastName}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor={`${member.id}-email`} className={labelClassName}>
            Email
          </label>
          <input
            id={`${member.id}-email`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          />
          {fieldErrors.email ? (
            <p className="text-sm text-red-600">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor={`${member.id}-phone`} className={labelClassName}>
            Phone
          </label>
          <input
            id={`${member.id}-phone`}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          />
          {fieldErrors.phone ? (
            <p className="text-sm text-red-600">{fieldErrors.phone}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor={`${member.id}-graduation-year`} className={labelClassName}>
            Graduation year
          </label>
          <input
            id={`${member.id}-graduation-year`}
            type="number"
            value={graduationYear}
            onChange={(event) => setGraduationYear(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          />
          {fieldErrors.graduationYear ? (
            <p className="text-sm text-red-600">{fieldErrors.graduationYear}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <span className={labelClassName}>Do you drink?</span>
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name={`${member.id}-drinks`}
                checked={drinksAlcohol === "yes"}
                onChange={() => setDrinksAlcohol("yes")}
                disabled={!canWrite}
                className="h-4 w-4 text-[#990000]"
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name={`${member.id}-drinks`}
                checked={drinksAlcohol === "no"}
                onChange={() => setDrinksAlcohol("no")}
                disabled={!canWrite}
                className="h-4 w-4 text-[#990000]"
              />
              No
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor={`${member.id}-dietary`} className={labelClassName}>
            Dietary restrictions
          </label>
          <textarea
            id={`${member.id}-dietary`}
            rows={2}
            value={dietaryRestrictions}
            onChange={(event) => setDietaryRestrictions(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor={`${member.id}-medical`} className={labelClassName}>
            Medical conditions
          </label>
          <textarea
            id={`${member.id}-medical`}
            rows={2}
            value={medicalConditions}
            onChange={(event) => setMedicalConditions(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={`${member.id}-shirt`} className={labelClassName}>
            Shirt size
          </label>
          <select
            id={`${member.id}-shirt`}
            value={shirtSize}
            onChange={(event) => setShirtSize(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          >
            <option value="">Select size</option>
            {CLOTHING_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          {fieldErrors.shirtSize ? (
            <p className="text-sm text-red-600">{fieldErrors.shirtSize}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor={`${member.id}-pants`} className={labelClassName}>
            Pants size
          </label>
          <select
            id={`${member.id}-pants`}
            value={pantsSize}
            onChange={(event) => setPantsSize(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          >
            <option value="">Select size</option>
            {CLOTHING_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          {fieldErrors.pantsSize ? (
            <p className="text-sm text-red-600">{fieldErrors.pantsSize}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={`${member.id}-emergency-name`} className={labelClassName}>
            Emergency contact name
          </label>
          <input
            id={`${member.id}-emergency-name`}
            value={emergencyContactName}
            onChange={(event) => setEmergencyContactName(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          />
          {fieldErrors.emergencyContactName ? (
            <p className="text-sm text-red-600">{fieldErrors.emergencyContactName}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor={`${member.id}-emergency-phone`} className={labelClassName}>
            Emergency contact phone
          </label>
          <input
            id={`${member.id}-emergency-phone`}
            type="tel"
            value={emergencyContactPhone}
            onChange={(event) => setEmergencyContactPhone(event.target.value)}
            disabled={!canWrite}
            className={inputClassName}
          />
          {fieldErrors.emergencyContactPhone ? (
            <p className="text-sm text-red-600">{fieldErrors.emergencyContactPhone}</p>
          ) : null}
        </div>
      </div>

      <fieldset className="mt-5 space-y-3">
        <legend className={labelClassName}>Roles</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["dancer", "production", "exec"] as const).map((role) => (
            <label
              key={role}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-700"
            >
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={() => toggleRole(role)}
                disabled={!canWrite}
                className="h-4 w-4 rounded border-zinc-300 text-[#990000]"
              />
              <span className="capitalize">{role}</span>
            </label>
          ))}
        </div>
        {fieldErrors.roles ? (
          <p className="text-sm text-red-600">{fieldErrors.roles}</p>
        ) : null}
      </fieldset>

      {hasExecRole ? (
        <div className="mt-4 space-y-2">
          <label htmlFor={`${member.id}-exec-title`} className={labelClassName}>
            Exec title
          </label>
          <select
            id={`${member.id}-exec-title`}
            value={execTitle}
            onChange={(event) => setExecTitle(event.target.value as ExecTitle | "")}
            disabled={!canWrite}
            className={inputClassName}
          >
            <option value="">Select exec title</option>
            {EXEC_TITLES.map((title) => (
              <option key={title.value} value={title.value}>
                {title.label}
              </option>
            ))}
          </select>
          {fieldErrors.execTitle ? (
            <p className="text-sm text-red-600">{fieldErrors.execTitle}</p>
          ) : null}
        </div>
      ) : null}

      <dl className="mt-6 grid gap-4 border-t border-zinc-200 pt-5 sm:grid-cols-2">
        <DocumentLink label="Government ID" path={member.government_id_path} />
        <DocumentLink label="Birthday story photo" path={member.birthday_image_path} />
        <DocumentLink label="Student ID" path={member.student_id_path} />
        <DocumentLink label="COVID vaccination card" path={member.covid_vaccination_path} />
        <DetailItem
          label="Submitted roles"
          value={member.roles.map((role) => role.charAt(0).toUpperCase() + role.slice(1)).join(", ")}
        />
      </dl>

      {saveError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}

      {canWrite ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || rejecting}
            className="rounded-lg bg-[#990000] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Confirming..." : "Confirm member"}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={loading || rejecting}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rejecting ? "Rejecting..." : "Reject submission"}
          </button>
        </div>
      ) : (
        <p className="mt-5 text-sm text-zinc-500">
          You have read-only access. Only Captain and Team Manager can confirm members.
        </p>
      )}
    </article>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  EXEC_TITLES,
  MEMBER_ROLES,
  MEMBER_STATUSES,
  type ExecTitle,
  type MemberRole,
  type MemberStatus,
  isValidEmail,
} from "@/lib/members";
import { normalizeMembershipExecTitle } from "@/lib/season-memberships";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const requiredMark = <span className="text-[#990000]">*</span>;

type MemberCreateFormProps = {
  activeSeason: string;
};

export default function MemberCreateForm({ activeSeason }: MemberCreateFormProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [status, setStatus] = useState<MemberStatus>("active");
  const [roles, setRoles] = useState<MemberRole[]>([]);
  const [execTitle, setExecTitle] = useState<ExecTitle | "">("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasExecRole = roles.includes("exec");

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

    if (!phone.trim()) {
      errors.phone = "Phone is required.";
    }

    if (!graduationYear.trim()) {
      errors.graduationYear = "Graduation year is required.";
    } else if (
      Number.isNaN(Number(graduationYear)) ||
      Number(graduationYear) < 2000 ||
      Number(graduationYear) > 2100
    ) {
      errors.graduationYear = "Enter a valid graduation year.";
    }

    if (!status) {
      errors.status = "Status is required.";
    }

    if (roles.length === 0) {
      errors.roles = "Select at least one role.";
    }

    if (hasExecRole && !execTitle) {
      errors.execTitle = "Select an exec title.";
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
    const { data: createdMember, error } = await supabase
      .from("members")
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        graduation_year: Number(graduationYear),
        status,
        roles,
        exec_title: hasExecRole ? execTitle : null,
      })
      .select("id")
      .single();

    if (error || !createdMember) {
      setLoading(false);
      if (error?.code === "23505") {
        setSaveError("A member with this email already exists.");
      } else {
        setSaveError(error?.message ?? "Could not create member.");
      }
      return;
    }

    const { error: membershipError } = await supabase.from("season_memberships").insert({
      member_id: createdMember.id,
      season: activeSeason,
      status,
      exec_title: hasExecRole
        ? normalizeMembershipExecTitle(execTitle)
        : null,
    });

    setLoading(false);

    if (membershipError) {
      setSaveError(membershipError.message);
      return;
    }

    router.push("/members?created=1");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-zinc-700"
          >
            First name {requiredMark}
          </label>
          <input
            id="firstName"
            type="text"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={inputClassName}
            placeholder="Priya"
          />
          {fieldErrors.firstName && (
            <p className="text-sm text-red-600">{fieldErrors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-zinc-700"
          >
            Last name {requiredMark}
          </label>
          <input
            id="lastName"
            type="text"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className={inputClassName}
            placeholder="Sharma"
          />
          {fieldErrors.lastName && (
            <p className="text-sm text-red-600">{fieldErrors.lastName}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
            Email {requiredMark}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClassName}
            placeholder="name@iu.edu"
          />
          {fieldErrors.email && (
            <p className="text-sm text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">
            Phone {requiredMark}
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClassName}
            placeholder="317-555-0100"
          />
          {fieldErrors.phone && (
            <p className="text-sm text-red-600">{fieldErrors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="graduationYear"
            className="block text-sm font-medium text-zinc-700"
          >
            Graduation year {requiredMark}
          </label>
          <input
            id="graduationYear"
            type="number"
            required
            min={2000}
            max={2100}
            value={graduationYear}
            onChange={(event) => setGraduationYear(event.target.value)}
            className={inputClassName}
            placeholder="2027"
          />
          {fieldErrors.graduationYear && (
            <p className="text-sm text-red-600">{fieldErrors.graduationYear}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="block text-sm font-medium text-zinc-700">
            Status {requiredMark}
          </label>
          <select
            id="status"
            required
            value={status}
            onChange={(event) => setStatus(event.target.value as MemberStatus)}
            className={inputClassName}
          >
            {MEMBER_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
          {fieldErrors.status && (
            <p className="text-sm text-red-600">{fieldErrors.status}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="block text-sm font-medium text-zinc-700">
          Roles {requiredMark}
        </p>
        <div className="flex flex-wrap gap-4">
          {MEMBER_ROLES.map((role) => (
            <label
              key={role}
              className="flex items-center gap-2 text-sm text-zinc-700"
            >
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={() => toggleRole(role)}
                className="h-4 w-4 rounded border-zinc-300 text-[#990000] focus:ring-[#990000]"
              />
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </label>
          ))}
        </div>
        {fieldErrors.roles && (
          <p className="text-sm text-red-600">{fieldErrors.roles}</p>
        )}
      </div>

      {hasExecRole && (
        <div className="space-y-2">
          <label htmlFor="execTitle" className="block text-sm font-medium text-zinc-700">
            Exec title {requiredMark}
          </label>
          <select
            id="execTitle"
            required
            value={execTitle}
            onChange={(event) =>
              setExecTitle(event.target.value as ExecTitle | "")
            }
            className={inputClassName}
          >
            <option value="">Select a title</option>
            {EXEC_TITLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.execTitle && (
            <p className="text-sm text-red-600">{fieldErrors.execTitle}</p>
          )}
        </div>
      )}

      {saveError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {saveError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#990000] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Create member"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/members")}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

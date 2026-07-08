"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidEmail } from "@/lib/members";
import { isValidIuEmail } from "@/lib/onboarding";
import { normalizeMembershipExecTitle } from "@/lib/season-memberships";
import { hasAppAccess } from "@/lib/user-access";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const requiredMark = <span className="text-[#990000]">*</span>;

type FormView = "form" | "success";

export default function UserSignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<FormView>("form");
  const [canSignInNow, setCanSignInNow] = useState(false);

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required.";
    }

    if (!email.trim()) {
      errors.email = "IU email is required.";
    } else if (!isValidEmail(email.trim())) {
      errors.email = "Enter a valid email address.";
    } else if (!isValidIuEmail(email)) {
      errors.email = "Use your @iu.edu email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
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

    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      if (signUpError.message.toLowerCase().includes("already registered")) {
        setSaveError("An account with this email already exists.");
      } else {
        setSaveError(signUpError.message);
      }
      return;
    }

    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("label")
      .eq("is_active", true)
      .maybeSingle();

    const { data: existingMember } = await supabase
      .from("members")
      .select("id, roles")
      .eq("email", normalizedEmail)
      .maybeSingle();

    let execTitle: string | null = null;

    if (existingMember && activeSeason?.label) {
      const { data: membership } = await supabase
        .from("season_memberships")
        .select("exec_title")
        .eq("member_id", existingMember.id)
        .eq("season", activeSeason.label)
        .maybeSingle();

      execTitle = membership?.exec_title ?? null;
    }

    await supabase.auth.signOut();

    const hasExecAccess = hasAppAccess(
      existingMember
        ? {
            id: existingMember.id,
            roles: Array.isArray(existingMember.roles) ? existingMember.roles : [],
            exec_title: normalizeMembershipExecTitle(execTitle),
          }
        : null,
    );

    setCanSignInNow(hasExecAccess);
    setView("success");
    setLoading(false);
  }

  if (view === "success") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-semibold text-zinc-900">Account created</p>
        <p className="text-sm text-zinc-600">
          {canSignInNow
            ? "Your account is ready. You can sign in now."
            : "A Captain or Team Manager will assign your access before you can sign in."}
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700">
          Full name {requiredMark}
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className={inputClassName}
          placeholder="Jane Doe"
        />
        {fieldErrors.fullName ? (
          <p className="text-sm text-red-600">{fieldErrors.fullName}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          IU email {requiredMark}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
          placeholder="you@iu.edu"
        />
        {fieldErrors.email ? (
          <p className="text-sm text-red-600">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
          Password {requiredMark}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
          placeholder="At least 8 characters"
        />
        {fieldErrors.password ? (
          <p className="text-sm text-red-600">{fieldErrors.password}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-zinc-700"
        >
          Confirm password {requiredMark}
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClassName}
        />
        {fieldErrors.confirmPassword ? (
          <p className="text-sm text-red-600">{fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      {saveError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {saveError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#990000] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

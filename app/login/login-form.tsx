"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasAppAccess } from "@/lib/user-access";
import { normalizeMembershipExecTitle } from "@/lib/season-memberships";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const { data: activeSeason, error: activeSeasonError } = await supabase
      .from("seasons")
      .select("label")
      .eq("is_active", true)
      .maybeSingle();

    if (activeSeasonError) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Could not verify your access. Please try again.");
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, roles")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (memberError) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Could not verify your access. Please try again.");
      return;
    }

    let execTitle: string | null = null;

    if (member && activeSeason?.label) {
      const { data: membership, error: membershipError } = await supabase
        .from("season_memberships")
        .select("exec_title")
        .eq("member_id", member.id)
        .eq("season", activeSeason.label)
        .maybeSingle();

      if (membershipError) {
        await supabase.auth.signOut();
        setLoading(false);
        setError("Could not verify your access. Please try again.");
        return;
      }

      execTitle = membership?.exec_title ?? null;
    }

    const userMember = member
      ? {
          id: member.id,
          roles: Array.isArray(member.roles) ? member.roles : [],
          exec_title: normalizeMembershipExecTitle(execTitle),
        }
      : null;

    if (!hasAppAccess(userMember)) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        "Your account is waiting for access. A Captain or Team Manager must assign your role before you can sign in.",
      );
      return;
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
          placeholder="you@iu.edu"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-700"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
          placeholder="Enter your password"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#990000] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

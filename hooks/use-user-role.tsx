"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExecTitle } from "@/lib/members";
import { normalizeMembershipExecTitle } from "@/lib/season-memberships";

type UserRoleState = {
  roles: string[];
  execTitle: ExecTitle | null;
  loading: boolean;
  error: string | null;
};

const UserRoleContext = createContext<UserRoleState | null>(null);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<string[]>([]);
  const [execTitle, setExecTitle] = useState<ExecTitle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUserRole() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      const { data: activeSeason, error: activeSeasonError } = await supabase
        .from("seasons")
        .select("label")
        .eq("is_active", true)
        .maybeSingle();

      if (activeSeasonError) {
        setError(activeSeasonError.message);
        setLoading(false);
        return;
      }

      const { data: member, error: fetchError } = await supabase
        .from("members")
        .select("id, roles")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      let execTitle: ExecTitle | null = null;

      if (member && activeSeason?.label) {
        const { data: membership, error: membershipError } = await supabase
          .from("season_memberships")
          .select("exec_title")
          .eq("member_id", member.id)
          .eq("season", activeSeason.label)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (membershipError) {
          setError(membershipError.message);
          setLoading(false);
          return;
        }

        execTitle = (membership?.exec_title as ExecTitle | null) ?? null;
      }

      setRoles(Array.isArray(member?.roles) ? member.roles : []);
      setExecTitle(normalizeMembershipExecTitle(execTitle));
      setLoading(false);
    }

    fetchUserRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <UserRoleContext.Provider value={{ roles, execTitle, loading, error }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);

  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }

  return context;
}

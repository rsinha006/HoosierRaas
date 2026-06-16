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

      const { data, error: fetchError } = await supabase
        .from("members")
        .select("roles, exec_title")
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

      setRoles(Array.isArray(data?.roles) ? data.roles : []);
      setExecTitle((data?.exec_title as ExecTitle | null) ?? null);
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

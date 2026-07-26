"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ExecTitle } from "@/lib/members";

type UserRoleState = {
  roles: string[];
  execTitle: ExecTitle | null;
};

const UserRoleContext = createContext<UserRoleState | null>(null);

type UserRoleProviderProps = {
  roles: string[];
  execTitle: ExecTitle | null;
  children: ReactNode;
};

/**
 * The role used to be fetched from the browser on mount, which cost four
 * sequential Supabase round trips (auth, seasons, members, season_memberships)
 * on every page - and re-derived exactly what the server already resolved in
 * getUserMember(). It is now handed down from the layout, so the role is
 * present in the first paint and stays correct across router.refresh().
 */
export function UserRoleProvider({
  roles,
  execTitle,
  children,
}: UserRoleProviderProps) {
  const value = useMemo<UserRoleState>(
    () => ({ roles, execTitle }),
    [roles, execTitle],
  );

  return (
    <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);

  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }

  return context;
}

import { cache } from "react";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import type { ExecTitle } from "@/lib/members";
import { getActiveSeasonMembershipExecTitle } from "@/lib/season-memberships";
import { getActiveSeason } from "@/lib/seasons";

export type UserMember = {
  id: string;
  roles: string[];
  exec_title: ExecTitle | null;
};

export const getUserMember = cache(async (): Promise<UserMember | null> => {
  const user = await getAuthUser();

  if (!user?.email) {
    return null;
  }

  const supabase = await createClient();

  // The season lookup does not depend on the member row, so both go out at once
  // rather than stacking two round trips.
  const [{ label: activeSeason }, { data, error }] = await Promise.all([
    getActiveSeason(),
    supabase
      .from("members")
      .select("id, roles")
      .eq("email", user.email.toLowerCase())
      .maybeSingle(),
  ]);

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const exec_title = await getActiveSeasonMembershipExecTitle(
    supabase,
    data.id,
    activeSeason,
  );

  return {
    id: data.id,
    roles: Array.isArray(data.roles) ? data.roles : [],
    exec_title,
  };
});

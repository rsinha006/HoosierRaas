import { createClient } from "@/lib/supabase/server";
import type { ExecTitle } from "@/lib/members";
import { getActiveSeasonMembershipExecTitle } from "@/lib/season-memberships";
import { getActiveSeason } from "@/lib/seasons";

export type UserMember = {
  id: string;
  roles: string[];
  exec_title: ExecTitle | null;
};

export async function getUserMember(): Promise<UserMember | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const { label: activeSeason } = await getActiveSeason();

  const { data, error } = await supabase
    .from("members")
    .select("id, roles")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

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
}

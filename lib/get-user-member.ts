import { createClient } from "@/lib/supabase/server";
import type { ExecTitle } from "@/lib/members";

export type UserMember = {
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

  const { data } = await supabase
    .from("members")
    .select("roles, exec_title")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    roles: Array.isArray(data.roles) ? data.roles : [],
    exec_title: data.exec_title,
  };
}

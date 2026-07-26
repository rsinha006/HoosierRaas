import { cache } from "react";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  isExec: boolean;
};

export const getUserProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, roles")
    .eq("id", user.id)
    .maybeSingle();

  const metadata = user.metadata;
  const email = user.email ?? "";
  const fallbackName = email.split("@")[0] || "User";

  return {
    id: user.id,
    email,
    name:
      profile?.full_name ??
      (typeof metadata.full_name === "string" ? metadata.full_name : fallbackName),
    role:
      profile?.role ??
      (typeof metadata.role === "string" ? metadata.role : "Executive Board"),
    isExec: Array.isArray(profile?.roles) && profile.roles.includes("exec"),
  };
});

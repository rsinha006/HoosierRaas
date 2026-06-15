import { createClient } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  isExec: boolean;
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, roles")
    .eq("id", user.id)
    .maybeSingle();

  const metadata = user.user_metadata ?? {};
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
}

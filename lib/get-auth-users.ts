import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildMembersByEmail,
  buildProfilesById,
  buildUserRowsFromAuthUsers,
  syncMissingProfiles,
} from "@/lib/list-auth-users";
import { fetchExecTitleByMemberId } from "@/lib/season-memberships";
import { getActiveSeason } from "@/lib/seasons";
import type { UserRow } from "@/lib/users";

type ListAuthUsersResult =
  | { users: UserRow[]; error: null; warning: string | null }
  | { users: UserRow[]; error: string; warning: string | null };

export async function listAuthUsersForPage(): Promise<ListAuthUsersResult> {
  const supabase = await createClient();
  const { label: activeSeason } = await getActiveSeason();

  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("id, email, roles");

  if (membersError) {
    return { users: [], error: membersError.message, warning: null };
  }

  let execTitleByMemberId: Map<string, string | null>;
  try {
    execTitleByMemberId = await fetchExecTitleByMemberId(supabase, activeSeason);
  } catch (error) {
    return {
      users: [],
      error:
        error instanceof Error
          ? error.message
          : "Could not load season memberships.",
      warning: null,
    };
  }

  const membersByEmail = buildMembersByEmail(members ?? [], execTitleByMemberId);

  try {
    const admin = createAdminClient();

    const [{ data: authData, error: authError }, { data: profiles, error: profilesError }] =
      await Promise.all([
        admin.auth.admin.listUsers({ perPage: 1000 }),
        admin.from("profiles").select("id, email, full_name, created_at"),
      ]);

    if (authError) {
      return { users: [], error: authError.message, warning: null };
    }

    if (profilesError) {
      return { users: [], error: profilesError.message, warning: null };
    }

    const authUsers = authData.users ?? [];
    const profilesById = buildProfilesById(profiles ?? []);

    await syncMissingProfiles(admin, authUsers, profilesById);

    const users = buildUserRowsFromAuthUsers(authUsers, profilesById, membersByEmail);

    const missingProfileCount = authUsers.length - (profiles ?? []).length;
    const warning =
      missingProfileCount > 0
        ? `Synced ${missingProfileCount} missing profile record${missingProfileCount === 1 ? "" : "s"} from auth.`
        : null;

    return { users, error: null, warning };
  } catch {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      return {
        users: [],
        error: profilesError.message,
        warning:
          "Could not load full auth user list. Configure SUPABASE_SERVICE_ROLE_KEY to see every login account.",
      };
    }

    const { buildUserRows } = await import("@/lib/users");
    const users = buildUserRows(profiles ?? [], membersByEmail);

    return {
      users,
      error: null,
      warning:
        "Showing profiles only. Configure SUPABASE_SERVICE_ROLE_KEY to see every login account.",
    };
  }
}

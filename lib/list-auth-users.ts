import type { User } from "@supabase/supabase-js";
import type { ExecTitle } from "@/lib/members";
import type { UserRow } from "@/lib/users";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

type MemberRow = {
  id: string;
  email: string;
  roles: string[] | null;
};

function getMetadataFullName(user: User): string | null {
  const fullName = user.user_metadata?.full_name;
  return typeof fullName === "string" && fullName.trim() ? fullName.trim() : null;
}

export function buildUserRowsFromAuthUsers(
  authUsers: User[],
  profilesById: Map<string, ProfileRow>,
  membersByEmail: Map<string, { id: string; exec_title: string | null; roles: string[] }>,
): UserRow[] {
  return authUsers
    .map((user) => {
      const profile = profilesById.get(user.id);
      const email = (user.email ?? profile?.email ?? "").toLowerCase();

      if (!email) {
        return null;
      }

      const member = membersByEmail.get(email);
      const execTitle = (member?.exec_title as ExecTitle | null) ?? null;
      const hasAccess =
        !!execTitle && Array.isArray(member?.roles) && member.roles.includes("exec");

      return {
        id: user.id,
        email,
        full_name: profile?.full_name ?? getMetadataFullName(user),
        created_at: profile?.created_at ?? user.created_at,
        exec_title: execTitle,
        member_id: member?.id ?? null,
        on_roster: !!member,
        access_status: hasAccess ? ("active" as const) : ("pending" as const),
      };
    })
    .filter((row): row is UserRow => row !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function buildMembersByEmail(
  members: MemberRow[],
  execTitleByMemberId: Map<string, string | null>,
) {
  return new Map(
    members.map((member) => [
      member.email.toLowerCase(),
      {
        id: member.id,
        exec_title: execTitleByMemberId.get(member.id) ?? null,
        roles: Array.isArray(member.roles) ? member.roles : [],
      },
    ]),
  );
}

export function buildProfilesById(profiles: ProfileRow[]) {
  return new Map(profiles.map((profile) => [profile.id, profile]));
}

export async function syncMissingProfiles(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  authUsers: User[],
  profilesById: Map<string, ProfileRow>,
) {
  const missing = authUsers.filter((user) => !profilesById.has(user.id) && user.email);

  if (missing.length === 0) {
    return;
  }

  await admin.from("profiles").upsert(
    missing.map((user) => ({
      id: user.id,
      email: user.email!.toLowerCase(),
      full_name: getMetadataFullName(user),
      created_at: user.created_at,
    })),
    { onConflict: "id" },
  );
}

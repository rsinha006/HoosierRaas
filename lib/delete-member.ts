import { deleteLoginAccount } from "@/lib/delete-login-account";
import { ONBOARDING_STORAGE_BUCKET } from "@/lib/onboarding";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type MemberDocumentRow = {
  id: string;
  email: string;
  government_id_path: string | null;
  birthday_image_path: string | null;
  student_id_path: string | null;
  covid_vaccination_path: string | null;
};

function getMemberDocumentPaths(member: MemberDocumentRow): string[] {
  return [
    member.government_id_path,
    member.birthday_image_path,
    member.student_id_path,
    member.covid_vaccination_path,
  ].filter((path): path is string => Boolean(path));
}

export async function deleteMemberAccount(
  admin: AdminClient,
  memberId: string,
): Promise<{ error: string | null }> {
  const { data: member, error: memberError } = await admin
    .from("members")
    .select(
      "id, email, government_id_path, birthday_image_path, student_id_path, covid_vaccination_path",
    )
    .eq("id", memberId)
    .maybeSingle();

  if (memberError) {
    return { error: memberError.message };
  }

  if (!member) {
    return { error: "Member not found." };
  }

  const normalizedEmail = member.email.trim().toLowerCase();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profile?.id) {
    const { error: loginDeleteError } = await deleteLoginAccount(admin, profile.id);
    if (loginDeleteError) {
      return { error: loginDeleteError };
    }
  }

  const documentPaths = getMemberDocumentPaths(member);
  if (documentPaths.length > 0) {
    await admin.storage.from(ONBOARDING_STORAGE_BUCKET).remove(documentPaths);
  }

  const { error: deleteMemberError } = await admin.from("members").delete().eq("id", memberId);

  if (deleteMemberError) {
    return { error: deleteMemberError.message };
  }

  return { error: null };
}

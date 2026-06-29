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

  const documentPaths = getMemberDocumentPaths(member);
  if (documentPaths.length > 0) {
    const { error: storageError } = await admin.storage
      .from(ONBOARDING_STORAGE_BUCKET)
      .remove(documentPaths);

    if (storageError) {
      return { error: storageError.message };
    }
  }

  const { error: deleteMemberError } = await admin.rpc("admin_delete_member", {
    p_member_id: memberId,
  });

  if (deleteMemberError) {
    return { error: deleteMemberError.message };
  }

  return { error: null };
}

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function deleteLoginAccount(
  admin: AdminClient,
  userId: string,
): Promise<{ error: string | null }> {
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  const normalizedEmail = profile?.email?.trim().toLowerCase() ?? null;

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId, false);

  if (deleteAuthError && !isUserNotFoundError(deleteAuthError.message)) {
    return { error: deleteAuthError.message ?? "Could not delete this user." };
  }

  const { error: deleteProfileError } = await admin.from("profiles").delete().eq("id", userId);

  if (deleteProfileError) {
    return { error: deleteProfileError.message };
  }

  if (normalizedEmail) {
    await admin.from("profiles").delete().eq("email", normalizedEmail);
  }

  return { error: null };
}

function isUserNotFoundError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return normalized.includes("not found") || normalized.includes("user not found");
}

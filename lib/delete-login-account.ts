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

  await admin.from("profiles").delete().eq("id", userId);

  if (normalizedEmail) {
    await admin.from("profiles").delete().eq("email", normalizedEmail);
  }

  return { error: null };
}

export async function deleteLoginByEmail(
  admin: AdminClient,
  email: string,
): Promise<{ error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profile?.id) {
    return deleteLoginAccount(admin, profile.id);
  }

  const { data: authData, error: listUsersError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listUsersError) {
    return { error: listUsersError.message ?? "Could not look up login accounts." };
  }

  const authUser = (authData.users ?? []).find(
    (user) => user.email?.trim().toLowerCase() === normalizedEmail,
  );

  if (authUser) {
    return deleteLoginAccount(admin, authUser.id);
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

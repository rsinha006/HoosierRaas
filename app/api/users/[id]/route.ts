import { NextResponse } from "next/server";
import { deleteLoginAccount } from "@/lib/delete-login-account";
import { getUserMember } from "@/lib/get-user-member";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasWriteAccess } from "@/lib/rbac";
import { getUserProfile } from "@/lib/get-user-profile";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const [callerMember, currentUser] = await Promise.all([
    getUserMember(),
    getUserProfile(),
  ]);

  if (!hasWriteAccess(callerMember?.exec_title ?? null, "users")) {
    return NextResponse.json({ error: "You do not have permission to delete users." }, { status: 403 });
  }

  if (!currentUser) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  if (currentUser.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await deleteLoginAccount(admin, id);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "User deletion is not configured. Ask your admin to add SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }
}

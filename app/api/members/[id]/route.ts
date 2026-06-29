import { NextResponse } from "next/server";
import { deleteMemberAccount } from "@/lib/delete-member";
import { getUserMember } from "@/lib/get-user-member";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasWriteAccess } from "@/lib/rbac";
import { toUserFacingMemberDeleteError } from "@/lib/user-facing-errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const callerMember = await getUserMember();

  if (!hasWriteAccess(callerMember?.exec_title ?? null, "members")) {
    return NextResponse.json(
      { error: "You do not have permission to delete members." },
      { status: 403 },
    );
  }

  if (callerMember?.id === id) {
    return NextResponse.json({ error: "You cannot delete your own member record." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await deleteMemberAccount(admin, id);

    if (error) {
      console.error("Failed to delete member", { memberId: id, error });
      return NextResponse.json({ error: toUserFacingMemberDeleteError(error) }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error:
          "Member deletion is not configured. Ask your admin to add SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }
}

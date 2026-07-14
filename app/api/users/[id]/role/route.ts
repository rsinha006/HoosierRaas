import { NextResponse } from "next/server";
import { formatExecTitle } from "@/lib/members";
import { getUserMember } from "@/lib/get-user-member";
import { createClient } from "@/lib/supabase/server";
import { hasWriteAccess } from "@/lib/rbac";
import { getActiveSeason } from "@/lib/seasons";
import {
  isAssignableExecTitle,
  mergeExecRole,
  NONE_ROLE_VALUE,
  splitFullName,
} from "@/lib/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  const callerMember = await getUserMember();
  if (!hasWriteAccess(callerMember?.exec_title ?? null, "users")) {
    return NextResponse.json({ error: "You do not have permission to assign roles." }, { status: 403 });
  }

  let body: { exec_title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const execTitle = body.exec_title;
  const isRevoke = execTitle === NONE_ROLE_VALUE;
  if (!execTitle || (!isRevoke && !isAssignableExecTitle(execTitle))) {
    return NextResponse.json({ error: "A valid role is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { label: activeSeason } = await getActiveSeason();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const normalizedEmail = profile.email.toLowerCase();

  const { data: existingMember, error: existingError } = await supabase
    .from("members")
    .select("id, roles")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (isRevoke && !existingMember) {
    // Nothing to revoke — this profile never had a member record or access.
    return NextResponse.json({ success: true });
  }

  let memberId = existingMember?.id ?? null;

  if (existingMember) {
    if (!isRevoke) {
      const { error: updateError } = await supabase
        .from("members")
        .update({
          roles: mergeExecRole(Array.isArray(existingMember.roles) ? existingMember.roles : []),
          pending_review: false,
        })
        .eq("id", existingMember.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
  } else {
    const { firstName, lastName } = splitFullName(profile.full_name);

    const { data: insertedMember, error: insertError } = await supabase
      .from("members")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: normalizedEmail,
        phone: "-",
        graduation_year: new Date().getFullYear(),
        status: "active",
        roles: ["exec"],
        exec_title: null,
        pending_review: false,
      })
      .select("id")
      .single();

    if (insertError || !insertedMember) {
      return NextResponse.json(
        { error: insertError?.message ?? "Could not create member record." },
        { status: 500 },
      );
    }

    memberId = insertedMember.id;
  }

  if (!memberId) {
    return NextResponse.json({ error: "Could not resolve member record." }, { status: 500 });
  }

  const { data: existingMembership, error: membershipReadError } = await supabase
    .from("season_memberships")
    .select("status")
    .eq("member_id", memberId)
    .eq("season", activeSeason)
    .maybeSingle();

  if (membershipReadError) {
    return NextResponse.json({ error: membershipReadError.message }, { status: 500 });
  }

  const { error: membershipError } = await supabase.from("season_memberships").upsert(
    {
      member_id: memberId,
      season: activeSeason,
      status: existingMembership?.status ?? "active",
      exec_title: isRevoke ? null : execTitle,
    },
    { onConflict: "member_id,season" },
  );

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  const roleLabel = isRevoke ? "No access" : (formatExecTitle(execTitle) ?? "Executive Board");
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ role: roleLabel })
    .eq("id", id);

  if (profileUpdateError) {
    return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

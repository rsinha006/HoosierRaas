"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ArchiveSeasonPayload } from "@/lib/archive-season";
import {
  deleteMemberLoginsByEmail,
  resolveLoginDeletionEmails,
} from "@/lib/archive-season-server";
import { getUserMember } from "@/lib/get-user-member";
import { VIEWING_SEASON_COOKIE } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

export type ArchiveSeasonResult =
  | {
      ok: true;
      nextSeasonLabel: string;
      loginDeletionFailures: string[];
    }
  | { ok: false; error: string };

type ArchiveSeasonRpcResult = {
  next_season_label: string;
  archived_season_label: string;
  ending_balance: number;
};

export async function archiveSeason(
  payload: ArchiveSeasonPayload,
): Promise<ArchiveSeasonResult> {
  const caller = await getUserMember();

  if (
    caller?.exec_title !== "captain" &&
    caller?.exec_title !== "team_manager"
  ) {
    return { ok: false, error: "Only Captain and Team Manager can archive a season." };
  }

  if (!payload.members.length) {
    return { ok: false, error: "No member decisions were submitted." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_season", {
    p_active_season_label: payload.activeSeasonLabel,
    p_members: payload.members,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as ArchiveSeasonRpcResult;
  let loginDeletionFailures: string[] = [];

  try {
    const emailsToDelete = await resolveLoginDeletionEmails(
      supabase,
      payload.members,
    );
    loginDeletionFailures = await deleteMemberLoginsByEmail(emailsToDelete);
  } catch (deleteError) {
    loginDeletionFailures = [
      deleteError instanceof Error
        ? deleteError.message
        : "Could not delete one or more login accounts.",
    ];
  }

  const cookieStore = await cookies();
  cookieStore.delete(VIEWING_SEASON_COOKIE);

  revalidatePath("/dashboard");
  revalidatePath("/finance");
  revalidatePath("/members");
  revalidatePath("/users");

  return {
    ok: true,
    nextSeasonLabel: result.next_season_label,
    loginDeletionFailures,
  };
}

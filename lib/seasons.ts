import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Season = {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
};

export const VIEWING_SEASON_COOKIE = "viewing_season";

export async function getActiveSeason(): Promise<Season> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No active season configured.");
  }

  return data;
}

export async function getViewingSeason(
  seasonParam?: string | null,
): Promise<Season> {
  const cookieStore = await cookies();
  const cookieSeason = cookieStore.get(VIEWING_SEASON_COOKIE)?.value;
  const candidate = seasonParam ?? cookieSeason;

  if (candidate) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .eq("label", candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }
  }

  return getActiveSeason();
}

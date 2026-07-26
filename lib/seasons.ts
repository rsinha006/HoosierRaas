import { cookies } from "next/headers";
import { cache } from "react";
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

// Nearly every page resolves a season, often several times over through
// getUserMember and friends. cache() makes that one query per request.
export const getActiveSeason = cache(async (): Promise<Season> => {
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
});

// Keyed on the resolved label rather than on getViewingSeason's optional
// argument. cache() distinguishes getViewingSeason() from
// getViewingSeason(undefined), and the layout and page call it both ways - so
// the dedupe that matters has to happen on the query itself.
const getSeasonByLabel = cache(async (label: string): Promise<Season | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("label", label)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
});

export const getViewingSeason = cache(async (
  seasonParam?: string | null,
): Promise<Season> => {
  const cookieStore = await cookies();
  const cookieSeason = cookieStore.get(VIEWING_SEASON_COOKIE)?.value;
  const candidate = seasonParam ?? cookieSeason;

  if (candidate) {
    const season = await getSeasonByLabel(candidate);

    if (season) {
      return season;
    }
  }

  return getActiveSeason();
});

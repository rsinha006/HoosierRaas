import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { VIEWING_SEASON_COOKIE } from "@/lib/seasons";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const season = url.searchParams.get("season");
  const redirectTo = url.searchParams.get("redirect") ?? "/dashboard";

  if (!season) {
    const cookieStore = await cookies();
    cookieStore.delete(VIEWING_SEASON_COOKIE);
    return NextResponse.redirect(new URL(redirectTo, url.origin));
  }

  const cookieStore = await cookies();
  cookieStore.set(VIEWING_SEASON_COOKIE, season, {
    path: "/",
    sameSite: "lax",
  });

  const destination = new URL(redirectTo, url.origin);
  destination.searchParams.set("season", season);

  return NextResponse.redirect(destination);
}

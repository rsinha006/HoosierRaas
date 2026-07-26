import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveSafeRedirectPath } from "@/lib/safe-redirect";
import { VIEWING_SEASON_COOKIE } from "@/lib/seasons";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";

/**
 * Switches which season the app is being viewed as, then bounces back into the
 * app.
 *
 * Three things were wrong here. The `redirect` parameter was passed through
 * unchecked, so this endpoint would forward a browser to any site on the
 * internet from a link beginning with the real HROS address. It required no
 * session, so that link worked on anyone. And it wrote whatever `season` text
 * it was handed into a cookie that is then echoed back into the redirect URL.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const redirectTo = resolveSafeRedirectPath(
    url.searchParams.get("redirect"),
    origin,
  );

  // Only a signed-in user has a season to view. Requiring a session also means
  // the phishing shape this used to enable - a link on the HROS domain that
  // anyone could send to anyone - no longer resolves for a logged-out target.
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const cookieStore = await cookies();
  const season = url.searchParams.get("season");

  const clearViewingSeason = () => {
    cookieStore.delete(VIEWING_SEASON_COOKIE);
    return NextResponse.redirect(new URL(redirectTo, origin));
  };

  if (!season) {
    return clearViewingSeason();
  }

  // Store a label only after confirming it names a real season, so the cookie
  // cannot be loaded with arbitrary text that later lands back in a URL.
  const supabase = await createClient();
  const { data: matchedSeason } = await supabase
    .from("seasons")
    .select("label")
    .eq("label", season)
    .maybeSingle();

  if (!matchedSeason) {
    return clearViewingSeason();
  }

  cookieStore.set(VIEWING_SEASON_COOKIE, matchedSeason.label, {
    path: "/",
    sameSite: "lax",
    // Nothing on the client reads this, so keep it away from scripts, and off
    // plaintext connections wherever it is actually deployed.
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  const destination = new URL(redirectTo, origin);
  destination.searchParams.set("season", matchedSeason.label);

  return NextResponse.redirect(destination);
}

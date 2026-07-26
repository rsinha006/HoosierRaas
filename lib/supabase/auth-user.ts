import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string | null;
  metadata: Record<string, unknown>;
};

/**
 * Resolves the signed-in user from the access token's claims.
 *
 * This deliberately uses getClaims() rather than getUser(). The project signs
 * JWTs with an asymmetric key (ES256), so getClaims() verifies the token
 * locally with WebCrypto against a cached JWKS - no network round trip. That
 * matters a lot here: getUser() calls the Auth server every time, and this
 * runs at least twice per render (layout plus page).
 *
 * cache() collapses the repeats within a single request, so the whole render
 * pass resolves the user once.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return null;
  }

  const claims = data.claims;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    metadata:
      claims.user_metadata && typeof claims.user_metadata === "object"
        ? (claims.user_metadata as Record<string, unknown>)
        : {},
  };
});

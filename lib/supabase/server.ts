import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const CONFIG_ERROR =
  "Supabase is not configured. In Vercel, set NEXT_PUBLIC_SUPABASE_URL to your Project URL (https://YOUR-PROJECT.supabase.co) and NEXT_PUBLIC_SUPABASE_ANON_KEY to your publishable or anon key.";

// cache() keeps this to one client - and one JWKS cache - per request, instead
// of rebuilding it for every helper that needs to query.
export const createClient = cache(async () => {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(CONFIG_ERROR);
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll is called from Server Components where cookies cannot be set.
          // Proxy handles session refresh instead.
        }
      },
    },
  });
});

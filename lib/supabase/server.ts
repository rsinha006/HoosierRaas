import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const CONFIG_ERROR =
  "Supabase is not configured. In Vercel, set NEXT_PUBLIC_SUPABASE_URL to your Project URL (https://YOUR-PROJECT.supabase.co) and NEXT_PUBLIC_SUPABASE_ANON_KEY to your publishable or anon key.";

export async function createClient() {
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
}

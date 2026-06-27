export function getSupabasePublicEnv(): {
  url: string;
  key: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  if (!url || !key) {
    return null;
  }

  if (!isValidSupabaseProjectUrl(url)) {
    return null;
  }

  return { url, key };
}

function isValidSupabaseProjectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}

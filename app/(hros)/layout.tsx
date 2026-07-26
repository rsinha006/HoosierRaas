import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { getUserProfile } from "@/lib/get-user-profile";
import { getUserMember } from "@/lib/get-user-member";
import { getViewingSeason } from "@/lib/seasons";
import { hasAppAccess } from "@/lib/user-access";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // None of these three depend on each other, so they all go out at once
  // instead of stacking three waves of Supabase round trips before anything
  // renders. The season is awaited last so the auth redirects still take
  // precedence over the error it throws when there is no readable season.
  const userPromise = getUserProfile();
  const memberPromise = getUserMember();
  const viewingSeasonPromise = getViewingSeason();
  viewingSeasonPromise.catch(() => {});

  const [user, member] = await Promise.all([userPromise, memberPromise]);

  if (!user) {
    redirect("/login");
  }

  if (!hasAppAccess(member)) {
    redirect("/pending-access");
  }

  const viewingSeason = await viewingSeasonPromise;
  const archivedSeasonLabel = viewingSeason.is_active ? null : viewingSeason.label;

  return (
    <AppShell user={user} member={member} archivedSeasonLabel={archivedSeasonLabel}>
      {children}
    </AppShell>
  );
}

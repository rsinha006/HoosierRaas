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
  const user = await getUserProfile();

  if (!user) {
    redirect("/login");
  }

  const member = await getUserMember();

  if (!hasAppAccess(member)) {
    redirect("/pending-access");
  }

  const viewingSeason = await getViewingSeason();
  const archivedSeasonLabel = viewingSeason.is_active ? null : viewingSeason.label;

  return (
    <AppShell user={user} archivedSeasonLabel={archivedSeasonLabel}>
      {children}
    </AppShell>
  );
}

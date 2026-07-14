import AppSidebar from "@/components/app-sidebar";
import ViewingSeasonBanner from "@/components/viewing-season-banner";
import { UserRoleProvider } from "@/hooks/use-user-role";
import type { UserProfile } from "@/lib/get-user-profile";

type AppShellProps = {
  user: UserProfile;
  archivedSeasonLabel?: string | null;
  children: React.ReactNode;
};

export default function AppShell({ user, archivedSeasonLabel, children }: AppShellProps) {
  return (
    <UserRoleProvider>
      <div className="min-h-screen bg-zinc-50">
        <div className="flex min-h-screen">
          <AppSidebar user={user} />
          <div className="flex min-w-0 flex-1 flex-col">
            {archivedSeasonLabel ? (
              <ViewingSeasonBanner label={archivedSeasonLabel} />
            ) : null}
            <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </UserRoleProvider>
  );
}

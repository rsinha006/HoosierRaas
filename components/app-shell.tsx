import AppSidebar from "@/components/app-sidebar";
import ViewingSeasonBanner from "@/components/viewing-season-banner";
import { UserRoleProvider } from "@/hooks/use-user-role";
import type { UserMember } from "@/lib/get-user-member";
import type { UserProfile } from "@/lib/get-user-profile";

type AppShellProps = {
  user: UserProfile;
  member: UserMember | null;
  archivedSeasonLabel?: string | null;
  children: React.ReactNode;
};

export default function AppShell({
  user,
  member,
  archivedSeasonLabel,
  children,
}: AppShellProps) {
  return (
    <UserRoleProvider
      roles={member?.roles ?? []}
      execTitle={member?.exec_title ?? null}
    >
      <div className="min-h-screen bg-zinc-50">
        <div className="flex min-h-screen flex-col lg:flex-row">
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

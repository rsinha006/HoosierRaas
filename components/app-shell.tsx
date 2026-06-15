import AppSidebar from "@/components/app-sidebar";
import type { UserProfile } from "@/lib/get-user-profile";

type AppShellProps = {
  user: UserProfile;
  children: React.ReactNode;
};

export default function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex min-h-screen">
        <AppSidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

import UsersTable from "@/components/users-table";
import UsersLiveRefresh from "@/components/users-live-refresh";
import UserSignupLinkGenerator from "@/components/user-signup-link-generator";
import { listAuthUsersForPage } from "@/lib/get-auth-users";
import { getUserMember } from "@/lib/get-user-member";
import { getUserProfile } from "@/lib/get-user-profile";
import { hasWriteAccess } from "@/lib/rbac";

export default async function UsersPage() {
  const [userMember, currentUser, { users, error, warning }] = await Promise.all([
    getUserMember(),
    getUserProfile(),
    listAuthUsersForPage(),
  ]);

  const canManageUsers = hasWriteAccess(userMember?.exec_title ?? null, "users");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Users</h1>
            <p className="mt-2 text-zinc-600">Login accounts and access permissions</p>
          </div>
          {canManageUsers ? <UserSignupLinkGenerator /> : null}
        </div>
      </div>

      {warning ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-amber-900"
        >
          <p className="text-sm">{warning}</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load users</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : (
        <UsersLiveRefresh>
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <UsersTable
              users={users}
              canManage={canManageUsers}
              currentUserId={currentUser?.id ?? ""}
            />
          </div>
        </UsersLiveRefresh>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { formatExecTitle } from "@/lib/members";
import type { UserRow } from "@/lib/users";
import UserDeleteButton from "@/components/user-delete-button";
import UserRoleAssign from "@/components/user-role-assign";

type UsersTableProps = {
  users: UserRow[];
  canManage: boolean;
  currentUserId: string;
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UsersTable({ users, canManage, currentUserId }: UsersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const name = (user.full_name ?? "").toLowerCase();
      const email = user.email.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [users, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="min-w-0 sm:max-w-sm">
        <label htmlFor="user-search" className="mb-1.5 block text-sm font-medium text-zinc-700">
          Search by name or email
        </label>
        <input
          id="user-search"
          type="search"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className={inputClassName}
        />
      </div>

      <p className="text-sm text-zinc-600">
        Showing {filteredUsers.length} user
        {filteredUsers.length === 1 ? "" : "s"}
      </p>

      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-zinc-500">
          No users yet. Share the signup link to invite new exec members.
        </p>
      ) : filteredUsers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-zinc-500">
          No users match your search.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 font-medium text-zinc-700">Name</th>
                <th className="px-4 py-3 font-medium text-zinc-700">Email</th>
                <th className="px-4 py-3 font-medium text-zinc-700">Role</th>
                <th className="px-4 py-3 font-medium text-zinc-700">Status</th>
                <th className="px-4 py-3 font-medium text-zinc-700">Created</th>
                {canManage ? (
                  <th className="px-4 py-3 font-medium text-zinc-700">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">
                      {user.full_name?.trim() || "—"}
                    </div>
                    {user.on_roster ? (
                      <span className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        On roster
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{user.email}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatExecTitle(user.exec_title) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.access_status === "active"
                          ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      }`}
                    >
                      {user.access_status === "active" ? "Active" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{formatDate(user.created_at)}</td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-3">
                        <UserRoleAssign
                          userId={user.id}
                          currentExecTitle={user.exec_title}
                        />
                        <UserDeleteButton
                          userId={user.id}
                          email={user.email}
                          currentUserId={currentUserId}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

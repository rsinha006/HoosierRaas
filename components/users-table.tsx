"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatExecTitle } from "@/lib/members";
import { createClient } from "@/lib/supabase/client";
import { buildUserRowFromProfile, type UserRow } from "@/lib/users";
import UserDeleteButton from "@/components/user-delete-button";
import UserRoleAssign from "@/components/user-role-assign";

type UsersTableProps = {
  users: UserRow[];
  canManage: boolean;
  currentUserId: string;
};

type ProfileInsertRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

const HIGHLIGHT_DURATION_MS = 8_000;

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sortUsersByCreatedAt(users: UserRow[]) {
  return [...users].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

/** router.refresh() (from the 10s polling wrapper) gives us a brand new array
 *  reference every time even when nothing changed, which would otherwise cause
 *  the whole table to visibly flicker every poll. Only replace state when the
 *  actual displayed data differs. */
function haveUsersChanged(previous: UserRow[], next: UserRow[]) {
  if (previous.length !== next.length) {
    return true;
  }

  const previousById = new Map(previous.map((user) => [user.id, user]));

  return next.some((user) => {
    const match = previousById.get(user.id);
    if (!match) {
      return true;
    }

    return (
      match.full_name !== user.full_name ||
      match.email !== user.email ||
      match.exec_title !== user.exec_title ||
      match.on_roster !== user.on_roster ||
      match.access_status !== user.access_status
    );
  });
}

function isProfileInsertRow(value: unknown): value is ProfileInsertRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as ProfileInsertRow;
  return (
    typeof row.id === "string" &&
    typeof row.created_at === "string" &&
    (typeof row.email === "string" || row.email === null) &&
    (typeof row.full_name === "string" || row.full_name === null)
  );
}

export default function UsersTable({
  users: initialUsers,
  canManage,
  currentUserId,
}: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [highlightedUserIds, setHighlightedUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const highlightTimeoutsRef = useRef<Map<string, number>>(new Map());
  const knownUserIdsRef = useRef(new Set(initialUsers.map((user) => user.id)));

  function highlightUser(userId: string) {
    setHighlightedUserIds((current) => {
      const next = new Set(current);
      next.add(userId);
      return next;
    });

    const existingTimeout = highlightTimeoutsRef.current.get(userId);
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedUserIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
      highlightTimeoutsRef.current.delete(userId);
    }, HIGHLIGHT_DURATION_MS);

    highlightTimeoutsRef.current.set(userId, timeoutId);
  }

  const handleRealtimeProfileInsert = useCallback(
    (profile: ProfileInsertRow) => {
      if (!profile.email) {
        return;
      }

      const newUser = buildUserRowFromProfile({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
      });

      setUsers((current) => {
        if (current.some((user) => user.id === newUser.id)) {
          return current;
        }

        knownUserIdsRef.current.add(newUser.id);
        return sortUsersByCreatedAt([newUser, ...current]);
      });

      highlightUser(newUser.id);
    },
    [],
  );

  useEffect(() => {
    const newUserIds = initialUsers
      .map((user) => user.id)
      .filter((userId) => !knownUserIdsRef.current.has(userId));

    for (const userId of newUserIds) {
      highlightUser(userId);
    }

    knownUserIdsRef.current = new Set(initialUsers.map((user) => user.id));

    setUsers((current) =>
      haveUsersChanged(current, initialUsers) ? initialUsers : current,
    );
  }, [initialUsers]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("users-page-profiles")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          if (!isProfileInsertRow(payload.new)) {
            return;
          }

          handleRealtimeProfileInsert(payload.new);
        },
      )
      .subscribe();

    return () => {
      for (const timeoutId of highlightTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      highlightTimeoutsRef.current.clear();
      void supabase.removeChannel(channel);
    };
  }, [handleRealtimeProfileInsert]);

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
              {filteredUsers.map((user) => {
                const isHighlighted = highlightedUserIds.has(user.id);

                return (
                  <tr
                    key={user.id}
                    className={`align-top transition-colors duration-700 ${
                      isHighlighted
                        ? "bg-amber-50 ring-2 ring-inset ring-amber-300"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-zinc-900">
                          {user.full_name?.trim() || "—"}
                        </div>
                        {isHighlighted ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                            New
                          </span>
                        ) : null}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

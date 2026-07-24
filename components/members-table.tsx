"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Member, MemberRole, MemberStatus } from "@/lib/members";
import { formatExecTitle, formatMemberName, formatRole } from "@/lib/members";
import MemberDeleteButton from "@/components/member-delete-button";
import MemberExportDialog from "@/components/member-export-dialog";

type MembersTableProps = {
  members: Member[];
  canDelete: boolean;
  canExport: boolean;
  currentMemberId: string;
};

type StatusFilter = "all" | MemberStatus;
type RoleFilter = "all" | MemberRole;

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

export default function MembersTable({
  members,
  canDelete,
  canExport,
  currentMemberId,
}: MembersTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return members.filter((member) => {
      if (statusFilter !== "all" && member.status !== statusFilter) {
        return false;
      }

      if (roleFilter !== "all" && !member.roles.includes(roleFilter)) {
        return false;
      }

      if (query) {
        const name = formatMemberName(member).toLowerCase();
        if (!name.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [members, searchQuery, statusFilter, roleFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "active" || roleFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="member-search" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Search by name
          </label>
          <input
            id="member-search"
            type="search"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="w-full sm:w-40">
          <label htmlFor="status-filter" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className={inputClassName}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="alumni">Alumni</option>
          </select>
        </div>

        <div className="w-full sm:w-40">
          <label htmlFor="role-filter" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Role
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            className={inputClassName}
          >
            <option value="all">All</option>
            <option value="dancer">Dancer</option>
            <option value="exec">Exec</option>
            <option value="production">Production</option>
          </select>
        </div>

        {canExport ? (
          <div className="w-full sm:ml-auto sm:w-auto">
            <button
              type="button"
              onClick={() => setExportDialogOpen(true)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 sm:w-auto"
            >
              Export
            </button>
          </div>
        ) : null}
      </div>

      <p className="text-sm text-zinc-600">
        Showing {filteredMembers.length} member
        {filteredMembers.length === 1 ? "" : "s"}
      </p>

      {members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-zinc-500">
          No members yet. Add your first member to get started.
        </p>
      ) : filteredMembers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-zinc-500">
          {hasActiveFilters
            ? "No members match your search or filters. Try adjusting your criteria."
            : "No members found."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-zinc-700">Name</th>
                  <th className="px-4 py-3 font-medium text-zinc-700">Email</th>
                  <th className="px-4 py-3 font-medium text-zinc-700">Graduation Year</th>
                  <th className="px-4 py-3 font-medium text-zinc-700">Roles</th>
                  <th className="px-4 py-3 font-medium text-zinc-700">Exec Title</th>
                  {canDelete ? (
                    <th className="px-4 py-3 font-medium text-zinc-700">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => router.push(`/members/${member.id}`)}
                    className="cursor-pointer transition hover:bg-zinc-50/80"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {formatMemberName(member)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{member.email}</td>
                    <td className="px-4 py-3 text-zinc-600">{member.graduation_year}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {member.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex rounded-full bg-[#990000]/10 px-2.5 py-0.5 text-xs font-medium text-[#990000]"
                          >
                            {formatRole(role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatExecTitle(member.exec_title) ?? "—"}
                    </td>
                    {canDelete ? (
                      <td className="px-4 py-3">
                        <MemberDeleteButton
                          member={member}
                          currentMemberId={currentMemberId}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-zinc-200 md:hidden">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => router.push(`/members/${member.id}`)}
                className="cursor-pointer space-y-2 px-4 py-4 transition hover:bg-zinc-50/80"
              >
                <div>
                  <p className="font-medium text-zinc-900">{formatMemberName(member)}</p>
                  <p className="text-sm text-zinc-600">{member.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600">
                  <span>Class of {member.graduation_year}</span>
                  {member.exec_title ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{formatExecTitle(member.exec_title)}</span>
                    </>
                  ) : null}
                </div>

                {member.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {member.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex rounded-full bg-[#990000]/10 px-2.5 py-0.5 text-xs font-medium text-[#990000]"
                      >
                        {formatRole(role)}
                      </span>
                    ))}
                  </div>
                ) : null}

                {canDelete ? (
                  <div className="pt-1">
                    <MemberDeleteButton
                      member={member}
                      currentMemberId={currentMemberId}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {canExport ? (
        <MemberExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          members={filteredMembers}
        />
      ) : null}
    </div>
  );
}

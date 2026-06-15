import type { Member } from "@/lib/members";
import { formatExecTitle, formatMemberName, formatRole } from "@/lib/members";

type MembersTableProps = {
  members: Member[];
};

function StatusBadge({ status }: { status: Member["status"] }) {
  const styles = {
    active: "bg-green-50 text-green-700 border-green-200",
    inactive: "bg-zinc-100 text-zinc-600 border-zinc-200",
    alumni: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function MembersTable({ members }: MembersTableProps) {
  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-zinc-500">
        No members found yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-4 py-3 font-medium text-zinc-700">Name</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Email</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Phone</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Class</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Status</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Roles</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Exec Title</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-zinc-50/80">
              <td className="px-4 py-3 font-medium text-zinc-900">
                {formatMemberName(member)}
              </td>
              <td className="px-4 py-3 text-zinc-600">{member.email}</td>
              <td className="px-4 py-3 text-zinc-600">{member.phone}</td>
              <td className="px-4 py-3 text-zinc-600">
                {member.graduation_year}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={member.status} />
              </td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

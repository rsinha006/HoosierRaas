import {
  formatExportCategory,
  formatExportedAt,
  MEMBER_EXPORT_LOG_LIMIT,
  resolveExportedMembers,
  type MemberExportLogEntry,
} from "@/lib/member-export-log";

type MemberExportLogProps = {
  entries: MemberExportLogEntry[];
  /** Member id to display name, for both exporters and exported members. */
  memberNames: Record<string, string>;
};

function CategoryChips({ categories }: { categories: string[] }) {
  if (categories.length === 0) {
    return <span className="text-zinc-500">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((category) => (
        <span
          key={category}
          className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
        >
          {formatExportCategory(category)}
        </span>
      ))}
    </div>
  );
}

// A collapsed list keeps a 40-name export from burying the rest of the log, and
// <details> does it without shipping any client JavaScript for a read-only view.
function ExportedMembers({
  entry,
  memberNames,
}: {
  entry: MemberExportLogEntry;
  memberNames: Record<string, string>;
}) {
  const { names, removedCount } = resolveExportedMembers(entry.member_ids, memberNames);
  const countLabel = `${entry.member_count} ${entry.member_count === 1 ? "member" : "members"}`;

  if (names.length === 0) {
    return <span className="text-zinc-700">{countLabel}</span>;
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-zinc-700 marker:content-['']">
        <span className="font-medium text-[#990000] group-hover:underline">
          {countLabel}
        </span>
      </summary>
      <ul className="mt-2 space-y-1 text-zinc-600">
        {names.map((name) => (
          <li key={name}>{name}</li>
        ))}
        {removedCount > 0 ? (
          <li className="text-zinc-500">
            {removedCount} removed {removedCount === 1 ? "member" : "members"}
          </li>
        ) : null}
      </ul>
    </details>
  );
}

export default function MemberExportLog({ entries, memberNames }: MemberExportLogProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Export log</h2>
        <p className="mt-1 text-sm text-zinc-600">
          A permanent record of every member data export — who ran it, which data was
          included, and when. This log is read-only and cannot be edited or deleted.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-zinc-500">
          No member data has been exported yet.
        </p>
      ) : (
        <>
          <div className="hidden lg:block">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    When
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Exported by
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Data included
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Members
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="align-top">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900">
                      {formatExportedAt(entry.exported_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-700">
                      {(entry.exported_by_member_id &&
                        memberNames[entry.exported_by_member_id]) || (
                        <span className="text-zinc-500">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <CategoryChips categories={entry.categories} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <ExportedMembers entry={entry} memberNames={memberNames} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-zinc-200 lg:hidden">
            {entries.map((entry) => (
              <div key={entry.id} className="space-y-3 px-4 py-4">
                <div>
                  <p className="font-medium text-zinc-900">
                    {formatExportedAt(entry.exported_at)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Exported by{" "}
                    {(entry.exported_by_member_id &&
                      memberNames[entry.exported_by_member_id]) ||
                      "Unknown"}
                  </p>
                </div>
                <CategoryChips categories={entry.categories} />
                <div className="text-sm">
                  <ExportedMembers entry={entry} memberNames={memberNames} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {entries.length === MEMBER_EXPORT_LOG_LIMIT ? (
        <p className="border-t border-zinc-200 px-6 py-3 text-xs text-zinc-500">
          Showing the {MEMBER_EXPORT_LOG_LIMIT} most recent exports.
        </p>
      ) : null}
    </section>
  );
}

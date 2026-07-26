import { EXPORT_CATEGORIES } from "@/lib/member-export";

export type MemberExportLogEntry = {
  id: string;
  exported_by_member_id: string | null;
  member_ids: string[];
  member_count: number;
  categories: string[];
  exported_at: string;
};

/** How many entries the members page pulls back — enough to cover a season of
 *  exports without turning the page into an unbounded query. */
export const MEMBER_EXPORT_LOG_LIMIT = 50;

/** Older entries can name a category that has since been renamed or removed, so an
 *  unrecognized key is title-cased rather than dropped — a log that quietly hides
 *  what was exported is worse than one showing a slightly awkward label. */
export function formatExportCategory(key: string) {
  const category = EXPORT_CATEGORIES.find((entry) => entry.key === key);

  if (category) {
    return category.label;
  }

  return key
    .split("_")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** The log renders on the server, so an unpinned timezone would show every export in
 *  the deployment's timezone (UTC in production) rather than the viewer's. The team
 *  is in Bloomington, so times are pinned there and labeled, which also keeps the
 *  markup identical on server and client. */
export function formatExportedAt(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Indiana/Indianapolis",
    timeZoneName: "short",
  });
}

/** Splits the logged member ids into names we can still resolve and a count of the
 *  ones we cannot — members deleted since the export keep their row in the log, and
 *  the entry should still say how many people were in it. */
export function resolveExportedMembers(
  memberIds: string[],
  memberNames: Record<string, string>,
) {
  const names: string[] = [];
  let removedCount = 0;

  for (const id of memberIds) {
    const name = memberNames[id];

    if (name) {
      names.push(name);
    } else {
      removedCount += 1;
    }
  }

  return { names: names.sort((left, right) => left.localeCompare(right)), removedCount };
}

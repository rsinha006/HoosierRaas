/**
 * Paged reads for attendance_records.
 *
 * PostgREST caps an unpaginated select at 1000 rows and gives no signal that it
 * truncated. Any attendance query that can exceed that has to page, or it
 * silently loses the oldest records - which does not look like an error, it
 * looks like a member who was never marked absent.
 *
 * The dashboard already paged; the per-member history page did not, and read a
 * different (smaller) slice of the same season, so the two pages disagreed
 * about the same dancer's absence count. Both now go through this.
 */

export const ATTENDANCE_PAGE_SIZE = 1000;

/** How many pages to request at once past the first. */
const PAGE_BATCH = 4;

type QueryError = { message: string };

export type PageResult<T> = {
  data: T[] | null;
  error: QueryError | null;
};

/**
 * Drains a paged query.
 *
 * `fetchPage` is called with an inclusive row range and must apply a total
 * ordering - an ordering with ties lets a row land in two ranges (or neither)
 * once pages stop being sequential, which would reintroduce the exact
 * dropped-record bug this exists to prevent.
 *
 * Pages past the first go out in parallel batches. Batching rather than
 * deriving a page count from an exact count keeps this correct without asking
 * Postgres to count the whole table on every page load, and an undercount there
 * would silently drop records.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = ATTENDANCE_PAGE_SIZE,
): Promise<{ data: T[]; error: QueryError | null }> {
  const all: T[] = [];
  const page = (index: number) =>
    fetchPage(index * pageSize, (index + 1) * pageSize - 1);

  // Most seasons fit in a single page, so the first one goes out alone rather
  // than firing a whole batch of requests that would come back empty.
  const first = await page(0);

  if (first.error) {
    return { data: all, error: first.error };
  }

  const firstRows = first.data ?? [];
  all.push(...firstRows);

  let nextPage = 1;
  let mayHaveMore = firstRows.length === pageSize;

  while (mayHaveMore) {
    const batch = await Promise.all(
      Array.from({ length: PAGE_BATCH }, (_, index) => page(nextPage + index)),
    );

    mayHaveMore = false;

    for (const result of batch) {
      if (result.error) {
        return { data: all, error: result.error };
      }

      const rows = result.data ?? [];
      all.push(...rows);
      // Only a full final page means another batch could still be waiting.
      mayHaveMore = rows.length === pageSize;
    }

    nextPage += PAGE_BATCH;
  }

  return { data: all, error: null };
}

/**
 * Escapes a value used as an `ilike` pattern so `%` and `_` inside it match
 * literally instead of acting as wildcards. Attendance lookups match a member's
 * email case-insensitively, and an unescaped `_` would quietly widen that to
 * other people's records.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** Merges result sets that can overlap, keeping one row per id. */
export function dedupeById<T extends { id: string }>(...groups: T[][]): T[] {
  const byId = new Map<string, T>();

  for (const group of groups) {
    for (const row of group) {
      byId.set(row.id, row);
    }
  }

  return Array.from(byId.values());
}

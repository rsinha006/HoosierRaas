# Archive Season — Paste Cheat Sheet

Build the archive-season feature one phase at a time. **Paste one block, confirm the
"✅ done when" check, then move to the next.** Every block points the AI at
`ARCHIVE_SEASON_PLAN.md` for the full detail, so you only paste a few lines.

> Don't skip ahead. Phases 0–3 are safe and reversible. Phases 5–6 do the real reset
> (archive button + login deletion) — only do them once the foundation works.

---

## Phase 0 — Foundation (no visible change)

```
Create the seasons registry and season helpers, no UI. 1) New Supabase migration
(next timestamp after 20260701000000, existing style, runnable in the SQL Editor)
creating the seasons table per §3a of ARCHIVE_SEASON_PLAN.md — RLS (all read;
captain/TM write), partial unique index for one active season, seed row 2025-2026
(active). 2) lib/seasons.ts with getActiveSeason() and getViewingSeason() per §4.
Don't change modules yet.
```
✅ **Done when:** `seasons` table exists with one active `2025-2026` row; both helpers compile; UI unchanged.

---

## Phase 1 — Make Finance time-travel

```
Replace every getCurrentSeason() call site listed in §0 of ARCHIVE_SEASON_PLAN.md
with getViewingSeason(). Keep getCurrentSeason() defined. Verify the finance pages
load and show data for the resolved season.
```
✅ **Done when:** `/finance?season=2025-2026` shows this season; finance reads its season via `getViewingSeason()`.

---

## Phase 2 — Tag the remaining tables with a season

```
Write a migration per §3c of ARCHIVE_SEASON_PLAN.md: add a season text column to
practice_sessions, competitions, income_entries, and expense_requests; backfill all
existing rows to 2025-2026; then set the columns not null. Update the attendance and
team-manager queries to filter by getViewingSeason() instead of only by date. Also add
the previous_year_carryover income category per §3d.
```
✅ **Done when:** attendance and competitions filter by season; all existing rows are stamped `2025-2026`.

---

## Phase 3 — Viewing banner + read-only UI

```
Per §9 of ARCHIVE_SEASON_PLAN.md, add a banner in app/(hros)/layout.tsx that appears
when the viewing season ≠ the active season, with a "Return to current season" link
that clears the viewing_season cookie. When viewing a non-active season, hide/disable
all create/edit/delete controls across the modules.
```
✅ **Done when:** clicking into an old season shows the banner and no edit buttons; returning restores them.

---

## Phase 4 — Per-season membership + access data model

```
Write a migration per §3b of ARCHIVE_SEASON_PLAN.md creating season_memberships
(status + exec_title per member+season), backfilling every member into 2025-2026 from
members.status and members.exec_title. Then per §5, move access resolution off
members.exec_title to the active season's season_memberships: update
lib/get-user-member.ts, lib/get-auth-users.ts, lib/list-auth-users.ts, lib/users.ts
(buildUserRows), and app/api/users/[id]/role/route.ts (write to season_memberships).
The members module roster reads status from season_memberships for the viewing season.
```
✅ **Done when:** roster + Users tab reflect per-season status/access; assigning a role writes to `season_memberships`; access still works for the active season.

---

## Phase 5 — Dashboard + the two-step archive popup

```
Rebuild app/(hros)/dashboard/page.tsx per §7 of ARCHIVE_SEASON_PLAN.md (list all
seasons, link archived ones, show an Archive Season button for captain/TM only). Build
the two-step popup + review per §8: Step 1 member status (marking alumni flags the
login for deletion), Step 2 login/access with a Delete-login checkbox, then a review
screen summarizing what will happen. The confirm button can call a stubbed action
until Phase 6.
```
✅ **Done when:** dashboard lists seasons; the popup walks status → access → review with correct pre-fills and the deletion list.

---

## Phase 6 — The Archive action (the reset)

```
Implement the Archive action per §6 of ARCHIVE_SEASON_PLAN.md as a Supabase RPC in one
transaction: authorize captain/TM; compute ending balance totalIncome − approvedExpenses
matching app/(hros)/finance/page.tsx; flip the active/archived flags; create the next
season; copy budgets forward; copy iufb_line_items forward with spent_amount reset to 0;
write season_memberships for the new season; carry the balance (surplus →
previous_year_carryover income row, debt → last_years_debt budget row). Then, using the
admin/service-role client, delete the Supabase Auth accounts + profiles rows for members
marked alumni or flagged Delete — never the members row or any historical data. Wire the
popup's confirm to this and redirect to /dashboard.
```
✅ **Done when:** pressing Archive freezes the old season, opens a fresh one with copied budgets + carryover + new exec board, deletes only the chosen logins, and the old season is reachable read-only from the dashboard.

---

## Phase 7 — Database read-only safety net (optional, recommended)

```
Add the database-level read-only protection from §9 of ARCHIVE_SEASON_PLAN.md: RLS
policies or triggers that reject inserts/updates/deletes on any row whose season belongs
to an archived season.
```
✅ **Done when:** a direct attempt to edit archived-season data is rejected by the database, not just hidden in the UI.

---

### Before you start
- Keep `ARCHIVE_SEASON_PLAN.md` in the repo — every prompt above references its sections.
- After each phase, run the app and click around before moving on.
- **Back up / test on throwaway data before Phase 6** — it deletes logins and is irreversible.
```

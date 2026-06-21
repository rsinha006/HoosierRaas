# Archive Season — Build Plan

A feature spec for HROS (HoosierRaas Operating System). Lets a Captain or Team
Manager "archive" the current season — resetting every module for a fresh start —
while keeping every past season viewable, read-only, through links on `/dashboard`.

> **How to use this document.** It's written so you can paste it into Claude Code
> or Cursor and have the feature built. You can paste the whole thing at once, but
> for a beginner the **safest path is to build one Phase at a time** (Phase 0 first,
> confirm it works, then Phase 1, etc. — see §10). Each Phase has a "Paste this" block
> and an "It's done when" checklist. Don't start a Phase until the one before it works.

---

## 0. Context for whoever builds this

- **Stack:** Next.js 16 (App Router) for the website + Supabase (Postgres + Auth) for data.
- **Modules** live under `app/(hros)/`: `dashboard`, `attendance`, `finance`,
  `team-manager`, `members`, `users`.
- **Database migrations** live in `supabase/migrations/`, timestamp-prefixed. Each
  carries the comment "Run this in the Supabase SQL Editor" — migrations are applied
  **manually by pasting them into the Supabase SQL Editor**, not via an automated CLI.
  New migrations follow the same convention, using the next timestamp after
  `20260701000000`.
- **Roles / permissions** use existing Postgres helpers `public.is_exec_user()` and
  `public.get_my_exec_title()` (`captain`, `team_manager`, `finance`, `marketing`,
  `social`). RLS is enabled on finance tables and gates writes by exec title.
- **Admin operations** (managing Supabase Auth accounts) use `createAdminClient()`
  (`lib/supabase/admin.ts`) with the service role key — see `lib/get-auth-users.ts`.

### How "season" works today (important)

There is **no real season switch** yet. A season is *derived from today's date* by
`getCurrentSeason()` in `lib/finance.ts` (academic year Aug 1 → Jul 31, like
`"2025-2026"`). Only some tables store an explicit `season`:

| Table | Season-scoped today? | How |
| --- | --- | --- |
| `budgets` | ✅ yes | `season text` column |
| `iufb_line_items` | ✅ yes | `season text` column |
| `income_entries` | ⚠️ by date | filtered by `date_received` |
| `expense_requests` | ⚠️ by date | filtered by `created_at`, `status='approved'` |
| `practice_sessions` | ⚠️ by date | filtered by `session_date` |
| `competitions` | ⚠️ by date | filtered by `competition_date` |
| `attendance_records` | ⚠️ inherits | via `practice_sessions` parent |
| `members` | ❌ not scoped | one persistent directory; single `status` + `exec_title` |

`getCurrentSeason()` is called directly in (all change in Phase 1):
`lib/finance.ts` (def), `lib/attendance-stats.ts`,
`app/(hros)/finance/page.tsx`, `app/(hros)/finance/income/page.tsx`,
`app/(hros)/finance/budget-setup/page.tsx`, `app/(hros)/finance/expenses/page.tsx`,
`app/(hros)/attendance/page.tsx`, `app/(hros)/attendance/members/[id]/page.tsx`.

### How users / logins work today (important)

- A **login account** = a Supabase Auth user (`auth.users`) + a row in the `profiles`
  table (`id`, `email`, `full_name`, `role`, `roles[]`).
- The link from a login to a roster member is **email**: `getUserMember()` matches
  `auth.user.email` → `members.email`.
- **App access is derived from the member's `exec_title`.** `hasAppAccess()` returns
  true only if the matching member has an `exec_title` **and** the `exec` role. The
  `/users` tab is essentially a view over members' exec titles; its
  `app/api/users/[id]/role/route.ts` writes `exec_title` onto the **`members`** table.

**Consequence that drives this whole design:** "user access" and "member exec status"
are the *same underlying data* (`members.exec_title`). So carrying users over to a new
season is the same mechanism as carrying member status over — both become per-season.

---

## 1. Core principle: archive = FILTER, never DELETE (data)

Archiving does **not** copy data away and wipe tables. Nothing season-scoped is ever
deleted. Instead:

1. Every season-specific row is **tagged with the season it belongs to.**
2. A single "active season" flag says which season is currently live and editable.
3. "Archiving" just **flips the flag to the next season.** Old data stays in place; it's
   simply no longer active.
4. **Viewing a past season = filtering every module to that season's rows.** The "reset"
   is an illusion — the new season looks empty because you're now looking at a fresh
   season, while old data sits safely behind the dashboard links.

> The **one** exception to "never delete" is **login credentials** (Supabase Auth
> accounts), which a Captain/TM may explicitly delete during archive for members who
> are leaving — see §2.6 and §6. Deleting a login never deletes the member or any data.

---

## 2. Locked design decisions

### 2.1 Members = one permanent, growing directory
Archiving never adds, removes, or duplicates a member. `members` is the master list of
every HoosierRaas member, past and present.

### 2.2 Member status + exec title are stored PER SEASON
A new **`season_memberships`** table holds one row per (member, season) with **both**:
- `status` — active / inactive / alumni (roster), and
- `exec_title` — captain / team_manager / finance / none (**this controls login access
  that season**).

This is what lets you look back and see who was active and who was on the exec board
*that* season, even after they later leave. The archive flow writes the **next**
season's rows. `members.status` / `members.exec_title` become legacy (don't depend on
them after backfill).

### 2.3 Login accounts are permanent (except explicit deletion)
A Supabase Auth account (`auth.users` + `profiles`) is **not** tied to a season and is
not deleted automatically — except the explicit deletions in §2.6. Losing exec access
just means `exec_title = none` for the new season; the account still exists.

> **Deleting a login ≠ deleting a member.** Deleting a login removes the `auth.users`
> account + `profiles` row so the person can't sign in. Their `members` record and all
> historical data (attendance, finance, past-season roster rows) **stay forever**, so
> old-season views remain intact.

### 2.4 Opening a past season uses a shareable URL
Like `/dashboard?season=2024-2025`. Every module resolves which season to show through
one helper, `getViewingSeason()` (§4).

### 2.5 A fresh season inherits last season's finances
- Copy last season's `budgets` rows forward (same allocations, editable).
- Copy last season's `iufb_line_items` forward, but **reset `spent_amount` to 0**.
- Carry the ending balance forward, **frozen at archive time**:
  - Ending balance = `totalIncome − approvedExpenses` for the archived season — the
    existing `runningBalance` from `app/(hros)/finance/page.tsx`.
  - **Positive** (surplus): insert an `income_entries` row in the new season, category
    `previous_year_carryover`, amount = surplus.
  - **Negative** (debt): insert/seed a `budgets` row in the new season, category
    `last_years_debt` (already exists), amount = |debt|.

### 2.6 Access + logins carry over in a TWO-STEP popup flow
At archive time, after the Captain/TM presses **Archive Season**:

- **Step 1 — Member status.** For each current member, choose next season's status
  (active / inactive / alumni), pre-filled with current status.
  - **Marking someone `alumni` queues their login credentials for deletion** (they're
    leaving the org). Shown clearly; executed at final confirm.
- **Step 2 — Login / access carryover.** For each member staying on the team (not
  alumni) who currently has a login/exec role, choose next season's access
  (Captain / TM / Finance / None), pre-filled. Plus an explicit per-person **Delete
  login** checkbox for anyone not continuing.
  - **Default when access becomes None = keep the account, just remove access.** A
    login is only deleted for alumni (Step 1) or when Delete is explicitly checked.
- **Final review** before the irreversible confirm: shows budgets to be copied, the
  carryover amount, who keeps/loses access, and the exact list of logins that will be
  deleted.

### 2.7 Past seasons are read-only
When viewing a non-active season, create/edit/delete controls are hidden in the UI and
rejected by the database as a safety net.

### 2.8 Only Captain and Team Manager can archive a season.

---

## 3. Database changes (specifications for new migrations)

Write real SQL following the existing migration style (RLS, grants, `if not exists`,
the "Run this in the Supabase SQL Editor" header), applied in the Supabase SQL Editor.

### 3a. New table `seasons` (registry / source of truth)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | default `gen_random_uuid()` |
| `label` | text, unique, not null | e.g. `"2025-2026"` |
| `starts_on` | date, not null | Aug 1 |
| `ends_on` | date, not null | Jul 31 |
| `is_active` | boolean, not null, default false | the one live, editable season |
| `is_archived` | boolean, not null, default false | read-only history |
| `created_at` | timestamptz, default `now()` |

- Partial unique index on `is_active` where `is_active` → **exactly one** active season.
- Seed the current season (`2025-2026`), `is_active = true`, `is_archived = false`.
- RLS: any authenticated user can `select`; only `captain`/`team_manager` write.

### 3b. New table `season_memberships` (per-season status + access)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | default `gen_random_uuid()` |
| `member_id` | uuid, fk → `members(id)` on delete cascade | |
| `season` | text, not null | matches `seasons.label` |
| `status` | text, not null, check in (`active`,`inactive`,`alumni`) | roster status |
| `exec_title` | text, null, check in (`captain`,`team_manager`,`finance`) | null = no access |
| `created_at` | timestamptz, default `now()` |

- Unique on `(member_id, season)`.
- **Backfill:** for every member, insert one `2025-2026` row from their current
  `members.status` and `members.exec_title`.
- Becomes the source of truth for status **and** access in a season. A member with no
  row for a season simply wasn't on that season's roster.
- RLS: read for authenticated; write for `captain`/`team_manager`.

### 3c. Tag the date-based tables with `season`
Add `season text` to `practice_sessions`, `competitions`, `income_entries`,
`expense_requests`. Backfill every existing row to `2025-2026`, then make `not null`.
(`budgets`, `iufb_line_items` already have it.) `attendance_records` inherits via
`practice_sessions`; competition child tables inherit via `competitions`.

### 3d. New income category for carryover
Add `previous_year_carryover` to the allowed `income_entries` categories (drop/recreate
the check constraint, as `20260624000000_finance_budget_setup.sql` does for `budgets`).
Add a matching `{ value: "previous_year_carryover", label: "Previous Year Carryover" }`
to `INCOME_CATEGORIES` in `lib/finance.ts`. (Debt can't be negative income —
`amount >= 0` — which is why debt carries via the `last_years_debt` budget category.)

---

## 4. The viewing-season mechanism (Phase 1 core)

One helper every module asks "which season do I show?" — so the whole site time-travels
at once.

- Create `lib/seasons.ts` with:
  - `getActiveSeason()` — always the `seasons` row where `is_active = true`.
  - `getViewingSeason()` — resolves: (1) a `season` value from the URL search param,
    propagated via a `viewing_season` cookie set when a dashboard link is clicked, if it
    exists in `seasons`; else (2) the active season.
- **Plumbing (App Router quirk):** layouts can't read search params. Clicking an
  archived-season link sets the `viewing_season` cookie (small server action / route
  handler) and navigates; "Return to current season" clears it. Every module calls
  `getViewingSeason()`, so they all follow the cookie automatically.
- Replace every `getCurrentSeason()` call site (§0) with `getViewingSeason()`. Keep
  `getCurrentSeason()` itself (still used to compute the real current label when
  seeding / archiving).

---

## 5. Access resolution must move to per-season (Phase 5)

Because access now lives in `season_memberships.exec_title`, update the access layer to
read it for the **active** season instead of the static `members.exec_title`:

- `lib/get-user-member.ts` — resolve `exec_title`/`roles` from the active season's
  `season_memberships` row for the member matched by email.
- `lib/user-access.ts` `hasAppAccess()` and `lib/rbac.ts` `hasWriteAccess()` — unchanged
  logic, but fed the per-season `exec_title`.
- `lib/get-auth-users.ts` / `lib/list-auth-users.ts` / `lib/users.ts` `buildUserRows` —
  join `season_memberships` (active season) for `exec_title` instead of `members`.
- `app/api/users/[id]/role/route.ts` — write `exec_title` to `season_memberships` for
  the active season (upsert on `member_id, season`) instead of `members`.

Net effect: when the season flips, last year's board loses access and the new board
gains it automatically; viewing 2024–25 shows that season's board.

---

## 6. The Archive action (Phase 6 core)

Implement as a **single Postgres function (RPC)** called from a server action, run in
one transaction (all-or-nothing). Inputs from the two popups: a list of
`{ member_id, status, next_exec_title, delete_login }`. Steps in order:

1. **Authorize:** reject unless `get_my_exec_title()` is `captain` or `team_manager`.
2. **Read** the active season `A` and its `label`.
3. **Compute A's ending balance** = `totalIncome − approvedExpenses`, reusing the logic
   in `app/(hros)/finance/page.tsx`:
   - `totalIncome` = Σ `income_entries.amount` for season `A`.
   - `approvedExpenses` = Σ `expense_requests.amount` where `status='approved'` for `A`.
4. **Compute next season** `B` (e.g. `2025-2026` → `2026-2027`, dates +1 year).
5. **Flip flags:** `A.is_active=false, A.is_archived=true`; insert `B` with
   `is_active=true, is_archived=false`.
6. **Copy budgets** `A` → `B` (same `allocated_amount`).
7. **Copy iufb_line_items** `A` → `B`, `spent_amount = 0`.
8. **Write `season_memberships` for `B`:** one row per member with their chosen `status`
   and `next_exec_title` (null = no access). Alumni get a row too (status=alumni,
   exec_title=null) — they stay in roster history.
9. **Carry the balance (frozen):** surplus → `income_entries` row in `B`
   (`previous_year_carryover`, dated `B.starts_on`); debt → `budgets` row in `B`
   (`last_years_debt`, `|balance|`); zero → nothing.
10. **Delete logins** (separate step, uses the **admin/service-role** client, not the
    RPC): for every member marked `alumni` OR with `delete_login` checked, delete their
    Supabase Auth user (`auth.admin.deleteUser`) and `profiles` row, matched by email.
    **Do NOT delete the `members` row or any historical data.** Run this only after the
    DB transaction (5–9) succeeds, and report any per-account failures without rolling
    back the season flip.

After success, redirect to `/dashboard` showing the new season.

> **Safety:** step 10 is irreversible. The final review screen (§2.6) must list the exact
> emails to be deleted and require explicit confirmation.

---

## 7. The dashboard (`app/(hros)/dashboard/page.tsx`)

Currently a static placeholder. Rebuild to:

- **List all seasons** from `seasons`, newest first; active one labeled "Current Season."
- Each **archived** season shows **"View {label} (archived)"**, which sets the viewing
  season (cookie + `?season={label}`) and lands the user in the site as it was then.
- Show the **"Archive Season"** button **only** to `captain`/`team_manager`. It launches
  the two-step popup flow (§2.6 / §8).

---

## 8. The archive popup flow (two steps + review)

- **Step 1 — Member status.** Lists the active roster (members with a row in the active
  season's `season_memberships`). Per member: active / inactive / alumni, pre-filled.
  Marking `alumni` visibly flags "login will be deleted."
- **Step 2 — Login / access.** Lists members staying on the team who currently hold a
  login/exec role. Per member: next access (Captain / TM / Finance / None), pre-filled,
  plus a **Delete login** checkbox. Default None = keep account, remove access.
- **Review.** Summarize: budgets/line-items to copy, computed carryover (surplus or
  debt) for season `B`, who keeps/gains/loses access, and the **exact list of logins to
  be deleted**. A single confirm triggers the Archive action (§6).

---

## 9. Read-only enforcement (Phase 3 + safety net)

- **UI:** when `getViewingSeason()` ≠ `getActiveSeason()`, show a persistent banner in
  `app/(hros)/layout.tsx`: *"You're viewing the archived {label} season — read only.
  Return to current season."* (link clears the `viewing_season` cookie). Hide/disable all
  create/edit/delete controls across modules in that state.
- **DB safety net (lower priority):** RLS policies / triggers rejecting writes to rows
  whose `season` belongs to an archived season.

---

## 10. Build phases (paste these one at a time)

### Phase 0 — Foundation (no visible change)
> "Create the `seasons` registry and season helpers, no UI. 1) New Supabase migration
> (next timestamp after `20260701000000`, existing style, runnable in the SQL Editor)
> creating `seasons` per §3a of `ARCHIVE_SEASON_PLAN.md` — RLS (all read; captain/TM
> write), partial unique index for one active season, seed row `2025-2026` (active).
> 2) `lib/seasons.ts` with `getActiveSeason()` and `getViewingSeason()` per §4. Don't
> change modules yet."

**Done when:** `seasons` exists with one active `2025-2026` row; both helpers compile;
UI unchanged.

### Phase 1 — Make Finance time-travel
> "Replace every `getCurrentSeason()` call site in §0 of `ARCHIVE_SEASON_PLAN.md` with
> `getViewingSeason()`. Keep `getCurrentSeason()` defined. Verify finance pages load and
> show data for the resolved season."

**Done when:** `/finance?season=2025-2026` shows this season; finance reads season via
`getViewingSeason()`.

### Phase 2 — Tag the remaining tables
> "Migration per §3c: add `season text` to `practice_sessions`, `competitions`,
> `income_entries`, `expense_requests`; backfill to `2025-2026`; set `not null`. Update
> attendance and team-manager queries to filter by `getViewingSeason()` instead of only
> by date. Add the `previous_year_carryover` income category per §3d."

**Done when:** attendance and competitions filter by season; existing rows stamped.

### Phase 3 — Viewing banner + read-only UI
> "Per §9: banner in `app/(hros)/layout.tsx` when viewing season ≠ active season, with a
> 'Return to current season' link clearing the `viewing_season` cookie; hide/disable all
> create/edit/delete controls when viewing a non-active season."

**Done when:** old seasons show the banner and no edit buttons; returning restores them.

### Phase 4 — Per-season membership + access data model
> "Migration per §3b creating `season_memberships` (status + exec_title per member+
> season), backfilling every member into `2025-2026` from `members.status`/`exec_title`.
> Then per §5, move access resolution off `members.exec_title` to the active season's
> `season_memberships`: update `lib/get-user-member.ts`, `lib/get-auth-users.ts`,
> `lib/list-auth-users.ts`, `lib/users.ts` (`buildUserRows`), and
> `app/api/users/[id]/role/route.ts` (write to `season_memberships`). Members module
> roster reads status from `season_memberships` for the viewing season."

**Done when:** roster + Users tab reflect per-season status/access; assigning a role
writes to `season_memberships`; access still works for the active season.

### Phase 5 — Dashboard + the two-step archive popup
> "Rebuild `app/(hros)/dashboard/page.tsx` per §7 (list seasons, link archived ones,
> Archive Season button for captain/TM). Build the two-step popup + review per §8 — Step
> 1 status (alumni flags login deletion), Step 2 access with a Delete-login checkbox, then
> a review screen. The confirm button can call a stubbed action until Phase 6."

**Done when:** dashboard lists seasons; the popup walks status → access → review with
correct pre-fills and the deletion list.

### Phase 6 — The Archive action (the reset)
> "Implement the Archive action per §6 as a Supabase RPC in one transaction (authorize
> captain/TM; compute ending balance `totalIncome − approvedExpenses` matching
> `app/(hros)/finance/page.tsx`; flip flags; create next season; copy `budgets`; copy
> `iufb_line_items` with `spent_amount=0`; write `season_memberships` for the new season;
> carry balance surplus→`previous_year_carryover` income / debt→`last_years_debt`
> budget). Then, using the admin/service-role client, delete the Supabase Auth accounts +
> `profiles` for members marked alumni or flagged Delete — never the `members` row or any
> data. Wire the popup's confirm to this and redirect to `/dashboard`."

**Done when:** pressing Archive freezes the old season, opens a fresh one with copied
budgets + carryover + new exec board, deletes only the chosen logins, and the old season
is reachable read-only from the dashboard.

### Phase 7 — DB read-only safety net (optional, recommended)
> "Add the database-level read-only protection from §9: RLS/triggers rejecting writes to
> rows whose `season` belongs to an archived season."

**Done when:** a direct edit to archived-season data is rejected by the database.

---

## 11. Things to confirm / gotchas

- **One active season, always** — the partial unique index enforces it; the archive RPC
  must flip old off and new on in the same transaction.
- **Ending-balance formula must match the app** — reuse `totalIncome − approvedExpenses`
  exactly as `app/(hros)/finance/page.tsx` computes it; don't invent new math.
- **Carryover is frozen** — written as a real row at archive time, never recomputed.
- **Members are never deleted; logins can be** — deleting a login removes only
  `auth.users` + `profiles`. The member + all history stay, so old-season views work.
- **Login deletion is irreversible and runs outside the DB transaction** (it's a
  service-role Auth admin call). Do it after the season flip succeeds; surface per-account
  failures without rolling back the flip. Require explicit confirmation listing emails.
- **Access is per-season now** — anything still reading `members.exec_title` for access
  after Phase 4 is a bug; everything should read `season_memberships` for the relevant
  season.
- **Backfills are one-time** — verify every row is stamped `2025-2026` before adding
  `not null` constraints.
- **App Router quirk** — layouts can't read search params; the `viewing_season` cookie
  carries the viewing season across in-site navigation. Dashboard links set it; the
  banner clears it.
- **Test on throwaway data first** — archive once on non-critical data, click back into
  the old season, and confirm finance, attendance, competitions, roster, and the exec
  board all display as they were.
```

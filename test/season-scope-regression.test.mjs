import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260708000000_fix_archive_attendance_season_scope.sql",
    import.meta.url,
  ),
  "utf8",
);

const archivePreview = readFileSync(
  new URL("../lib/archive-season-server.ts", import.meta.url),
  "utf8",
);

const attendancePage = readFileSync(
  new URL("../app/(hros)/attendance/page.tsx", import.meta.url),
  "utf8",
);

const sessionDetailPage = readFileSync(
  new URL("../app/(hros)/attendance/[id]/page.tsx", import.meta.url),
  "utf8",
);

test("archive carryover uses season-scoped finance rows under a write lock", () => {
  const archiveFunction = migration.match(
    /create or replace function public\.archive_season\([\s\S]*?grant execute on function public\.archive_season\(text, jsonb\) to authenticated;/,
  )?.[0];

  assert.ok(archiveFunction);
  assert.match(
    archiveFunction,
    /lock table public\.income_entries, public\.expense_requests in share row exclusive mode;/,
  );
  assert.match(
    archiveFunction,
    /from public\.income_entries[\s\S]*?where season = v_a_label;/,
  );
  assert.match(
    archiveFunction,
    /from public\.expense_requests[\s\S]*?where season = v_a_label[\s\S]*?and status = 'approved';/,
  );
  assert.doesNotMatch(archiveFunction, /date_received >=|created_at >=/);
});

test("archive preview matches the season-scoped database carryover calculation", () => {
  assert.match(
    archivePreview,
    /\.from\("income_entries"\)[\s\S]*?\.select\("amount"\)[\s\S]*?\.eq\("season", activeSeasonLabel\)/,
  );
  assert.match(
    archivePreview,
    /\.from\("expense_requests"\)[\s\S]*?\.select\("amount"\)[\s\S]*?\.eq\("status", "approved"\)[\s\S]*?\.eq\("season", activeSeasonLabel\)/,
  );
  assert.doesNotMatch(archivePreview, /getSeasonDateRange|getSeasonTimestampBounds/);
});

test("attendance auto-close flags absences from the session season roster", () => {
  assert.match(
    migration,
    /create or replace function public\.close_expired_practice_sessions\(\)[\s\S]*?returning id, type, season[\s\S]*?join public\.season_memberships sm[\s\S]*?on sm\.season = cs\.season[\s\S]*?and sm\.status = 'active'/,
  );
  assert.match(
    migration,
    /create or replace function public\.close_practice_session_manually\(p_session_id uuid\)[\s\S]*?v_session_season text[\s\S]*?select ps\.type, ps\.season[\s\S]*?where sm\.season = v_session_season[\s\S]*?and sm\.status = 'active'/,
  );
  assert.doesNotMatch(migration, /where m\.status = 'active'/);
});

test("attendance pages load expected members from the viewed session season", () => {
  assert.match(
    attendancePage,
    /season_memberships!inner[\s\S]*?\.eq\("season_memberships\.season", season\)[\s\S]*?\.eq\("season_memberships\.status", "active"\)/,
  );
  assert.match(
    sessionDetailPage,
    /season_memberships!inner[\s\S]*?\.eq\("season_memberships\.season", session\.season\)[\s\S]*?\.eq\("season_memberships\.status", "active"\)/,
  );
  assert.doesNotMatch(attendancePage, /\.eq\("status", "active"\)/);
  assert.doesNotMatch(sessionDetailPage, /\.eq\("status", "active"\)/);
});

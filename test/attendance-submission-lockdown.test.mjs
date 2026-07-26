import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260727000000_attendance_submission_lockdown.sql",
    import.meta.url,
  ),
  "utf8",
);

const responseForm = readFileSync(
  new URL("../components/attendance-response-form.tsx", import.meta.url),
  "utf8",
);

/** The migration's header explains the old p_session_id behaviour, so
 *  "this identifier is gone" has to be asserted against the SQL that runs. */
const migrationSql = migration
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

// ---------------------------------------------------------------------------
// The submission path
// ---------------------------------------------------------------------------

/**
 * The reported flaw: submit_attendance_response took a session id, and session
 * ids are not secret - they are in the exec-facing /attendance/<id> URL. The
 * shareable token was therefore never actually required.
 */
test("the session is resolved from the token, never from a caller-supplied id", () => {
  assert.match(
    migration,
    /create or replace function public\.submit_attendance_response\(\s*p_token uuid/,
  );
  assert.match(
    migration,
    /from public\.practice_sessions ps\s+where ps\.shareable_token = p_token/,
  );
  // The old id-taking definition has to go, not just be shadowed.
  assert.match(
    migration,
    /drop function if exists public\.submit_attendance_response\(\s*uuid, text, text, text, text, boolean, boolean, text, text\s*\)/,
  );
  assert.doesNotMatch(migrationSql, /p_session_id/);
});

test("the token still has to belong to an open session inside its window", () => {
  assert.match(
    migration,
    /where ps\.shareable_token = p_token\s+and ps\.status = 'open'\s+and ps\.response_window_closes_at > now\(\)/,
  );
});

/**
 * Without this, a response could be filed under any name and email - including
 * a real dancer's, marking them absent - and a session could be padded with
 * responses from people who are not on the team.
 */
test("the submitter must be on the roster for that session's season", () => {
  assert.match(
    migration,
    /join public\.season_memberships sm\s+on sm\.member_id = m\.id\s+and sm\.season = v_season\s+and sm\.status = 'active'/,
  );
  assert.match(migration, /if v_member_id is null then\s+raise exception/);
});

test("an accepted submission always records which member it belongs to", () => {
  // member_id being always set is what makes the existing partial unique index
  // on (session_id, member_id) apply to every submission rather than only to
  // the ones that happened to match a member.
  assert.match(migration, /insert into public\.attendance_records \([\s\S]*?member_id,/);
  assert.match(migration, /values \(\s*v_session_id,\s*v_member_id,/);
});

test("the duplicate pre-check is keyed on the token too", () => {
  assert.match(
    migration,
    /create or replace function public\.attendance_already_submitted\(\s*p_token uuid/,
  );
  assert.match(migration, /drop function if exists public\.attendance_already_submitted\(uuid, text\)/);
});

test("the public form sends the token and never the session id", () => {
  assert.match(responseForm, /p_token: token/);
  assert.doesNotMatch(responseForm, /p_session_id/);
});

// ---------------------------------------------------------------------------
// Auto-flagging
// ---------------------------------------------------------------------------

/**
 * Same season-scoping defect as the app pages had, on the automatic side: this
 * marked every active row in the members table absent. On this database that
 * wrote 34 absence records per close for dancers who are not on the roster.
 */
test("auto-flagging only covers the season's own roster", () => {
  assert.match(
    migration,
    /join public\.season_memberships sm\s+on sm\.season = cs\.season\s+and sm\.status = 'active'/,
  );
  // The season has to come back off the closed session to join against.
  assert.match(migration, /returning id, season/);
  assert.doesNotMatch(migrationSql, /cross join public\.members m/);
});

import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260708000000_require_attendance_submit_token.sql",
    import.meta.url,
  ),
  "utf8",
);

const publicAttendPage = readFileSync(
  new URL("../app/attend/[token]/page.tsx", import.meta.url),
  "utf8",
);

const attendanceResponseForm = readFileSync(
  new URL("../components/attendance-response-form.tsx", import.meta.url),
  "utf8",
);

test("public attendance submit RPC requires matching shareable token", () => {
  assert.match(
    migration,
    /drop function if exists public\.submit_attendance_response\(\s*uuid,\s*text,\s*text,\s*text,\s*text,\s*boolean,\s*boolean,\s*boolean,\s*text\s*\)/,
  );
  assert.match(
    migration,
    /create or replace function public\.submit_attendance_response\(\s*p_session_id uuid,\s*p_token uuid,[\s\S]*?ps\.id = p_session_id[\s\S]*?ps\.shareable_token = p_token[\s\S]*?ps\.status = 'open'/,
  );
  assert.match(
    migration,
    /grant execute on function public\.submit_attendance_response\(\s*uuid,\s*uuid,\s*text,\s*text,\s*text,\s*text,\s*boolean,\s*boolean,\s*boolean,\s*text\s*\) to anon, authenticated/,
  );
});

test("public attendance form passes the route token to the submit RPC", () => {
  assert.match(
    publicAttendPage,
    /<AttendanceResponseForm session=\{session\} attendanceToken=\{token\} \/>/,
  );
  assert.match(attendanceResponseForm, /attendanceToken: string/);
  assert.match(
    attendanceResponseForm,
    /supabase\.rpc\("submit_attendance_response", \{[\s\S]*?p_session_id: session\.id,[\s\S]*?p_token: attendanceToken,/,
  );
});

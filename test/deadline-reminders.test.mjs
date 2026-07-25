import { test } from "node:test";
import assert from "node:assert/strict";
import { findDeadlinesDueForReminder, reminderKey } from "../lib/deadline-reminders.ts";

const TODAY = new Date("2026-07-24T00:00:00");

function makeDeadline(overrides = {}) {
  return {
    id: "deadline-1",
    competition_id: "comp-1",
    name: "Roster confirmation",
    due_date: "2026-07-27",
    fine_amount: null,
    is_hard_cutoff: false,
    status: "pending",
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

test("matches a deadline due in exactly `leadDays` days", () => {
  const deadline = makeDeadline({ due_date: "2026-07-27" });
  const result = findDeadlinesDueForReminder([deadline], [1, 3, 7], new Set(), TODAY);

  assert.deepEqual(
    result.map((r) => r.leadDays),
    [3],
  );
  assert.equal(result[0].deadline.id, "deadline-1");
});

test("does not match a deadline outside every configured lead time", () => {
  const deadline = makeDeadline({ due_date: "2026-08-15" });
  const result = findDeadlinesDueForReminder([deadline], [1, 3, 7], new Set(), TODAY);

  assert.equal(result.length, 0);
});

test("skips deadlines already marked complete", () => {
  const deadline = makeDeadline({ due_date: "2026-07-27", status: "complete" });
  const result = findDeadlinesDueForReminder([deadline], [1, 3, 7], new Set(), TODAY);

  assert.equal(result.length, 0);
});

test("skips deadlines with no due date", () => {
  const deadline = makeDeadline({ due_date: null });
  const result = findDeadlinesDueForReminder([deadline], [1, 3, 7], new Set(), TODAY);

  assert.equal(result.length, 0);
});

test("dedups against already-sent (deadline, lead_days) pairs", () => {
  const deadline = makeDeadline({ due_date: "2026-07-27" });
  const alreadySent = new Set([reminderKey("deadline-1", 3)]);
  const result = findDeadlinesDueForReminder([deadline], [1, 3, 7], alreadySent, TODAY);

  assert.equal(result.length, 0);
});

test("a deadline can match multiple lead times on different days but only one per run", () => {
  const dueToday = makeDeadline({ id: "d-today", due_date: "2026-07-24" });
  const dueInAWeek = makeDeadline({ id: "d-week", due_date: "2026-07-31" });
  const result = findDeadlinesDueForReminder(
    [dueToday, dueInAWeek],
    [0, 1, 3, 7],
    new Set(),
    TODAY,
  );

  assert.deepEqual(
    result.map((r) => `${r.deadline.id}:${r.leadDays}`),
    ["d-today:0", "d-week:7"],
  );
});

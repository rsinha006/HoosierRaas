import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildReminderEmailHtml,
  buildReminderEmailSubject,
} from "../lib/reminder-email.ts";

function makeContext(overrides = {}) {
  return {
    deadline: {
      id: "deadline-1",
      competition_id: "comp-1",
      name: "Roster confirmation",
      due_date: "2026-07-27",
      fine_amount: 50,
      is_hard_cutoff: false,
      status: "pending",
      completed_at: null,
      created_at: "2026-01-01T00:00:00Z",
    },
    leadDays: 3,
    competitionName: "Regionals",
    competitionUrl: "https://example.com/team-manager/competitions/comp-1",
    ...overrides,
  };
}

test("subject includes deadline name, competition, and lead time", () => {
  const subject = buildReminderEmailSubject(makeContext());
  assert.match(subject, /Roster confirmation/);
  assert.match(subject, /Regionals/);
  assert.match(subject, /in 3 days/);
});

test("subject uses 'today' for a same-day reminder", () => {
  const subject = buildReminderEmailSubject(makeContext({ leadDays: 0 }));
  assert.match(subject, /due today/);
});

test("html includes the fine amount and competition link", () => {
  const html = buildReminderEmailHtml(makeContext());
  assert.match(html, /\$50\.00/);
  assert.match(html, /https:\/\/example\.com\/team-manager\/competitions\/comp-1/);
});

test("html omits the fine clause when there is no fine", () => {
  const html = buildReminderEmailHtml(
    makeContext({ deadline: { ...makeContext().deadline, fine_amount: null } }),
  );
  assert.doesNotMatch(html, /Fine/);
});

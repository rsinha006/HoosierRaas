import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchSeasonRoster } from "../lib/season-roster.ts";

const SEASON = "2025-2026";

/**
 * Minimal stand-in for the PostgREST builder: records the filters applied and
 * resolves to whatever rows the fake table returns for them.
 */
function fakeSupabase(membershipRows, { error = null } = {}) {
  const state = { table: null, filters: {} };

  const builder = {
    select() {
      return builder;
    },
    eq(column, value) {
      state.filters[column] = value;
      return builder;
    },
    then(resolve) {
      if (error) {
        return Promise.resolve({ data: null, error }).then(resolve);
      }

      const rows = membershipRows.filter((row) => {
        if (state.filters.season !== undefined && row.season !== state.filters.season) {
          return false;
        }
        if (state.filters.status !== undefined && row.status !== state.filters.status) {
          return false;
        }
        // members!inner with a filter on the joined table drops the row.
        if (
          state.filters["members.pending_review"] !== undefined &&
          row.members.pending_review !== state.filters["members.pending_review"]
        ) {
          return false;
        }
        return true;
      });

      return Promise.resolve({ data: rows, error: null }).then(resolve);
    },
  };

  return {
    state,
    from(table) {
      state.table = table;
      return builder;
    },
  };
}

function membership(id, { season = SEASON, status = "active", roles = ["dancer"], pendingReview = false } = {}) {
  return {
    season,
    status,
    members: {
      id,
      first_name: `First${id}`,
      last_name: `Last${id}`,
      email: `${id}@iu.edu`,
      roles,
      pending_review: pendingReview,
    },
  };
}

/**
 * The bug this guards: attendance read every active row in the members table,
 * which is not season-scoped, so it measured the team against people who were
 * not on the roster at all. The roster is season_memberships.
 */
test("the roster is read from season memberships, not the members table", async () => {
  const supabase = fakeSupabase([membership("a"), membership("b")]);
  await fetchSeasonRoster(supabase, SEASON);

  assert.equal(supabase.state.table, "season_memberships");
  assert.equal(supabase.state.filters.season, SEASON);
});

test("members from another season are excluded", async () => {
  const supabase = fakeSupabase([
    membership("thisyear"),
    membership("lastyear", { season: "2024-2025" }),
  ]);

  const { data } = await fetchSeasonRoster(supabase, SEASON);

  assert.deepEqual(
    data.map((member) => member.id),
    ["thisyear"],
  );
});

test("members with no membership row for the season are excluded", async () => {
  // A dancer left in the members table as active but never enrolled this
  // season simply has no row here - and must not appear.
  const supabase = fakeSupabase([membership("onroster")]);
  const { data } = await fetchSeasonRoster(supabase, SEASON);

  assert.equal(data.length, 1);
  assert.equal(data[0].id, "onroster");
});

test("inactive and alumni memberships are excluded from expected attendees", async () => {
  const supabase = fakeSupabase([
    membership("active"),
    membership("inactive", { status: "inactive" }),
    membership("alumni", { status: "alumni" }),
  ]);

  const { data } = await fetchSeasonRoster(supabase, SEASON);

  assert.deepEqual(
    data.map((member) => member.id),
    ["active"],
  );
});

test("submissions still awaiting onboarding review are excluded", async () => {
  const supabase = fakeSupabase([
    membership("confirmed"),
    membership("pending", { pendingReview: true }),
  ]);

  const { data } = await fetchSeasonRoster(supabase, SEASON);

  assert.deepEqual(
    data.map((member) => member.id),
    ["confirmed"],
  );
});

test("the roster keeps the roles that decide who a session applies to", async () => {
  const supabase = fakeSupabase([
    membership("dancer", { roles: ["dancer"] }),
    membership("exec", { roles: ["exec"] }),
  ]);

  const { data } = await fetchSeasonRoster(supabase, SEASON);
  const byId = Object.fromEntries(data.map((member) => [member.id, member.roles]));

  assert.deepEqual(byId.dancer, ["dancer"]);
  assert.deepEqual(byId.exec, ["exec"]);
});

test("the roster is sorted by last name then first name", async () => {
  const rows = [membership("c"), membership("a"), membership("b")];
  const supabase = fakeSupabase(rows);

  const { data } = await fetchSeasonRoster(supabase, SEASON);

  assert.deepEqual(
    data.map((member) => member.last_name),
    ["Lasta", "Lastb", "Lastc"],
  );
});

test("a failed roster read reports the error instead of an empty roster", async () => {
  // An empty roster would silently make every attendance percentage 0 of 0.
  const supabase = fakeSupabase([], { error: { message: "permission denied" } });
  const { data, error } = await fetchSeasonRoster(supabase, SEASON);

  assert.equal(error?.message, "permission denied");
  assert.deepEqual(data, []);
});

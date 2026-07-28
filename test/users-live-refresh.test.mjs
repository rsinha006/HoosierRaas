import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const component = readFileSync(
  new URL("../components/users-live-refresh.tsx", import.meta.url),
  "utf8",
);

/**
 * The reported flaw (M7): leaving the Users tab open in the foreground
 * triggered a full server re-render every ten seconds - listing every login
 * account, member, season membership and profile, and reconciling missing
 * records - roughly 360 rebuilds an hour for a page whose data changes a
 * couple of times a semester. Hiding the tab already correctly paused
 * polling; the ten-second cadence itself was the waste.
 */

test("the poll interval is minutes, not seconds", () => {
  assert.match(component, /const USERS_REFRESH_INTERVAL_MS = 5 \* 60_000;/);
  assert.doesNotMatch(component, /USERS_REFRESH_INTERVAL_MS = 10_000/);
});

test("polling still pauses while the tab is hidden and refreshes immediately when it returns", () => {
  assert.match(component, /if \(document\.hidden\) \{\s*stopPolling\(\);/);
  assert.match(
    component,
    /handleVisibilityChange = \(\) => \{[\s\S]*?router\.refresh\(\);[\s\S]*?startPolling\(\);/,
  );
});

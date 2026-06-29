import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeOnboardingRoles } from "../lib/onboarding.ts";

test("mergeOnboardingRoles keeps non-dancer roles and applies onboarding roles", () => {
  assert.deepEqual(mergeOnboardingRoles(["exec"], ["dancer"]), ["exec", "dancer"]);
  assert.deepEqual(mergeOnboardingRoles(["exec", "dancer"], ["production"]), [
    "exec",
    "production",
  ]);
  assert.deepEqual(mergeOnboardingRoles(null, ["dancer", "production"]), [
    "dancer",
    "production",
  ]);
});

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260711000000_onboarding_member_update.sql",
    import.meta.url,
  ),
  "utf8",
);

test("onboarding update migration allows lookup and update for incomplete members", () => {
  assert.match(
    migration,
    /create policy "Allow anonymous onboarding member lookup"[\s\S]*?for select[\s\S]*?to anon, authenticated/,
  );
  assert.match(
    migration,
    /create policy "Allow anonymous dancer onboarding update"[\s\S]*?for update[\s\S]*?public\.is_onboarding_completion_roles\(roles\)/,
  );
  assert.match(
    migration,
    /create or replace function public\.is_eligible_for_onboarding_update/,
  );
});

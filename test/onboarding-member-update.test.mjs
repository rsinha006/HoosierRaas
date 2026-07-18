import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260711000000_onboarding_member_update.sql",
    import.meta.url,
  ),
  "utf8",
);

const hardeningMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260718100000_block_anonymous_onboarding_updates.sql",
    import.meta.url,
  ),
  "utf8",
);

const onboardingForm = readFileSync(
  new URL("../components/dancer-onboarding-form.tsx", import.meta.url),
  "utf8",
);

test("onboarding update migration originally limited updates to pending members", () => {
  assert.match(
    migration,
    /create or replace function public\.is_eligible_for_onboarding_update/,
  );
});

test("public onboarding cannot update existing member rows anonymously", () => {
  assert.match(
    hardeningMigration,
    /drop policy if exists "Allow anonymous dancer onboarding update" on public\.members/,
  );
  assert.match(
    hardeningMigration,
    /create or replace function public\.is_onboarding_completion_roles[\s\S]*?public\.is_onboarding_submission\(roles\)/,
  );
  assert.doesNotMatch(
    onboardingForm,
    /\.from\("members"\)[\s\S]*?\.update\(/,
  );
});

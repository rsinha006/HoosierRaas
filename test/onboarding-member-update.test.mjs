import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import ts from "typescript";

const onboardingModuleUrl = new URL("../lib/onboarding.ts", import.meta.url);
const onboardingSource = readFileSync(onboardingModuleUrl, "utf8");
const transpiledOnboarding = ts.transpileModule(onboardingSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: onboardingModuleUrl.pathname,
}).outputText;
const { mergeOnboardingRoles } = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledOnboarding).toString("base64")}`
);

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

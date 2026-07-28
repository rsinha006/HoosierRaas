import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const profilePage = readFileSync(
  new URL("../app/(hros)/members/[id]/page.tsx", import.meta.url),
  "utf8",
);
const editPage = readFileSync(
  new URL("../app/(hros)/members/[id]/edit/page.tsx", import.meta.url),
  "utf8",
);
const editForm = readFileSync(
  new URL("../components/member-edit-form.tsx", import.meta.url),
  "utf8",
);

/**
 * The reported flaw (M4): you could add a member, delete a member, and review
 * a pending onboarding submission, but nothing let you correct a confirmed
 * member's phone number, graduation year, or the spelling of their name.
 * Members added via role assignment got a literal "-" as their phone number
 * that then displayed on their profile forever.
 */

test("the member profile page only offers Edit to members-write users", () => {
  assert.match(
    profilePage,
    /hasWriteAccess\(userMember\?\.exec_title \?\? null, "members"\)/,
  );
  assert.match(profilePage, /\{canWrite \? \(/);
  assert.match(profilePage, /href=\{`\/members\/\$\{member\.id\}\/edit`\}/);
});

test("a save redirects back to the profile with an update confirmation", () => {
  assert.match(profilePage, /const showUpdated = updated === "1"/);
  assert.match(profilePage, /\{showUpdated && \(/);
  assert.match(editForm, /router\.push\(`\/members\/\$\{member\.id\}\?updated=1`\)/);
});

test("the edit page is gated the same way the create-member page is", () => {
  assert.match(
    editPage,
    /hasWriteAccess\(userMember\?\.exec_title \?\? null, "members"\)/,
  );
  assert.match(editPage, /Only Captain and Team Manager can edit members\./);
});

test("the edit page pre-fills status and exec title from this season's membership, not the bare member row", () => {
  assert.match(
    editPage,
    /\.from\("season_memberships"\)\s*\.select\("status, exec_title"\)\s*\.eq\("member_id", member\.id\)\s*\.eq\("season", activeSeason\.label\)/,
  );
  assert.match(editPage, /initialStatus=\{membership\?\.status \?\? member\.status\}/);
});

test("the edit form writes both the members row and this season's membership row", () => {
  assert.match(
    editForm,
    /\.from\("members"\)\s*\.update\(\{[\s\S]*?first_name: firstName\.trim\(\)[\s\S]*?graduation_year: Number\(graduationYear\)[\s\S]*?status,[\s\S]*?roles,[\s\S]*?exec_title: hasExecRole \? execTitle : null,[\s\S]*?\}\)\s*\.eq\("id", member\.id\)/,
  );
  assert.match(
    editForm,
    /\.from\("season_memberships"\)\.upsert\(\s*\{[\s\S]*?member_id: member\.id,[\s\S]*?season: activeSeason,/,
  );
  assert.match(editForm, /\{ onConflict: "member_id,season" \}/);
});

test("a placeholder '-' phone from the role-assignment flow starts blank, not literally '-'", () => {
  assert.match(
    editForm,
    /useState\(member\.phone === "-" \? "" : member\.phone\)/,
  );
});

test("the edit form validates the same fields the create-member form does", () => {
  for (const rule of [
    /First name is required\./,
    /Last name is required\./,
    /Enter a valid email address\./,
    /Enter a valid 10-digit phone number\./,
    /Enter a valid graduation year\./,
    /Select at least one role\./,
    /Select an exec title\./,
  ]) {
    assert.match(editForm, rule);
  }
});

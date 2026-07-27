import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesConfirmationName } from "../lib/users.ts";

const deleteButton = readFileSync(
  new URL("../components/member-delete-button.tsx", import.meta.url),
  "utf8",
);

const dialog = readFileSync(
  new URL("../components/member-delete-confirm-dialog.tsx", import.meta.url),
  "utf8",
);

/**
 * The reported flaw: the Delete button on a roster row destroyed the member,
 * their four identity documents and their login behind a single browser
 * confirm. The whole row is a click target that opens the profile, so the
 * button is a small hazard inside a large one - a misclick plus a reflexive
 * "OK" was enough.
 */
test("the browser confirm is gone", () => {
  assert.doesNotMatch(deleteButton, /window\.confirm/);
});

test("the Delete button opens the dialog instead of deleting", () => {
  assert.match(
    deleteButton,
    /onClick=\{\(\) => \{\s+setError\(null\);\s+setConfirmOpen\(true\);/,
  );
  // The request itself only happens on the dialog's confirm.
  assert.match(deleteButton, /onConfirm=\{handleDelete\}/);
  assert.doesNotMatch(
    deleteButton,
    /onClick=\{handleDelete\}/,
    "the button must not delete straight from the row",
  );
});

test("confirming is gated on typing the member's name", () => {
  assert.match(dialog, /const confirmed = matchesConfirmationName\(typedName, confirmationName\)/);
  assert.match(dialog, /onClick=\{onConfirm\}\s+disabled=\{!confirmed \|\| submitting\}/);
});

/** Same check the permission dialog uses, so both places forgive casing and
 *  stray spaces but nothing else. */
test("a near miss does not unlock the delete", () => {
  assert.equal(matchesConfirmationName("  sim dancer 14 ", "Sim Dancer 14"), true);
  assert.equal(matchesConfirmationName("Sim Dancer 4", "Sim Dancer 14"), false);
  assert.equal(matchesConfirmationName("", "Sim Dancer 14"), false);
});

/** A confirmation that does not say what it destroys is just a slower "OK". */
test("the dialog spells out what is destroyed", () => {
  assert.match(dialog, /This cannot be undone\./);
  assert.match(dialog, /government ID, IU student ID,/);
  assert.match(dialog, /their login account, if they have one/);
  assert.match(dialog, /their dues records, and their place on every season roster/);
});

/** The row underneath navigates to the member's profile on click; a click
 *  inside the dialog must not count as a click on the row. */
test("the dialog is rendered inside the wrapper that stops row clicks", () => {
  assert.match(deleteButton, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.ok(
    deleteButton.indexOf("event.stopPropagation()") <
      deleteButton.indexOf("<MemberDeleteConfirmDialog"),
    "the dialog has to sit inside the wrapper, or confirming also opens the profile",
  );
});

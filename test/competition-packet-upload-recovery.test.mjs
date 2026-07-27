import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const form = readFileSync(
  new URL("../components/competition-create-form.tsx", import.meta.url),
  "utf8",
);

/**
 * The reported flaw: creating a competition writes the row first and uploads the
 * PDF second. When the upload failed you were left on the form with an error and
 * no sign that the competition existed - and the obvious response, pressing
 * Submit again, was refused with "A competition named X already exists this
 * season."
 */
test("a failed upload records that the competition exists", () => {
  assert.match(
    form,
    /setCreatedCompetition\(\{ id: competition\.id, name: trimmedName \}\)/,
  );
  assert.ok(
    form.indexOf("setCreatedCompetition({ id: competition.id") <
      form.indexOf("The packet upload failed."),
    "the created row has to be recorded on the failure path, not the success path",
  );
});

test("the form says the competition was created and what is left to do", () => {
  assert.match(form, /\{createdCompetition\.name\} was created\. The registration packet was\s+not uploaded\./);
  assert.match(form, /creating it a second time would\s+be refused as a duplicate/);
});

test("the way out is the competition's own page, which can retry the upload", () => {
  assert.match(
    form,
    /href=\{`\/team-manager\/competitions\/\$\{createdCompetition\.id\}`\}/,
  );
  assert.match(form, /Upload the packet/);
});

/** The submit button is replaced, but Enter in any text field still submits a
 *  form - and that would ask the database for a second competition. */
test("the form cannot be submitted again once the row exists", () => {
  assert.match(
    form,
    /if \(createdCompetition\) \{\s+return;\s+\}/,
  );
  assert.ok(
    form.indexOf("if (createdCompetition) {") < form.indexOf("if (!validateForm())"),
    "the guard has to come before the create path runs",
  );
});

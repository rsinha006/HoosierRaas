import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAdminExecTitle,
  matchesConfirmationName,
  wouldRemoveLastAdmin,
} from "../lib/users.ts";

test("only captain and team manager count as admins", () => {
  assert.equal(isAdminExecTitle("captain"), true);
  assert.equal(isAdminExecTitle("team_manager"), true);
  // Finance writes to Finance only, so it cannot restore anyone's access.
  assert.equal(isAdminExecTitle("finance"), false);
  assert.equal(isAdminExecTitle(null), false);
  assert.equal(isAdminExecTitle(undefined), false);
});

/**
 * The reported flaw: the role dropdown had no self-guard in the screen or the
 * route, so the last Captain could set themselves to "No access" and lock the
 * whole org out with no way back in through the app.
 */
test("the last admin cannot revoke their own access", () => {
  assert.equal(wouldRemoveLastAdmin("captain", null, 0), true);
});

test("the last admin cannot demote themselves to finance", () => {
  // Still a role, but not one that can hand out roles.
  assert.equal(wouldRemoveLastAdmin("captain", "finance", 0), true);
  assert.equal(wouldRemoveLastAdmin("team_manager", "finance", 0), true);
});

test("an admin can step down once someone else holds an admin role", () => {
  // Promote the successor first, then step down - the handoff order works.
  assert.equal(wouldRemoveLastAdmin("captain", null, 1), false);
  assert.equal(wouldRemoveLastAdmin("captain", "finance", 2), false);
});

test("swapping between the two admin titles is always allowed", () => {
  assert.equal(wouldRemoveLastAdmin("captain", "team_manager", 0), false);
  assert.equal(wouldRemoveLastAdmin("team_manager", "captain", 0), false);
});

test("changing a non-admin's role is never blocked", () => {
  assert.equal(wouldRemoveLastAdmin("finance", null, 0), false);
  assert.equal(wouldRemoveLastAdmin(null, "finance", 0), false);
  assert.equal(wouldRemoveLastAdmin(null, null, 0), false);
});

test("promoting someone to admin is never blocked", () => {
  assert.equal(wouldRemoveLastAdmin("finance", "captain", 0), false);
  assert.equal(wouldRemoveLastAdmin(null, "team_manager", 0), false);
});

test("the confirmation name has to match", () => {
  assert.equal(matchesConfirmationName("Rishabh Sinha", "Rishabh Sinha"), true);
  assert.equal(matchesConfirmationName("Niti Shah", "Rishabh Sinha"), false);
  assert.equal(matchesConfirmationName("", "Rishabh Sinha"), false);
});

test("the confirmation tolerates casing and surrounding space", () => {
  // The point is to make someone look at whose row they are on, not to test
  // their typing.
  assert.equal(matchesConfirmationName("  rishabh sinha  ", "Rishabh Sinha"), true);
  assert.equal(matchesConfirmationName("RISHABH SINHA", "Rishabh Sinha"), true);
});

test("a partial name does not confirm", () => {
  assert.equal(matchesConfirmationName("Rishabh", "Rishabh Sinha"), false);
  assert.equal(matchesConfirmationName("Rishabh Sinha extra", "Rishabh Sinha"), false);
});

test("a blank expected name can never be confirmed", () => {
  // Guards the fallback: if a login had neither name nor email, an empty input
  // must not sail through.
  assert.equal(matchesConfirmationName("", ""), false);
  assert.equal(matchesConfirmationName("   ", "   "), false);
});

import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { PUBLIC_LINK_PATHS, PUBLIC_PAGE_ROBOTS } from "../lib/public-links.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const generators = {
  onboarding: read("components/onboarding-link-generator.tsx"),
  signup: read("components/user-signup-link-generator.tsx"),
  expenses: read("components/expense-link-generator.tsx"),
  reimbursements: read("components/reimbursement-link-generator.tsx"),
};

const publicPages = {
  onboarding: read("app/onboarding/page.tsx"),
  signup: read("app/signup/page.tsx"),
  expenses: read("app/expenses/page.tsx"),
  reimbursements: read("app/reimbursements/page.tsx"),
  attend: read("app/attend/[token]/page.tsx"),
};

const notice = read("components/public-link-notice.tsx");

/**
 * The reported flaw: "Generate Onboarding Link" generates nothing. It copies a fixed
 * address that never expires and cannot be revoked, and the word promised the
 * opposite.
 */
test("no button claims to generate a link that is not generated", () => {
  for (const [name, source] of Object.entries(generators)) {
    assert.doesNotMatch(source, /Generate/, `${name} still says "Generate"`);
  }
  assert.match(generators.onboarding, /Copy Onboarding Link/);
});

test("every copy button says what the link is next to it", () => {
  for (const [name, source] of Object.entries(generators)) {
    assert.match(source, /<PublicLinkNotice/, `${name} has no notice`);
    assert.match(
      source,
      new RegExp(`path=\\{PUBLIC_LINK_PATHS\\.${name}\\}`),
      `${name}'s notice points at the wrong path`,
    );
  }
});

test("the notice says the three things that were not being said", () => {
  assert.match(notice, /Permanent public link/);
  assert.match(notice, /can&apos;t be expired or revoked/);
  assert.match(notice, /\{path\}/);
  assert.match(notice, /anyone who has it can submit/);
});

/** The address the button copies and the address the notice names have to be the
 *  same one, or the notice becomes its own kind of lie. */
test("the copied address and the named address come from one place", () => {
  for (const [name, source] of Object.entries(generators)) {
    assert.match(
      source,
      new RegExp(
        `\\$\\{window\\.location\\.origin\\}\\$\\{PUBLIC_LINK_PATHS\\.${name}\\}`,
      ),
      `${name} builds its URL by hand`,
    );
  }
});

test("the reimbursement card shows the link it is handing out", () => {
  assert.match(generators.reimbursements, /\{reimbursementUrl\}/);
});

/** The origin only exists in the browser. Reading it during render makes the first
 *  client pass disagree with the server's HTML, and React discards that tree.
 *  useOrigin is the one place that knows how to do this safely - see
 *  test/attendance-link-hydration.test.mjs for what the hook itself guarantees. */
test("the origin is read through the shared hook", () => {
  assert.match(generators.reimbursements, /const origin = useOrigin\(\)/);
  assert.match(
    generators.reimbursements,
    /import \{ useOrigin \} from "@\/hooks\/use-origin"/,
  );
  assert.doesNotMatch(generators.reimbursements, /useSyncExternalStore/);
  assert.doesNotMatch(generators.reimbursements, /typeof window !== "undefined"/);
});

// ---------------------------------------------------------------------------
// Keeping them out of search results
// ---------------------------------------------------------------------------

/** A permanent link stays closed only as long as nobody finds it by accident. */
test("the public pages ask not to be indexed", () => {
  for (const [name, source] of Object.entries(publicPages)) {
    assert.match(source, /robots: PUBLIC_PAGE_ROBOTS/, `${name} can be indexed`);
  }
});

test("that means no index and no follow, for Google too", () => {
  assert.equal(PUBLIC_PAGE_ROBOTS.index, false);
  assert.equal(PUBLIC_PAGE_ROBOTS.follow, false);
  assert.equal(PUBLIC_PAGE_ROBOTS.googleBot.index, false);
  assert.equal(PUBLIC_PAGE_ROBOTS.googleBot.follow, false);
});

/** The attendance link is the one that carries a real token; an indexed URL would
 *  hand it to anyone who searched. */
test("the attendance link page is covered too", () => {
  assert.match(publicPages.attend, /robots: PUBLIC_PAGE_ROBOTS/);
});

test("the four paths are the four public forms", () => {
  assert.deepEqual(PUBLIC_LINK_PATHS, {
    onboarding: "/onboarding",
    signup: "/signup",
    expenses: "/expenses",
    reimbursements: "/reimbursements",
  });
});

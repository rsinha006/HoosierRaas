import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const link = read("components/shareable-session-link.tsx");
const hook = read("hooks/use-origin.ts");
const sessionPage = read("app/(hros)/attendance/[id]/page.tsx");

/**
 * The reported flaw: the attendance link was built from window.location.origin
 * during render, guarded by a typeof check. The server rendered "/attend/<token>"
 * and the first client render produced the absolute URL, so React found the two
 * trees different, discarded the hydrated one and rebuilt it.
 */
test("the attendance link is not built from a render-time window check", () => {
  assert.doesNotMatch(link, /typeof window !== "undefined"/);
  assert.match(link, /const origin = useOrigin\(\)/);
  assert.match(link, /const attendUrl = `\$\{origin\}\/attend\/\$\{shareableToken\}`/);
});

/** Both sides start from the same string, which is what keeps the markup matching. */
test("the hook has a server snapshot, and it is empty", () => {
  assert.match(hook, /const readOriginOnServer = \(\) => ""/);
  assert.match(
    hook,
    /useSyncExternalStore\(subscribeToNothing, readOrigin, readOriginOnServer\)/,
  );
});

/** A hook that reads the browser cannot be pulled into a server component. */
test("the hook is marked as client code", () => {
  assert.match(hook, /^"use client";/);
});

/** Displayed and copied have to be the same address - two constructions is how they
 *  drift apart. A click can only happen after mount, so the origin is filled in. */
test("the copied link is the one on screen", () => {
  assert.match(link, /navigator\.clipboard\.writeText\(attendUrl\)/);
  assert.equal(link.match(/\/attend\/\$\{shareableToken\}/g)?.length, 1);
});

// ---------------------------------------------------------------------------
// One rendering, not two
// ---------------------------------------------------------------------------

/** The component shipped with a second, compact layout behind a `prominent` flag.
 *  Its only caller has always passed the flag, so that branch never rendered once. */
test("there is no unused second layout", () => {
  assert.doesNotMatch(link, /prominent/);
  assert.equal(link.match(/^  return \(/gm)?.length, 1);
});

test("the session page renders it without a variant flag", () => {
  assert.match(
    sessionPage,
    /<ShareableSessionLink shareableToken=\{session\.shareable_token\} \/>/,
  );
});

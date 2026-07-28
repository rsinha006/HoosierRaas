import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const table = readFileSync(
  new URL("../components/members-table.tsx", import.meta.url),
  "utf8",
);

/**
 * The reported flaw (M5): a roster row looked and acted clickable (a pointer
 * cursor, a hover shade) but was really a <tr onClick={...}> - no href to
 * hover-preview, no middle-click/new-tab, and keyboard users could never
 * reach it. The fix has to keep "click anywhere on the row" working while
 * making it a genuine link: a real next/link stretched across the row with
 * a CSS pseudo-element, not a JS click handler.
 */

test("row navigation is a real link, not a click handler on the row", () => {
  assert.doesNotMatch(table, /onClick=\{\(\) => router\.push/);
  assert.doesNotMatch(table, /useRouter/);
});

test("the desktop row link is stretched across the whole row via a positioned ancestor", () => {
  assert.match(table, /<tr key=\{member\.id\} className="relative transition hover:bg-zinc-50\/80">/);
  assert.match(
    table,
    /<Link\s+href=\{`\/members\/\$\{member\.id\}`\}\s+className="after:absolute after:inset-0 after:content-\[''\]"/,
  );
});

test("the mobile card link uses the same stretched-link technique", () => {
  const mobileSection = table.slice(table.indexOf("md:hidden"));
  assert.match(mobileSection, /className="relative flex items-start gap-3/);
  assert.match(
    mobileSection,
    /<Link\s+href=\{`\/members\/\$\{member\.id\}`\}\s+className="after:absolute after:inset-0 after:content-\[''\]"/,
  );
});

test("the delete button sits above the stretched link so it stays clickable", () => {
  assert.match(table, /<td className="relative z-10 px-4 py-3">\s*<MemberDeleteButton/);
  assert.match(table, /<div className="relative z-10 shrink-0">\s*<MemberDeleteButton/);
});

test("a persistent visual cue marks the row as navigable, not just a hover shade", () => {
  // Desktop: an always-rendered chevron column, not gated behind :hover.
  assert.match(
    table,
    /<td className="px-4 py-3 text-zinc-300" aria-hidden="true">\s*›\s*<\/td>/,
  );
  // Mobile: same chevron, always rendered alongside the card content.
  assert.match(
    table,
    /<span className="mt-1 shrink-0 text-zinc-300" aria-hidden="true">\s*›\s*<\/span>/,
  );
});

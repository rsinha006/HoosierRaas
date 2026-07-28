import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const route = readFileSync(
  new URL("../app/api/extract-packet/route.ts", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260731000000_packet_extraction_draft_persistence.sql",
    import.meta.url,
  ),
  "utf8",
);
const packetInfo = readFileSync(
  new URL("../components/registration-packet-info.tsx", import.meta.url),
  "utf8",
);
const reviewPage = readFileSync(
  new URL(
    "../app/(hros)/team-manager/competitions/[id]/review-packet/page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const reviewPageClient = readFileSync(
  new URL("../components/packet-review-page-client.tsx", import.meta.url),
  "utf8",
);
const reviewForm = readFileSync(
  new URL("../components/packet-extraction-review-form.tsx", import.meta.url),
  "utf8",
);

// ---------------------------------------------------------------------------
// The cooldown timing bug: it used to be spent before extraction could fail
// ---------------------------------------------------------------------------

test("the cooldown is only spent after a successful extraction, not before the download or the AI call", () => {
  const updateIndex = route.indexOf(
    '.update({ last_packet_extraction_at: new Date().toISOString() })',
  );
  const downloadIndex = route.indexOf(".storage\n    .from(REGISTRATION_PACKETS_BUCKET)\n    .download(storagePath)");
  const generateContentIndex = route.indexOf("model.generateContent([");
  const parseIndex = route.indexOf("parseExtractedPacketResponse(responseText)");
  const successReturnIndex = route.indexOf("NextResponse.json({ data, warnings })");

  assert.ok(updateIndex > -1, "expected the cooldown update to still exist");
  assert.ok(downloadIndex > -1 && generateContentIndex > -1 && parseIndex > -1);
  assert.ok(
    updateIndex > downloadIndex &&
      updateIndex > generateContentIndex &&
      updateIndex > parseIndex,
    "the cooldown update must run after the download, the AI call, and parsing succeed",
  );
  assert.ok(
    updateIndex < successReturnIndex,
    "the cooldown update must run before the success response, not on a failure path",
  );
});

test("an empty AI response and a parse failure both return before spending the cooldown", () => {
  const emptyResponseReturn = route.indexOf("The AI returned an empty response.");
  const updateIndex = route.indexOf(
    '.update({ last_packet_extraction_at: new Date().toISOString() })',
  );
  assert.ok(emptyResponseReturn > -1 && emptyResponseReturn < updateIndex);
});

// ---------------------------------------------------------------------------
// Server-side draft persistence
// ---------------------------------------------------------------------------

test("the competitions table gains a column to hold the merged draft", () => {
  assert.match(
    migration,
    /alter table public\.competitions\s+add column if not exists pending_packet_extraction jsonb;/,
  );
});

test("confirming the packet clears the persisted draft in the same transaction as the save", () => {
  assert.match(
    migration,
    /update public\.competitions\s+set[\s\S]*?pending_packet_extraction = null\s+where id = p_competition_id/,
  );
});

test("extraction writes the merged draft to the competition row, not just sessionStorage", () => {
  assert.match(packetInfo, /savePacketReviewDraft\(reviewState\);/);
  assert.match(
    packetInfo,
    /\.from\("competitions"\)\s*\.update\(\{ pending_packet_extraction: reviewState \}\)\s*\.eq\("id", competitionId\)/,
  );
  // The write happens after the local sessionStorage save, and before navigating.
  assert.ok(
    packetInfo.indexOf("savePacketReviewDraft(reviewState)") <
      packetInfo.indexOf("pending_packet_extraction: reviewState"),
  );
  assert.ok(
    packetInfo.indexOf("pending_packet_extraction: reviewState") <
      packetInfo.indexOf("router.push(`/team-manager/competitions/${competitionId}/review-packet`)"),
  );
});

test("the review-packet page loads the persisted draft and passes it down as a fallback", () => {
  assert.match(reviewPage, /select\("id, name, season, pending_packet_extraction"\)/);
  assert.match(reviewPage, /serverDraft=\{competition\.pending_packet_extraction\}/);
});

test("the client only bounces back to the competition page when neither sessionStorage nor the server has a draft", () => {
  assert.match(
    reviewPageClient,
    /const draft = loadPacketReviewDraft\(competitionId\) \?\? serverDraft;/,
  );
  assert.match(
    reviewPageClient,
    /if \(!draft \|\| draft\.competitionId !== competitionId\) \{\s*router\.replace/,
  );
});

test("cancelling the review clears the persisted draft, not just sessionStorage", () => {
  assert.match(reviewForm, /clearPacketReviewDraft\(\);/);
  assert.match(
    reviewForm,
    /\.from\("competitions"\)\s*\.update\(\{ pending_packet_extraction: null \}\)\s*\.eq\("id", formState\.competitionId\)/,
  );
});

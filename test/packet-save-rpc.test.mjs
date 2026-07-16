import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260704000000_transactional_packet_save.sql",
    import.meta.url,
  ),
  "utf8",
);

const savePacketData = readFileSync(
  new URL("../lib/save-competition-packet-data.ts", import.meta.url),
  "utf8",
);
const registrationPacketInfo = readFileSync(
  new URL("../components/registration-packet-info.tsx", import.meta.url),
  "utf8",
);
const packetReview = readFileSync(
  new URL("../lib/packet-review.ts", import.meta.url),
  "utf8",
);

test("packet review save RPC replaces fees and contacts inside one database function", () => {
  assert.match(
    migration,
    /create or replace function public\.save_competition_packet_data\([\s\S]*?security invoker[\s\S]*?update public\.competitions[\s\S]*?delete from public\.fees[\s\S]*?insert into public\.fees[\s\S]*?delete from public\.competition_contacts[\s\S]*?insert into public\.competition_contacts/,
  );
  assert.match(
    migration,
    /grant execute on function public\.save_competition_packet_data\([\s\S]*?jsonb[\s\S]*?\) to authenticated/,
  );
});

test("packet review client delegates destructive save steps to the RPC", () => {
  assert.match(
    savePacketData,
    /supabase\.rpc\("save_competition_packet_data", \{[\s\S]*?p_competition_id: state\.competitionId,[\s\S]*?p_deadlines: deadlinesToSave,[\s\S]*?p_fees: feesToSave,[\s\S]*?p_contacts: contactsToSave/,
  );
  assert.doesNotMatch(
    savePacketData,
    /\.from\("fees"\)[\s\S]*?\.delete\(\)/,
  );
  assert.doesNotMatch(
    savePacketData,
    /\.from\("competition_contacts"\)[\s\S]*?\.delete\(\)/,
  );
});

test("packet review preserves existing deadline ids through save", () => {
  assert.match(
    registrationPacketInfo,
    /\.from\("deadlines"\)[\s\S]*?\.select\("id, name, due_date, fine_amount, is_hard_cutoff"\)/,
  );
  assert.match(packetReview, /export type ExistingDeadlineRow = \{\s+id: string;/);
  assert.match(
    packetReview,
    /const existingRows = existing\.map\(\(deadline\) => \(\{\s+id: deadline\.id,/,
  );
  assert.match(
    savePacketData,
    /const deadlinesById = new Map<string, ExistingDeadline>\(\);[\s\S]*?deadlinesById\.set\(deadline\.id, deadline\);/,
  );
  assert.match(
    savePacketData,
    /const existingDeadlineById = deadlinesById\.get\(deadline\.id\);[\s\S]*?existingDeadline = existingDeadlineById;[\s\S]*?existingDeadline = takeDeadlineMatch/,
  );
});

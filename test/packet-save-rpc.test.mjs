import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260719000000_preserve_packet_rows_from_stale_drafts.sql",
    import.meta.url,
  ),
  "utf8",
);

const savePacketData = readFileSync(
  new URL("../lib/save-competition-packet-data.ts", import.meta.url),
  "utf8",
);

const packetReview = readFileSync(
  new URL("../lib/packet-review.ts", import.meta.url),
  "utf8",
);

const registrationPacketInfo = readFileSync(
  new URL("../components/registration-packet-info.tsx", import.meta.url),
  "utf8",
);

test("packet review save RPC scopes destructive deletes to the draft snapshot", () => {
  assert.match(
    migration,
    /p_known_deadline_ids uuid\[\] default null[\s\S]*?p_known_fee_ids uuid\[\] default null[\s\S]*?p_known_contact_ids uuid\[\] default null/,
  );
  assert.match(
    migration,
    /delete from public\.deadlines\s+where competition_id = p_competition_id\s+and id = any\(v_known_deadline_ids\)\s+and not \(id = any\(v_keep_deadline_ids\)\)/,
  );
  assert.match(
    migration,
    /delete from public\.fees\s+where competition_id = p_competition_id\s+and id = any\(v_known_fee_ids\)\s+and not \(id = any\(v_keep_fee_ids\)\)/,
  );
  assert.match(
    migration,
    /delete from public\.competition_contacts\s+where competition_id = p_competition_id\s+and id = any\(v_known_contact_ids\)\s+and not \(id = any\(v_keep_contact_ids\)\)/,
  );
  assert.doesNotMatch(
    migration,
    /delete from public\.(deadlines|fees|competition_contacts)\s+where competition_id = p_competition_id;/,
  );
  assert.match(
    migration,
    /grant execute on function public\.save_competition_packet_data\([\s\S]*?uuid\[\][\s\S]*?\) to authenticated/,
  );
});

test("packet review drafts capture database row ids for safe packet saves", () => {
  assert.match(
    packetReview,
    /rowSnapshot\?: \{[\s\S]*?deadlineIds: string\[\];[\s\S]*?feeIds: string\[\];[\s\S]*?contactIds: string\[\];[\s\S]*?\}/,
  );
  assert.match(
    packetReview,
    /databaseId\?: string \| null/,
  );
  assert.match(
    registrationPacketInfo,
    /\.from\("deadlines"\)[\s\S]*?\.select\("id, name, due_date, fine_amount, is_hard_cutoff"\)/,
  );
  assert.match(
    registrationPacketInfo,
    /\.from\("fees"\)[\s\S]*?\.select\("id, name, amount, is_per_person, is_refundable, due_date"\)/,
  );
  assert.match(
    registrationPacketInfo,
    /\.from\("competition_contacts"\)[\s\S]*?\.select\("id, name, role, email, phone"\)/,
  );
});

test("packet review client sends row snapshot ids to the RPC", () => {
  assert.match(
    savePacketData,
    /supabase\.rpc\("save_competition_packet_data", \{[\s\S]*?p_competition_id: state\.competitionId,[\s\S]*?p_deadlines: deadlinesToSave,[\s\S]*?p_fees: feesToSave,[\s\S]*?p_contacts: contactsToSave,[\s\S]*?p_known_deadline_ids: snapshotIds\(state\.rowSnapshot\?\.deadlineIds\),[\s\S]*?p_known_fee_ids: snapshotIds\(state\.rowSnapshot\?\.feeIds\),[\s\S]*?p_known_contact_ids: snapshotIds\(state\.rowSnapshot\?\.contactIds\),/,
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

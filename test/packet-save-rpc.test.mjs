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

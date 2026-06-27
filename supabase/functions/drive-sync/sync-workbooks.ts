import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  createSpreadsheetFromXlsx,
  updateSpreadsheetFromXlsx,
} from "./drive-upload.ts";
import type { GeneratedWorkbooks } from "./workbook-generate.ts";

export const FINANCE_WORKBOOK_KEY = "finance_workbook";
export const MEMBER_WORKBOOK_KEY = "member_workbook";

export const SYNC_TARGET_KEYS = [
  FINANCE_WORKBOOK_KEY,
  MEMBER_WORKBOOK_KEY,
] as const;

export type SyncTargetKey = (typeof SYNC_TARGET_KEYS)[number];

type DriveSyncTargetRow = {
  key: string;
  drive_file_id: string | null;
  drive_folder_id: string | null;
};

export type WorkbookSyncResult = {
  key: SyncTargetKey;
  success: boolean;
  driveFileId: string | null;
  fileCreated: boolean;
  error: string | null;
};

const WORKBOOK_DRIVE_NAMES: Record<SyncTargetKey, string> = {
  [FINANCE_WORKBOOK_KEY]: "HROS Finance",
  [MEMBER_WORKBOOK_KEY]: "HROS Members",
};

async function loadSyncTarget(
  supabase: SupabaseClient,
  key: SyncTargetKey,
): Promise<DriveSyncTargetRow> {
  const { data, error } = await supabase
    .from("drive_sync_targets")
    .select("key, drive_file_id, drive_folder_id")
    .eq("key", key)
    .single();

  if (error) {
    throw new Error(`Failed to read drive_sync_targets row '${key}': ${error.message}`);
  }

  return data;
}

async function recordSyncSuccess(
  supabase: SupabaseClient,
  key: SyncTargetKey,
  driveFileId: string,
): Promise<void> {
  const { error } = await supabase
    .from("drive_sync_targets")
    .update({
      drive_file_id: driveFileId,
      last_synced_at: new Date().toISOString(),
      last_sync_status: "success",
      last_sync_error: null,
    })
    .eq("key", key);

  if (error) {
    throw new Error(
      `Failed to record successful sync for '${key}': ${error.message}`,
    );
  }
}

async function recordSyncFailure(
  supabase: SupabaseClient,
  key: SyncTargetKey,
  errorMessage: string,
): Promise<void> {
  const { error } = await supabase
    .from("drive_sync_targets")
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_status: "error",
      last_sync_error: errorMessage,
    })
    .eq("key", key);

  if (error) {
    console.error(
      `Failed to record sync failure for '${key}':`,
      error.message,
    );
  }
}

async function syncSingleWorkbook(
  supabase: SupabaseClient,
  accessToken: string,
  key: SyncTargetKey,
  xlsxBytes: Uint8Array,
  folderId: string,
): Promise<WorkbookSyncResult> {
  const driveName = WORKBOOK_DRIVE_NAMES[key];

  try {
    const target = await loadSyncTarget(supabase, key);
    const effectiveFolderId = target.drive_folder_id ?? folderId;

    if (!effectiveFolderId) {
      throw new Error(`Missing drive_folder_id for '${key}'`);
    }

    let driveFileId: string;
    let fileCreated = false;

    if (target.drive_file_id) {
      driveFileId = await updateSpreadsheetFromXlsx(accessToken, {
        fileId: target.drive_file_id,
        name: driveName,
        xlsxBytes,
      });
    } else {
      driveFileId = await createSpreadsheetFromXlsx(accessToken, {
        name: driveName,
        folderId: effectiveFolderId,
        xlsxBytes,
      });
      fileCreated = true;
    }

    await recordSyncSuccess(supabase, key, driveFileId);

    return {
      key,
      success: true,
      driveFileId,
      fileCreated,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`drive-sync workbook upload failed for '${key}':`, message);
    await recordSyncFailure(supabase, key, message);

    return {
      key,
      success: false,
      driveFileId: null,
      fileCreated: false,
      error: message,
    };
  }
}

export async function syncWorkbooksToDrive(
  supabase: SupabaseClient,
  accessToken: string,
  folderId: string,
  workbooks: GeneratedWorkbooks,
): Promise<WorkbookSyncResult[]> {
  const financeResult = await syncSingleWorkbook(
    supabase,
    accessToken,
    FINANCE_WORKBOOK_KEY,
    workbooks.finance,
    folderId,
  );

  const memberResult = await syncSingleWorkbook(
    supabase,
    accessToken,
    MEMBER_WORKBOOK_KEY,
    workbooks.member,
    folderId,
  );

  return [financeResult, memberResult];
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { RECEIPTS_BUCKET } from "@/lib/reimbursements";

type UploadReceiptOptions = {
  supabase: SupabaseClient;
  path: string;
  file: File;
  onProgress?: (percent: number) => void;
};

export async function uploadReceipt({
  supabase,
  path,
  file,
  onProgress,
}: UploadReceiptOptions) {
  onProgress?.(0);

  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    throw new Error(error.message);
  }

  onProgress?.(100);
}

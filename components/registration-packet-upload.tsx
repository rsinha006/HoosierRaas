"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RegistrationPacketFileField from "@/components/registration-packet-file-field";
import {
  REGISTRATION_PACKETS_BUCKET,
  formatPacketUploadedAt,
  getPacketFilename,
  getPacketStoragePath,
  MAX_PACKET_MB,
  validateRegistrationPacket,
} from "@/lib/registration-packets";
import { uploadRegistrationPacket } from "@/lib/upload-registration-packet";
import {
  toUserFacingSaveError,
  toUserFacingStorageError,
} from "@/lib/user-facing-errors";

type RegistrationPacketUploadProps = {
  competitionId: string;
  packetUrl: string | null;
  packetUploadedAt: string | null;
  canWrite: boolean;
};

export default function RegistrationPacketUpload({
  competitionId,
  packetUrl,
  packetUploadedAt,
  canWrite,
}: RegistrationPacketUploadProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replacing, setReplacing] = useState(false);
  const [opening, setOpening] = useState(false);

  const hasExistingPacket = Boolean(packetUrl);

  async function openExistingPacket() {
    if (!packetUrl) {
      return;
    }

    setOpening(true);
    setSaveError(null);

    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(REGISTRATION_PACKETS_BUCKET)
      .createSignedUrl(packetUrl, 3600);

    setOpening(false);

    if (error || !data?.signedUrl) {
      setSaveError(toUserFacingStorageError(error ?? new Error("not found")));
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleUpload() {
    setFieldError(null);
    setSaveError(null);

    const validationError = validateRegistrationPacket(selectedFile);
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    if (!selectedFile) {
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const supabase = createClient();
      const storagePath = getPacketStoragePath(competitionId, selectedFile.name);
      const uploadedAt = new Date().toISOString();

      await uploadRegistrationPacket({
        supabase,
        path: storagePath,
        file: selectedFile,
        onProgress: setProgress,
      });

      if (packetUrl && packetUrl !== storagePath) {
        await supabase.storage.from(REGISTRATION_PACKETS_BUCKET).remove([packetUrl]);
      }

      const { error } = await supabase
        .from("competitions")
        .update({
          packet_url: storagePath,
          packet_uploaded_at: uploadedAt,
        })
        .eq("id", competitionId);

      if (error) {
        throw new Error(error.message);
      }

      setSelectedFile(null);
      setReplacing(false);
      router.refresh();
    } catch (error) {
      setSaveError(toUserFacingSaveError(error));
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-zinc-900">Registration packet</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Upload the competition registration packet as a PDF (max {MAX_PACKET_MB} MB).
      </p>

      {hasExistingPacket ? (
        <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-900">Current file</p>
          <p className="mt-1 text-sm text-zinc-700">
            {getPacketFilename(packetUrl!)}
          </p>
          {packetUploadedAt ? (
            <p className="mt-1 text-xs text-zinc-500">
              Uploaded {formatPacketUploadedAt(packetUploadedAt)}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openExistingPacket}
              disabled={opening}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white disabled:opacity-60"
            >
              {opening ? "Opening..." : "View PDF"}
            </button>
            {canWrite ? (
              <button
                type="button"
                onClick={() => {
                  setReplacing((current) => !current);
                  setFieldError(null);
                  setSaveError(null);
                  setSelectedFile(null);
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white"
              >
                {replacing ? "Cancel replace" : "Replace file"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {canWrite && (!hasExistingPacket || replacing) ? (
        <div className="mt-5 space-y-4">
          <RegistrationPacketFileField
            id="registration-packet-replace"
            label={hasExistingPacket ? "Replacement PDF" : "PDF file"}
            selectedFile={selectedFile}
            onFileChange={(file) => {
              setSelectedFile(file);
              setFieldError(null);
              setSaveError(null);
            }}
            error={fieldError}
          />

          {loading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-[#990000] transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleUpload}
            disabled={loading || !selectedFile}
            className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Uploading..."
              : hasExistingPacket
                ? "Upload replacement"
                : "Upload packet"}
          </button>
        </div>
      ) : null}

      {!canWrite && !hasExistingPacket ? (
        <p className="mt-5 text-sm text-zinc-500">
          No registration packet uploaded yet.
        </p>
      ) : null}

      {saveError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}
    </section>
  );
}

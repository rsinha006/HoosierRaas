import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PACKET_MIME_TYPE,
  REGISTRATION_PACKETS_BUCKET,
} from "@/lib/registration-packets";

type UploadRegistrationPacketOptions = {
  supabase: SupabaseClient;
  path: string;
  file: File;
  onProgress: (percent: number) => void;
};

export async function uploadRegistrationPacket({
  supabase,
  path,
  file,
  onProgress,
}: UploadRegistrationPacketOptions) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("You must be signed in to upload a registration packet.");
  }

  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${REGISTRATION_PACKETS_BUCKET}/${encodedPath}`;

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      try {
        const response = JSON.parse(xhr.responseText) as { message?: string };
        reject(new Error(response.message ?? "Upload failed."));
      } catch {
        reject(new Error("Upload failed."));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed. Check your connection and try again."));
    });

    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", supabaseAnonKey);
    xhr.setRequestHeader("Content-Type", PACKET_MIME_TYPE);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.send(file);
  });
}

export const REGISTRATION_PACKETS_BUCKET = "registration-packets";

export const MAX_PACKET_MB = 50;

export const MAX_PACKET_BYTES = MAX_PACKET_MB * 1024 * 1024;

export const PACKET_MIME_TYPE = "application/pdf";

export function validateRegistrationPacket(file: File | null) {
  if (!file) {
    return "Please select a PDF file.";
  }

  if (file.type !== PACKET_MIME_TYPE) {
    return "Only PDF files are allowed.";
  }

  if (file.size > MAX_PACKET_BYTES) {
    return `File must be ${MAX_PACKET_MB} MB or smaller.`;
  }

  return null;
}

export function sanitizePacketFilename(filename: string) {
  return filename
    .trim()
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, "-");
}

export function getPacketStoragePath(competitionId: string, filename: string) {
  return `${competitionId}/${sanitizePacketFilename(filename)}`;
}

export function getPacketFilename(path: string) {
  return path.split("/").pop() ?? path;
}

export function formatPacketUploadedAt(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

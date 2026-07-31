export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "2XL"] as const;

export type ClothingSize = (typeof CLOTHING_SIZES)[number];

export type OnboardingRole = "dancer" | "production";

export type OnboardingFileField =
  | "government_id"
  | "birthday_image"
  | "student_id"
  | "covid_vaccination";

export const ONBOARDING_STORAGE_BUCKET = "member-documents";

export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function getGraduationYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, index) => currentYear + index);
}

export function isValidIuEmail(email: string) {
  return /^[^\s@]+@iu\.edu$/i.test(email.trim());
}

export function normalizeOptionalText(value: string, fallback = "None") {
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function validateUploadFile(
  file: File | null,
  options?: { required?: boolean },
) {
  if (!file) {
    return options?.required ? "This file is required." : null;
  }

  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    return "File must be a JPG, PNG, WEBP, HEIC, or PDF.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return "File must be 10 MB or smaller.";
  }

  return null;
}

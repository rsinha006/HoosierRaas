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

export function mergeOnboardingRoles(
  existingRoles: string[] | null | undefined,
  onboardingRoles: OnboardingRole[],
) {
  const preserved = (Array.isArray(existingRoles) ? existingRoles : []).filter(
    (role) => role !== "dancer" && role !== "production",
  );

  return [...new Set([...preserved, ...onboardingRoles])];
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

export const ONBOARDING_DRAFT_STORAGE_KEY = "hros-onboarding-draft";

/** Everything in the onboarding form except the four uploaded files —
 *  a File can't be serialized to localStorage, so a resumed draft always
 *  needs those re-attached. Using localStorage rather than sessionStorage
 *  because this form is commonly filled out on a phone, where the browser
 *  itself (not just the tab) is liable to get killed by the OS mid-session. */
export type OnboardingDraftState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  graduationYear: string;
  dietaryRestrictions: string;
  medicalConditions: string;
  shirtSize: ClothingSize | "";
  pantsSize: ClothingSize | "";
  drinksAlcohol: "yes" | "no" | "";
  emergencyContactName: string;
  emergencyContactPhone: string;
  roles: OnboardingRole[];
  step: number;
};

export function saveOnboardingDraft(state: OnboardingDraftState) {
  localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(state));
}

export function loadOnboardingDraft(): OnboardingDraftState | null {
  const raw = localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OnboardingDraftState;
  } catch {
    return null;
  }
}

export function clearOnboardingDraft() {
  localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
}

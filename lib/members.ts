export type Member = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  graduation_year: number;
  status: "active" | "inactive" | "alumni";
  roles: string[];
  exec_title: string | null;
  dietary_restrictions?: string | null;
  medical_conditions?: string | null;
  shirt_size?: string | null;
  pants_size?: string | null;
  government_id_path?: string | null;
  birthday_image_path?: string | null;
  student_id_path?: string | null;
  covid_vaccination_path?: string | null;
  drinks_alcohol?: boolean | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  pending_review?: boolean;
};

export type MemberStatus = Member["status"];
export type MemberRole = "dancer" | "exec" | "production";
export type ExecTitle = "captain" | "team_manager" | "finance";

export const MEMBER_STATUSES: MemberStatus[] = ["active", "inactive", "alumni"];

export const MEMBER_ROLES: MemberRole[] = ["dancer", "exec", "production"];

export const EXEC_TITLES: { value: ExecTitle; label: string }[] = [
  { value: "captain", label: "Captain" },
  { value: "team_manager", label: "Team Manager" },
  { value: "finance", label: "Finance" },
];

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Accepts a 10-digit US number (or 11 with a leading 1), any punctuation —
 *  "317-555-0100", "(317) 555-0100", "3175550100" all pass. */
export function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

/** Normalizes any accepted phone format to "(317) 555-0100" so the roster is
 *  consistent regardless of how it was typed in. */
export function formatPhoneForStorage(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const tenDigits = digits.length === 11 ? digits.slice(1) : digits;

  if (tenDigits.length !== 10) {
    return phone.trim();
  }

  return `(${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
}

export function formatMemberName(member: Pick<Member, "first_name" | "last_name">) {
  return `${member.first_name} ${member.last_name}`;
}

export function formatExecTitle(title: string | null) {
  if (!title) return null;

  return title
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

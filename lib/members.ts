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
export type ExecTitle =
  | "captain"
  | "team_manager"
  | "finance"
  | "marketing"
  | "social";

export const MEMBER_STATUSES: MemberStatus[] = ["active", "inactive", "alumni"];

export const MEMBER_ROLES: MemberRole[] = ["dancer", "exec", "production"];

export const EXEC_TITLES: { value: ExecTitle; label: string }[] = [
  { value: "captain", label: "Captain" },
  { value: "team_manager", label: "Team Manager" },
  { value: "finance", label: "Finance" },
  { value: "marketing", label: "Marketing" },
  { value: "social", label: "Social" },
];

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

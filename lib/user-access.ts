import type { UserMember } from "@/lib/get-user-member";

export function hasAppAccess(member: UserMember | null): boolean {
  return !!member?.exec_title && member.roles.includes("exec");
}

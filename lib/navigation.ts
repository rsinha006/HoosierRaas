export type AppModule = {
  name: string;
  href: string;
  description: string;
};

export const APP_MODULES: AppModule[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    description: "HROS home",
  },
  {
    name: "Team Manager",
    href: "/team-manager",
    description: "Competition logistics, attendance, member management",
  },
  {
    name: "Finance",
    href: "/finance",
    description: "Budget, expenses, reimbursements",
  },
  {
    name: "Attendance",
    href: "/attendance",
    description: "Practice sessions, video submissions",
  },
  {
    name: "Calendar",
    href: "/calendar",
    description: "Marketing, social, production task calendars",
  },
  {
    name: "Members",
    href: "/members",
    description: "Roster management",
  },
];

import {
  formatCurrency,
  sumApprovedExpenses,
  type ExpenseRequest,
  type IncomeEntry,
} from "@/lib/finance";
import type { MemberStatus } from "@/lib/members";
import type { AssignableExecTitle } from "@/lib/users";
import { ASSIGNABLE_EXEC_TITLES } from "@/lib/users";

export type ArchiveRosterMember = {
  memberId: string;
  name: string;
  email: string;
  status: MemberStatus;
  execTitle: AssignableExecTitle | null;
  hasExecRole: boolean;
  hasLogin: boolean;
};

export type ArchiveMemberDecision = {
  member_id: string;
  status: MemberStatus;
  next_exec_title: AssignableExecTitle | null;
  delete_login: boolean;
};

export type ArchiveSeasonPayload = {
  activeSeasonLabel: string;
  members: ArchiveMemberDecision[];
};

export type ArchiveFinancePreview = {
  budgetCount: number;
  lineItemCount: number;
  endingBalance: number;
  nextSeasonLabel: string;
};

export type ArchiveAccessChoice = {
  memberId: string;
  name: string;
  email: string;
  currentExecTitle: AssignableExecTitle | null;
  nextExecTitle: AssignableExecTitle | "none";
  deleteLogin: boolean;
};

export type ArchiveReviewSummary = {
  nextSeasonLabel: string;
  budgetCount: number;
  lineItemCount: number;
  endingBalance: number;
  carryoverDescription: string;
  accessChanges: Array<{
    name: string;
    from: string;
    to: string;
  }>;
  loginsToDelete: string[];
};

export function isAssignableExecTitleValue(
  value: string | null | undefined,
): value is AssignableExecTitle {
  return ASSIGNABLE_EXEC_TITLES.some((title) => title.value === value);
}

export function memberHasExecAccess(member: ArchiveRosterMember) {
  return member.hasExecRole && member.execTitle !== null && member.hasLogin;
}

export function getAccessEligibleMembers(
  roster: ArchiveRosterMember[],
  statusByMemberId: Record<string, MemberStatus>,
) {
  return roster.filter(
    (member) =>
      statusByMemberId[member.memberId] !== "alumni" &&
      memberHasExecAccess(member),
  );
}

export function buildInitialStatusChoices(roster: ArchiveRosterMember[]) {
  return Object.fromEntries(
    roster.map((member) => [member.memberId, member.status]),
  ) as Record<string, MemberStatus>;
}

export function buildInitialAccessChoices(eligible: ArchiveRosterMember[]) {
  return Object.fromEntries(
    eligible.map((member) => [
      member.memberId,
      {
        nextExecTitle: member.execTitle ?? ("none" as const),
        deleteLogin: false,
      },
    ]),
  ) as Record<
    string,
    { nextExecTitle: AssignableExecTitle | "none"; deleteLogin: boolean }
  >;
}

export function buildArchivePayload(
  roster: ArchiveRosterMember[],
  statusByMemberId: Record<string, MemberStatus>,
  accessChoices: Record<
    string,
    { nextExecTitle: AssignableExecTitle | "none"; deleteLogin: boolean }
  >,
  activeSeasonLabel: string,
): ArchiveSeasonPayload {
  const members: ArchiveMemberDecision[] = roster.map((member) => {
    const status = statusByMemberId[member.memberId] ?? member.status;
    const access = accessChoices[member.memberId];

    if (status === "alumni") {
      return {
        member_id: member.memberId,
        status,
        next_exec_title: null,
        delete_login: member.hasLogin,
      };
    }

    const nextExecTitle =
      access?.nextExecTitle && access.nextExecTitle !== "none"
        ? access.nextExecTitle
        : null;

    return {
      member_id: member.memberId,
      status,
      next_exec_title: nextExecTitle,
      delete_login: access?.deleteLogin ?? false,
    };
  });

  return {
    activeSeasonLabel,
    members,
  };
}

export function buildArchiveReviewSummary(
  roster: ArchiveRosterMember[],
  statusByMemberId: Record<string, MemberStatus>,
  accessChoices: Record<
    string,
    { nextExecTitle: AssignableExecTitle | "none"; deleteLogin: boolean }
  >,
  financePreview: ArchiveFinancePreview,
): ArchiveReviewSummary {
  const eligible = getAccessEligibleMembers(roster, statusByMemberId);
  const execTitleLabel = (value: AssignableExecTitle | "none" | null) => {
    if (!value || value === "none") {
      return "None";
    }

    return (
      ASSIGNABLE_EXEC_TITLES.find((title) => title.value === value)?.label ?? value
    );
  };

  const accessChanges = eligible
    .map((member) => {
      const choice = accessChoices[member.memberId];
      const nextValue = choice?.nextExecTitle ?? "none";
      const currentValue = member.execTitle ?? "none";

      if (currentValue === nextValue) {
        return null;
      }

      return {
        name: member.name,
        from: execTitleLabel(currentValue),
        to: execTitleLabel(nextValue),
      };
    })
    .filter((change): change is NonNullable<typeof change> => change !== null);

  const loginsToDelete = [
    ...roster
      .filter(
        (member) =>
          statusByMemberId[member.memberId] === "alumni" && member.hasLogin,
      )
      .map((member) => member.email),
    ...eligible
      .filter((member) => accessChoices[member.memberId]?.deleteLogin)
      .map((member) => member.email),
  ].filter((email, index, emails) => emails.indexOf(email) === index);

  let carryoverDescription = "No carryover entry will be created (balance is zero).";

  if (financePreview.endingBalance > 0) {
    carryoverDescription = `${formatCurrency(financePreview.endingBalance)} surplus will be recorded as Previous Year Carryover income in ${financePreview.nextSeasonLabel}.`;
  } else if (financePreview.endingBalance < 0) {
    carryoverDescription = `${formatCurrency(Math.abs(financePreview.endingBalance))} debt will be recorded as a Last Year's Debt budget line in ${financePreview.nextSeasonLabel}.`;
  }

  return {
    nextSeasonLabel: financePreview.nextSeasonLabel,
    budgetCount: financePreview.budgetCount,
    lineItemCount: financePreview.lineItemCount,
    endingBalance: financePreview.endingBalance,
    carryoverDescription,
    accessChanges,
    loginsToDelete,
  };
}

export function computeSeasonEndingBalance(
  incomeEntries: Pick<IncomeEntry, "amount">[],
  approvedExpenses: Pick<ExpenseRequest, "amount">[],
) {
  const totalIncome = incomeEntries.reduce(
    (sum, entry) => sum + Number(entry.amount),
    0,
  );
  const approvedTotal = sumApprovedExpenses(approvedExpenses);
  return totalIncome - approvedTotal;
}

export const INCOME_CATEGORIES = [
  { value: "dues", label: "Dues" },
  { value: "iufb", label: "IUFB" },
  { value: "sponsorships", label: "Sponsorships" },
  { value: "dine-in fundraisers", label: "Dine-in Fundraisers" },
  { value: "tabling", label: "Tabling" },
  { value: "garba", label: "Garba" },
  { value: "donations", label: "Donations" },
  { value: "costume_rental", label: "Costume Rental" },
  { value: "previous_year_carryover", label: "Previous Year Carryover" },
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]["value"];

export type IncomeEntry = {
  id: string;
  created_at: string;
  season: string;
  source: string;
  amount: number;
  category: IncomeCategory;
  date_applied: string;
  date_received: string;
  payment_method: string | null;
  notes: string | null;
  member_id: string | null;
};

export type Budget = {
  id: string;
  season: string;
  category: ExpenseCategory;
  allocated_amount: number;
  created_at: string;
};

export const EXPENSE_CATEGORIES = [
  { value: "team_reg_fees", label: "Team Registration Fees" },
  { value: "hotels", label: "Hotels" },
  { value: "transportation", label: "Transportation" },
  { value: "costumes", label: "Costumes" },
  { value: "production", label: "Production" },
  { value: "merch", label: "Merch" },
  { value: "dj", label: "DJ" },
  { value: "gas", label: "Gas" },
  { value: "socials", label: "Socials" },
  { value: "miscellaneous", label: "Miscellaneous" },
  { value: "during_comp_expenses", label: "During Comp Expenses" },
  { value: "last_years_debt", label: "Last Year's Debt" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];

export type IufbLineItem = {
  id: string;
  season: string;
  description: string;
  approved_amount: number;
  spent_amount: number;
  created_at: string;
};

export type ExpenseRequestStatus = "pending" | "approved" | "denied";

export type ExpenseRequest = {
  id: string;
  created_at: string;
  season: string;
  description: string;
  amount: number;
  category: ExpenseCategory | null;
  iufb_line_item_id: string | null;
  competition_id: string | null;
  requester_member_id: string;
  justification: string;
  status: ExpenseRequestStatus;
  denial_reason: string | null;
  approved_at: string | null;
  approved_by_member_id: string | null;
};

export type ExpenseRequestWithRelations = ExpenseRequest & {
  requester: { first_name: string; last_name: string } | null;
  competition: { name: string } | null;
  iufb_line_item: Pick<
    IufbLineItem,
    "id" | "description" | "approved_amount" | "spent_amount"
  > | null;
};

export type ExpenseFundingPool = "general_pool" | "iufb";

export type PopulatedGeneralPoolCategory = {
  value: ExpenseCategory;
  label: string;
  allocated: number;
};

export type PopulatedIufbLineItemOption = Pick<
  IufbLineItem,
  "id" | "description" | "approved_amount" | "spent_amount"
>;

export function buildPopulatedGeneralPoolCategories(
  budgets: Pick<Budget, "category" | "allocated_amount">[],
) {
  return budgets
    .filter((budget) => Number(budget.allocated_amount) > 0)
    .map((budget) => ({
      value: budget.category,
      label: getExpenseCategoryLabel(budget.category),
      allocated: Number(budget.allocated_amount),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function buildPopulatedIufbLineItems(
  lineItems: PopulatedIufbLineItemOption[],
) {
  return lineItems
    .filter((item) => Number(item.approved_amount) > 0)
    .sort((left, right) => left.description.localeCompare(right.description));
}

export function getIufbLineItemSummary(
  lineItem: Pick<IufbLineItem, "approved_amount" | "spent_amount">,
) {
  const allocated = Number(lineItem.approved_amount);
  const spent = Number(lineItem.spent_amount);

  return {
    allocated,
    spent,
    remaining: allocated - spent,
  };
}

export function getExpenseRequestFundingLabel(
  request: Pick<ExpenseRequest, "category" | "iufb_line_item_id"> & {
    iufb_line_item?: Pick<IufbLineItem, "description"> | null;
  },
) {
  if (request.iufb_line_item_id && request.iufb_line_item) {
    return `IUFB · ${request.iufb_line_item.description}`;
  }

  if (request.category) {
    return getExpenseCategoryLabel(request.category);
  }

  return "Unknown category";
}

export type CategoryReimbursement = { category: string; amount: number | string };

export function getCategoryBudgetSummary(
  category: ExpenseCategory,
  budgets: Pick<Budget, "category" | "allocated_amount">[],
  approvedRequests: Pick<ExpenseRequest, "category" | "amount" | "iufb_line_item_id">[],
  paidReimbursements: CategoryReimbursement[] = [],
) {
  const allocated =
    Number(
      budgets.find((budget) => budget.category === category)?.allocated_amount,
    ) || 0;
  const spentOnExpenses = approvedRequests
    .filter(
      (request) => request.category === category && !request.iufb_line_item_id,
    )
    .reduce((sum, request) => sum + Number(request.amount), 0);
  const spentOnReimbursements = paidReimbursements
    .filter((reimbursement) => reimbursement.category === category)
    .reduce((sum, reimbursement) => sum + Number(reimbursement.amount), 0);
  const spent = spentOnExpenses + spentOnReimbursements;

  return {
    allocated,
    spent,
    remaining: allocated - spent,
  };
}

export function getBudgetOverage(amount: number, remaining: number) {
  if (amount <= remaining) {
    return null;
  }

  return amount - remaining;
}

export function sumApprovedExpenses(
  requests: Pick<ExpenseRequest, "amount">[],
) {
  return requests.reduce((sum, request) => sum + Number(request.amount), 0);
}

export function sumAmounts(items: { amount: number | string }[]) {
  return items.reduce((sum, item) => sum + Number(item.amount), 0);
}

/** Approved expenses charged to the general pool — excludes anything funded by an IUFB line item. */
export function sumGeneralPoolApprovedExpenses(
  requests: Pick<ExpenseRequest, "amount" | "iufb_line_item_id">[],
) {
  return requests
    .filter((request) => !request.iufb_line_item_id)
    .reduce((sum, request) => sum + Number(request.amount), 0);
}

/** Paid reimbursements always come out of the general pool — there is no IUFB reimbursement path. */
export function sumPaidReimbursements(
  reimbursements: { amount: number | string }[],
) {
  return reimbursements.reduce((sum, item) => sum + Number(item.amount), 0);
}

/** Income categories that feed the general pool (everything except IUFB). */
export const GENERAL_POOL_INCOME_CATEGORIES: IncomeCategory[] =
  INCOME_CATEGORIES.filter((category) => category.value !== "iufb").map(
    (category) => category.value,
  );

export function getExpenseCategoryLabel(category: ExpenseCategory) {
  return (
    EXPENSE_CATEGORIES.find((item) => item.value === category)?.label ??
    category
  );
}

export function sumGeneralPoolIncome(
  entries: Pick<IncomeEntry, "amount" | "category">[],
) {
  return entries
    .filter((entry) => entry.category !== "iufb")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
}

export function sumIufbIncome(
  entries: Pick<IncomeEntry, "amount" | "category">[],
) {
  return entries
    .filter((entry) => entry.category === "iufb")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
}

export function buildCategoryBudgetRows(
  budgets: Pick<Budget, "category" | "allocated_amount">[],
  approvedRequests: Pick<ExpenseRequest, "category" | "amount" | "iufb_line_item_id">[] = [],
  paidReimbursements: CategoryReimbursement[] = [],
) {
  return EXPENSE_CATEGORIES.map((category) => {
    const summary = getCategoryBudgetSummary(
      category.value,
      budgets,
      approvedRequests,
      paidReimbursements,
    );

    return {
      category: category.value,
      label: category.label,
      allocated: summary.allocated,
      spent: summary.spent,
      remaining: summary.remaining,
    };
  });
}

export type ActiveMemberOption = {
  id: string;
  first_name: string;
  last_name: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function getIncomeCategoryLabel(category: IncomeCategory) {
  return (
    INCOME_CATEGORIES.find((item) => item.value === category)?.label ?? category
  );
}

/** Academic season label, e.g. "2025-2026" (Aug 1 through Jul 31). */
export function getCurrentSeason(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;

  if (month >= 8) {
    return `${year}-${year + 1}`;
  }

  return `${year - 1}-${year}`;
}

export function getSeasonDateRange(season: string) {
  const [startYearText] = season.split("-");
  const startYear = Number(startYearText);

  return {
    start: `${startYear}-08-01`,
    end: `${startYear + 1}-07-31`,
  };
}

export function isDateInSeason(date: string, season: string) {
  const { start, end } = getSeasonDateRange(season);
  return date >= start && date <= end;
}

export function sumIncomeByCategory(
  entries: Pick<IncomeEntry, "amount" | "category">[],
) {
  const totals = new Map<IncomeCategory, number>();

  for (const category of INCOME_CATEGORIES) {
    totals.set(category.value, 0);
  }

  for (const entry of entries) {
    totals.set(
      entry.category,
      (totals.get(entry.category) ?? 0) + Number(entry.amount),
    );
  }

  return INCOME_CATEGORIES.map((category) => ({
    category: category.value,
    label: category.label,
    amount: totals.get(category.value) ?? 0,
  }));
}

export function getSeasonTimestampBounds(season: string) {
  const { start, end } = getSeasonDateRange(season);

  return {
    start: `${start}T00:00:00.000Z`,
    end: `${end}T23:59:59.999Z`,
  };
}

/** @deprecated Prefer sumApprovedExpenses with loaded expense requests. */
export function getApprovedExpensesTotal() {
  return 0;
}

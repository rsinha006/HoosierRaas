import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Income categories that feed the General Pool ledger (excludes IUFB and system-only slugs). */
export const GENERAL_POOL_INCOME_CATEGORY_SLUGS = [
  "dues",
  "sponsorships",
  "dine-in fundraisers",
  "tabling",
  "garba",
  "donations",
  "costume_rental",
] as const;

/** Dedicated member-linked dues table — not present in current migrations. */
export const MEMBER_DUES_PAYMENT_TABLE: string | null = null;

export type GeneralPoolLedgerRow = {
  date: string;
  kind: "income" | "expense";
  description: string;
  category: string;
  amount: number;
  runningBalance: number;
};

export type CategoryBudgetRow = {
  category: string;
  label: string;
  allocated: number;
  spent: number;
  remaining: number;
};

export type IufbEnvelopeRow = {
  description: string;
  approved: number;
  spent: number;
  remaining: number;
};

export type MemberWorkbookRow = {
  fullName: string;
  email: string;
  phone: string;
  graduationYear: number;
  roles: string;
  execTitle: string | null;
  apparelSize: string;
  dietaryRestrictions: string | null;
  medicalConditions: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  duesStatus: "Paid" | "Unpaid" | "Not tracked";
};

export type FinanceWorkbookData = {
  season: string;
  generalPool: GeneralPoolLedgerRow[];
  categoryBudgets: CategoryBudgetRow[];
  iufbEnvelope: IufbEnvelopeRow[];
};

export type MemberWorkbookData = {
  season: string;
  members: MemberWorkbookRow[];
};

export type WorkbookData = {
  finance: FinanceWorkbookData;
  member: MemberWorkbookData;
};

type IncomeEntryRow = {
  id: string;
  source: string;
  amount: number;
  category: string;
  date_received: string;
};

type ApprovedExpenseRow = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  approved_at: string | null;
  created_at: string;
  iufb_line_item_id: string | null;
};

type BudgetRow = {
  category: string;
  allocated_amount: number;
};

type ExpenseCategoryRow = {
  slug: string;
  label: string;
  sort_order: number;
};

type IncomeCategoryRow = {
  slug: string;
  label: string;
};

type IufbLineItemRow = {
  description: string;
  approved_amount: number;
  spent_amount: number;
};

type SeasonMembershipMemberRow = {
  exec_title: string | null;
  members: MemberRow | MemberRow[];
};

type MemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  graduation_year: number;
  roles: string[] | null;
  shirt_size: string | null;
  pants_size: string | null;
  dietary_restrictions: string | null;
  medical_conditions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

type LedgerEvent = {
  date: string;
  kind: "income" | "expense";
  description: string;
  category: string;
  amount: number;
};

function toNumber(value: number | string): number {
  return Number(value);
}

function getJoinedMember(row: SeasonMembershipMemberRow): MemberRow {
  return Array.isArray(row.members) ? row.members[0]! : row.members;
}

function formatApparelSize(
  shirtSize: string | null,
  pantsSize: string | null,
): string {
  const parts: string[] = [];

  if (shirtSize) {
    parts.push(`Shirt: ${shirtSize}`);
  }

  if (pantsSize) {
    parts.push(`Pants: ${pantsSize}`);
  }

  return parts.length > 0 ? parts.join(", ") : "";
}

function formatRoles(roles: string[] | null): string {
  return (roles ?? []).join(", ");
}

function getIncomeCategoryLabel(
  slug: string,
  categories: IncomeCategoryRow[],
): string {
  return categories.find((category) => category.slug === slug)?.label ?? slug;
}

function getExpenseCategoryLabel(
  slug: string,
  categories: ExpenseCategoryRow[],
): string {
  return categories.find((category) => category.slug === slug)?.label ?? slug;
}

function buildGeneralPoolLedger(
  incomeRows: IncomeEntryRow[],
  approvedGeneralPoolExpenses: ApprovedExpenseRow[],
  incomeCategories: IncomeCategoryRow[],
  expenseCategories: ExpenseCategoryRow[],
): GeneralPoolLedgerRow[] {
  const events: LedgerEvent[] = [];

  for (const entry of incomeRows) {
    events.push({
      date: entry.date_received,
      kind: "income",
      description: entry.source,
      category: getIncomeCategoryLabel(entry.category, incomeCategories),
      amount: toNumber(entry.amount),
    });
  }

  for (const expense of approvedGeneralPoolExpenses) {
    events.push({
      date: expense.approved_at ?? expense.created_at.slice(0, 10),
      kind: "expense",
      description: expense.description,
      category: getExpenseCategoryLabel(
        expense.category ?? "unknown",
        expenseCategories,
      ),
      amount: toNumber(expense.amount),
    });
  }

  events.sort((left, right) => {
    const dateCompare = left.date.localeCompare(right.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    if (left.kind !== right.kind) {
      return left.kind === "income" ? -1 : 1;
    }

    return left.description.localeCompare(right.description);
  });

  let runningBalance = 0;

  return events.map((event) => {
    if (event.kind === "income") {
      runningBalance += event.amount;
    } else {
      runningBalance -= event.amount;
    }

    return {
      date: event.date,
      kind: event.kind,
      description: event.description,
      category: event.category,
      amount: event.amount,
      runningBalance,
    };
  });
}

function buildCategoryBudgetRows(
  budgets: BudgetRow[],
  approvedExpenses: ApprovedExpenseRow[],
  expenseCategories: ExpenseCategoryRow[],
): CategoryBudgetRow[] {
  const categories = expenseCategories.length > 0
    ? [...expenseCategories].sort(
      (left, right) => left.sort_order - right.sort_order,
    )
    : [...new Set(budgets.map((budget) => budget.category))].map(
      (slug, index) => ({
        slug,
        label: slug,
        sort_order: index,
      }),
    );

  return categories.map((category) => {
    const allocated = toNumber(
      budgets.find((budget) => budget.category === category.slug)
        ?.allocated_amount ?? 0,
    );
    const spent = approvedExpenses
      .filter(
        (request) =>
          request.category === category.slug &&
          !request.iufb_line_item_id,
      )
      .reduce((sum, request) => sum + toNumber(request.amount), 0);

    return {
      category: category.slug,
      label: category.label,
      allocated,
      spent,
      remaining: allocated - spent,
    };
  });
}

function buildIufbEnvelopeRows(lineItems: IufbLineItemRow[]): IufbEnvelopeRow[] {
  return [...lineItems]
    .sort((left, right) => left.description.localeCompare(right.description))
    .map((item) => {
      const approved = toNumber(item.approved_amount);
      const spent = toNumber(item.spent_amount);

      return {
        description: item.description,
        approved,
        spent,
        remaining: approved - spent,
      };
    });
}

function resolveDuesStatus(): MemberWorkbookRow["duesStatus"] {
  return "Not tracked";
}

export async function loadActiveSeasonLabel(
  supabase: SupabaseClient,
): Promise<string> {
  const { data, error } = await supabase
    .from("seasons")
    .select("label")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active season: ${error.message}`);
  }

  if (!data?.label) {
    throw new Error("No active season configured.");
  }

  return data.label;
}

export async function buildFinanceWorkbookData(
  supabase: SupabaseClient,
  season: string,
): Promise<FinanceWorkbookData> {
  const [
    { data: incomeData, error: incomeError },
    { data: approvedExpenseData, error: approvedExpenseError },
    { data: budgetData, error: budgetError },
    { data: iufbData, error: iufbError },
    { data: incomeCategoryData, error: incomeCategoryError },
    { data: expenseCategoryData, error: expenseCategoryError },
  ] = await Promise.all([
    supabase
      .from("income_entries")
      .select("id, source, amount, category, date_received")
      .eq("season", season)
      .in("category", [...GENERAL_POOL_INCOME_CATEGORY_SLUGS])
      .order("date_received", { ascending: true }),
    supabase
      .from("expense_requests")
      .select(
        "id, description, amount, category, approved_at, created_at, iufb_line_item_id",
      )
      .eq("season", season)
      .eq("status", "approved")
      .order("approved_at", { ascending: true }),
    supabase
      .from("budgets")
      .select("category, allocated_amount")
      .eq("season", season),
    supabase
      .from("iufb_line_items")
      .select("description, approved_amount, spent_amount")
      .eq("season", season),
    supabase
      .from("income_categories")
      .select("slug, label")
      .eq("season", season),
    supabase
      .from("expense_categories")
      .select("slug, label, sort_order")
      .eq("season", season)
      .order("sort_order", { ascending: true }),
  ]);

  const queryErrors = [
    ["income_entries", incomeError],
    ["expense_requests", approvedExpenseError],
    ["budgets", budgetError],
    ["iufb_line_items", iufbError],
    ["income_categories", incomeCategoryError],
    ["expense_categories", expenseCategoryError],
  ].filter(([, error]) => error);

  if (queryErrors.length > 0) {
    const details = queryErrors
      .map(([table, error]) => `${table}: ${error!.message}`)
      .join("; ");

    throw new Error(`Finance workbook queries failed: ${details}`);
  }

  const incomeRows = (incomeData ?? []) as IncomeEntryRow[];
  const approvedExpenses = (approvedExpenseData ?? []) as ApprovedExpenseRow[];
  const approvedGeneralPoolExpenses = approvedExpenses.filter(
    (request) => request.iufb_line_item_id === null && request.category !== null,
  );
  const incomeCategories = (incomeCategoryData ?? []) as IncomeCategoryRow[];
  const expenseCategories = (expenseCategoryData ?? []) as ExpenseCategoryRow[];

  return {
    season,
    generalPool: buildGeneralPoolLedger(
      incomeRows,
      approvedGeneralPoolExpenses,
      incomeCategories,
      expenseCategories,
    ),
    categoryBudgets: buildCategoryBudgetRows(
      (budgetData ?? []) as BudgetRow[],
      approvedExpenses,
      expenseCategories,
    ),
    iufbEnvelope: buildIufbEnvelopeRows(
      (iufbData ?? []) as IufbLineItemRow[],
    ),
  };
}

export async function buildMemberWorkbookData(
  supabase: SupabaseClient,
  season: string,
): Promise<MemberWorkbookData> {
  if (!MEMBER_DUES_PAYMENT_TABLE) {
    console.warn(
      "drive-sync: member dues status is not wired up — no member-linked dues-payment table exists in the schema. Emitting dues_status='Not tracked' for all rows.",
    );
  }

  const { data, error } = await supabase
    .from("season_memberships")
    .select(`
      exec_title,
      members!inner (
        id,
        first_name,
        last_name,
        email,
        phone,
        graduation_year,
        roles,
        shirt_size,
        pants_size,
        dietary_restrictions,
        medical_conditions,
        emergency_contact_name,
        emergency_contact_phone
      )
    `)
    .eq("season", season)
    .eq("status", "active")
    .eq("members.pending_review", false);

  if (error) {
    throw new Error(`Member workbook query failed: ${error.message}`);
  }

  const members = ((data ?? []) as SeasonMembershipMemberRow[])
    .map((row) => {
      const member = getJoinedMember(row);

      return {
        fullName: `${member.first_name} ${member.last_name}`.trim(),
        email: member.email,
        phone: member.phone,
        graduationYear: member.graduation_year,
        roles: formatRoles(member.roles),
        execTitle: row.exec_title,
        apparelSize: formatApparelSize(member.shirt_size, member.pants_size),
        dietaryRestrictions: member.dietary_restrictions,
        medicalConditions: member.medical_conditions,
        emergencyContactName: member.emergency_contact_name,
        emergencyContactPhone: member.emergency_contact_phone,
        duesStatus: resolveDuesStatus(),
      } satisfies MemberWorkbookRow;
    })
    .sort((left, right) => left.fullName.localeCompare(right.fullName));

  return {
    season,
    members,
  };
}

export async function buildWorkbookData(
  supabase: SupabaseClient,
): Promise<WorkbookData> {
  const season = await loadActiveSeasonLabel(supabase);

  const [finance, member] = await Promise.all([
    buildFinanceWorkbookData(supabase, season),
    buildMemberWorkbookData(supabase, season),
  ]);

  return { finance, member };
}

export function logWorkbookData(data: WorkbookData): void {
  console.log("drive-sync workbook data (finance.generalPool):", {
    season: data.finance.season,
    rowCount: data.finance.generalPool.length,
    rows: data.finance.generalPool,
  });

  console.log("drive-sync workbook data (finance.categoryBudgets):", {
    season: data.finance.season,
    rowCount: data.finance.categoryBudgets.length,
    rows: data.finance.categoryBudgets,
  });

  console.log("drive-sync workbook data (finance.iufbEnvelope):", {
    season: data.finance.season,
    rowCount: data.finance.iufbEnvelope.length,
    rows: data.finance.iufbEnvelope,
  });

  console.log("drive-sync workbook data (member):", {
    season: data.member.season,
    rowCount: data.member.members.length,
    rows: data.member.members,
  });
}

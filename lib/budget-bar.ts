import {
  buildPopulatedGeneralPoolCategories,
  type Budget,
  type ExpenseRequest,
  type IufbLineItem,
} from "@/lib/finance";

export type BudgetBarSegment = {
  label: string;
  allocated: number;
  spent: number;
};

export const IU_CRIMSON = "#990000";
export const IU_CREAM = "#EEEDEB";
export const OVER_BUDGET_ALERT = "#d97706";

export function buildGeneralPoolBarSegments(
  budgets: Pick<Budget, "category" | "allocated_amount">[],
  approvedRequests: Pick<
    ExpenseRequest,
    "category" | "amount" | "iufb_line_item_id"
  >[],
): BudgetBarSegment[] {
  return buildPopulatedGeneralPoolCategories(budgets).map(
    ({ value, label, allocated }) => {
      const spent = approvedRequests
        .filter(
          (request) =>
            request.category === value && !request.iufb_line_item_id,
        )
        .reduce((sum, request) => sum + Number(request.amount), 0);

      return { label, allocated, spent };
    },
  );
}

export function buildIufbBarSegments(
  lineItems: Pick<
    IufbLineItem,
    "description" | "approved_amount" | "spent_amount"
  >[],
): BudgetBarSegment[] {
  return lineItems
    .filter((item) => Number(item.approved_amount) > 0)
    .sort((left, right) => left.description.localeCompare(right.description))
    .map((item) => ({
      label: item.description,
      allocated: Number(item.approved_amount),
      spent: Number(item.spent_amount),
    }));
}

export function sumBarAllocated(segments: BudgetBarSegment[]) {
  return segments.reduce((sum, segment) => sum + segment.allocated, 0);
}

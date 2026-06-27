import * as XLSX from "npm:xlsx@0.18.5";
import type {
  FinanceWorkbookData,
  MemberWorkbookData,
  WorkbookData,
} from "./workbook-data.ts";

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function buildBannerText(generatedAt = new Date()): string {
  return (
    `Auto-generated from HROS on ${generatedAt.toISOString()}. ` +
    "Read-only — edits here are overwritten each sync. Change data in HROS."
  );
}

function sheetFromTable(
  banner: string,
  headers: string[],
  rows: (string | number | null)[][],
): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet([
    [banner],
    [],
    headers,
    ...rows,
  ]);
}

function writeWorkbookBytes(workbook: XLSX.WorkBook): Uint8Array {
  const output = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return output instanceof Uint8Array ? output : new Uint8Array(output);
}

export function generateFinanceWorkbookBytes(
  data: FinanceWorkbookData,
  generatedAt = new Date(),
): Uint8Array {
  const banner = buildBannerText(generatedAt);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromTable(
      banner,
      ["Date", "Type", "Description", "Category", "Amount", "Running Balance"],
      data.generalPool.map((row) => [
        row.date,
        row.kind,
        row.description,
        row.category,
        row.amount,
        row.runningBalance,
      ]),
    ),
    "General Pool",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromTable(
      banner,
      ["Category", "Label", "Allocated", "Spent", "Remaining"],
      data.categoryBudgets.map((row) => [
        row.category,
        row.label,
        row.allocated,
        row.spent,
        row.remaining,
      ]),
    ),
    "Category Budgets",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromTable(
      banner,
      ["Description", "Approved", "Spent", "Remaining"],
      data.iufbEnvelope.map((row) => [
        row.description,
        row.approved,
        row.spent,
        row.remaining,
      ]),
    ),
    "IUFB Envelope",
  );

  return writeWorkbookBytes(workbook);
}

export function generateMemberWorkbookBytes(
  data: MemberWorkbookData,
  generatedAt = new Date(),
): Uint8Array {
  const banner = buildBannerText(generatedAt);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromTable(
      banner,
      [
        "Full Name",
        "Email",
        "Phone",
        "Graduation Year",
        "Roles",
        "Exec Title",
        "Apparel Size",
        "Dietary Restrictions",
        "Medical Conditions",
        "Emergency Contact Name",
        "Emergency Contact Phone",
        "Dues Status",
      ],
      data.members.map((row) => [
        row.fullName,
        row.email,
        row.phone,
        row.graduationYear,
        row.roles,
        row.execTitle,
        row.apparelSize,
        row.dietaryRestrictions,
        row.medicalConditions,
        row.emergencyContactName,
        row.emergencyContactPhone,
        row.duesStatus,
      ]),
    ),
    "Active Members",
  );

  return writeWorkbookBytes(workbook);
}

export type GeneratedWorkbooks = {
  finance: Uint8Array;
  member: Uint8Array;
  generatedAt: Date;
};

export function generateWorkbookFiles(data: WorkbookData): GeneratedWorkbooks {
  const generatedAt = new Date();

  return {
    generatedAt,
    finance: generateFinanceWorkbookBytes(data.finance, generatedAt),
    member: generateMemberWorkbookBytes(data.member, generatedAt),
  };
}

export { XLSX_MIME_TYPE };

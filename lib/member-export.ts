import type { Member } from "@/lib/members";
import { formatExecTitle, formatMemberName, formatRole } from "@/lib/members";

export type ExportCategoryKey =
  | "identity"
  | "medical"
  | "sizing"
  | "emergency_contact"
  | "government_id"
  | "student_id"
  | "covid_vaccination"
  | "birthday_image";

type ExportCategory = {
  key: ExportCategoryKey;
  label: string;
  fields: (keyof Member)[];
};

export const DATA_CATEGORIES: ExportCategory[] = [
  {
    key: "identity",
    label: "Identity",
    fields: [
      "first_name",
      "last_name",
      "email",
      "phone",
      "graduation_year",
      "status",
      "roles",
      "exec_title",
    ],
  },
  {
    key: "medical",
    label: "Medical",
    fields: ["dietary_restrictions", "medical_conditions", "drinks_alcohol"],
  },
  {
    key: "sizing",
    label: "Sizing",
    fields: ["shirt_size", "pants_size"],
  },
  {
    key: "emergency_contact",
    label: "Emergency Contact",
    fields: ["emergency_contact_name", "emergency_contact_phone"],
  },
];

// Each document is its own category so a manager can pick exactly which files
// (ID, photo, vaccination card, etc.) go into the export, rather than all-or-nothing.
export const DOCUMENT_CATEGORIES: ExportCategory[] = [
  { key: "government_id", label: "Government ID", fields: ["government_id_path"] },
  { key: "student_id", label: "Student ID", fields: ["student_id_path"] },
  {
    key: "covid_vaccination",
    label: "COVID Vaccination Record",
    fields: ["covid_vaccination_path"],
  },
  { key: "birthday_image", label: "Birthday Image", fields: ["birthday_image_path"] },
];

export const EXPORT_CATEGORIES: ExportCategory[] = [...DATA_CATEGORIES, ...DOCUMENT_CATEGORIES];

// Maps each document category back to the member field holding its storage path —
// lets the export route know which specific files to bundle for a given selection.
export const DOCUMENT_CATEGORY_FIELD: Partial<Record<ExportCategoryKey, keyof Member>> = {
  government_id: "government_id_path",
  student_id: "student_id_path",
  covid_vaccination: "covid_vaccination_path",
  birthday_image: "birthday_image_path",
};

export const DOCUMENT_PATH_FIELDS = [
  "government_id_path",
  "student_id_path",
  "covid_vaccination_path",
  "birthday_image_path",
] as const;

const FIELD_LABELS: Partial<Record<keyof Member, string>> = {
  email: "Email",
  phone: "Phone",
  graduation_year: "Graduation Year",
  status: "Status",
  roles: "Roles",
  exec_title: "Exec Title",
  dietary_restrictions: "Dietary Restrictions",
  medical_conditions: "Medical Conditions",
  drinks_alcohol: "Drinks Alcohol",
  shirt_size: "Shirt Size",
  pants_size: "Pants Size",
  emergency_contact_name: "Emergency Contact Name",
  emergency_contact_phone: "Emergency Contact Phone",
};

// Storage paths aren't useful in a spreadsheet cell — the actual files are bundled
// alongside it, so here we only note whether each document is on file.
const DOCUMENT_FIELD_LABELS: Partial<Record<keyof Member, string>> = {
  government_id_path: "Has Government ID",
  student_id_path: "Has Student ID",
  covid_vaccination_path: "Has COVID Vaccination Record",
  birthday_image_path: "Has Birthday Image",
};

function isDocumentField(field: keyof Member): boolean {
  return (DOCUMENT_PATH_FIELDS as readonly string[]).includes(field as string);
}

function formatCellValue(member: Member, field: keyof Member): string {
  switch (field) {
    case "roles":
      return member.roles.map(formatRole).join(", ");
    case "exec_title":
      return formatExecTitle(member.exec_title) ?? "";
    case "drinks_alcohol":
      return member.drinks_alcohol == null ? "" : member.drinks_alcohol ? "Yes" : "No";
    default: {
      const value = member[field];
      return value == null ? "" : String(value);
    }
  }
}

export function buildExportRows(
  members: Member[],
  selectedCategoryKeys: ExportCategoryKey[],
): Record<string, string>[] {
  const categories = EXPORT_CATEGORIES.filter((category) =>
    selectedCategoryKeys.includes(category.key),
  );

  return members.map((member) => {
    const row: Record<string, string> = { Name: formatMemberName(member) };

    for (const category of categories) {
      for (const field of category.fields) {
        if (field === "first_name" || field === "last_name") {
          continue;
        }

        if (isDocumentField(field)) {
          const label = DOCUMENT_FIELD_LABELS[field];
          if (label) {
            row[label] = member[field] ? "Yes" : "No";
          }
          continue;
        }

        const label = FIELD_LABELS[field];
        if (label) {
          row[label] = formatCellValue(member, field);
        }
      }
    }

    return row;
  });
}

export function getMemberDocumentEntries(member: Member) {
  return DOCUMENT_PATH_FIELDS.map((field) => ({ field, path: member[field] })).filter(
    (entry): entry is { field: (typeof DOCUMENT_PATH_FIELDS)[number]; path: string } =>
      Boolean(entry.path),
  );
}

export function buildDefaultCategorySelection(): Record<ExportCategoryKey, boolean> {
  return Object.fromEntries(
    EXPORT_CATEGORIES.map((category) => [category.key, category.key === "identity"]),
  ) as Record<ExportCategoryKey, boolean>;
}

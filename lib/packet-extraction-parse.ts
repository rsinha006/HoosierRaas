import type {
  ExtractedContact,
  ExtractedDeadline,
  ExtractedFee,
  ExtractedPacketData,
  ExtractedPerformanceRules,
  ExtractedRosterRules,
} from "@/lib/packet-extraction-types";

export type ParsedExtractionResult = {
  data: ExtractedPacketData;
  warnings: string[];
};

function stripJsonFences(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function extractJsonObject(text: string) {
  const cleaned = stripJsonFences(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return cleaned.slice(start, end + 1);
}

function parseJsonLoose(text: string): {
  parsed: unknown;
  usedRecovery: boolean;
} {
  const cleaned = stripJsonFences(text);

  try {
    return { parsed: JSON.parse(cleaned) as unknown, usedRecovery: false };
  } catch {
    const extracted = extractJsonObject(text);
    if (!extracted) {
      throw new Error("UNREADABLE_RESPONSE");
    }

    try {
      return { parsed: JSON.parse(extracted) as unknown, usedRecovery: true };
    } catch {
      throw new Error("INCOMPLETE_JSON");
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "required"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "n", "not required"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function normalizeNullableBoolean(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizeBoolean(value);
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,]/g, "").trim();
    if (!cleaned) {
      return null;
    }

    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function normalizeDate(value: unknown) {
  const text = normalizeString(value);
  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeDeadline(value: unknown): ExtractedDeadline | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const name = normalizeString(record.name);
  if (!name) {
    return null;
  }

  return {
    name,
    due_date: normalizeDate(record.due_date),
    fine_amount: normalizeNumber(record.fine_amount),
    is_hard_cutoff: normalizeBoolean(record.is_hard_cutoff),
  };
}

function normalizeFee(value: unknown): ExtractedFee | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const name = normalizeString(record.name);
  const amount = normalizeNumber(record.amount);
  if (!name || amount == null) {
    return null;
  }

  return {
    name,
    amount,
    is_per_person: normalizeBoolean(record.is_per_person),
    is_refundable: normalizeBoolean(record.is_refundable),
    due_date: normalizeDate(record.due_date),
  };
}

function normalizeContact(value: unknown): ExtractedContact | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const name = normalizeString(record.name);
  if (!name) {
    return null;
  }

  return {
    name,
    role: normalizeString(record.role),
    email: normalizeString(record.email),
    phone: normalizeString(record.phone),
  };
}

function normalizeRosterRules(value: unknown): ExtractedRosterRules {
  const record = asRecord(value) ?? {};

  return {
    min_size: normalizeNumber(record.min_size),
    max_size: normalizeNumber(record.max_size),
    per_person_registration_cost: normalizeNumber(
      record.per_person_registration_cost,
    ),
  };
}

function normalizePerformanceRules(value: unknown): ExtractedPerformanceRules {
  const record = asRecord(value) ?? {};

  return {
    min_duration_minutes: normalizeNumber(record.min_duration_minutes),
    max_duration_minutes: normalizeNumber(record.max_duration_minutes),
    mix_format: normalizeString(record.mix_format),
    tech_rehearsal_required: normalizeNullableBoolean(
      record.tech_rehearsal_required,
    ),
  };
}

function countExtractedFields(data: ExtractedPacketData) {
  let count = data.deadlines.length + data.fees.length + data.contacts.length;

  if (data.roster_rules.min_size != null) count += 1;
  if (data.roster_rules.max_size != null) count += 1;
  if (data.roster_rules.per_person_registration_cost != null) count += 1;
  if (data.performance_rules.min_duration_minutes != null) count += 1;
  if (data.performance_rules.max_duration_minutes != null) count += 1;
  if (data.performance_rules.mix_format) count += 1;
  if (data.performance_rules.tech_rehearsal_required != null) count += 1;

  return count;
}

export function normalizeExtractedPacketData(
  value: unknown,
  warnings: string[],
): ExtractedPacketData {
  const record = asRecord(value);
  if (!record) {
    throw new Error("INCOMPLETE_JSON");
  }

  const deadlines = Array.isArray(record.deadlines)
    ? record.deadlines
        .map(normalizeDeadline)
        .filter((item): item is ExtractedDeadline => item !== null)
    : [];

  const fees = Array.isArray(record.fees)
    ? record.fees
        .map(normalizeFee)
        .filter((item): item is ExtractedFee => item !== null)
    : [];

  const contacts = Array.isArray(record.contacts)
    ? record.contacts
        .map(normalizeContact)
        .filter((item): item is ExtractedContact => item !== null)
    : [];

  if (!Array.isArray(record.deadlines)) {
    warnings.push("No deadlines section was found in the AI response.");
  }

  if (!Array.isArray(record.fees)) {
    warnings.push("No fees section was found in the AI response.");
  }

  if (!asRecord(record.roster_rules)) {
    warnings.push("Roster rules were missing and were left blank.");
  }

  if (!asRecord(record.performance_rules)) {
    warnings.push("Performance rules were missing and were left blank.");
  }

  const data: ExtractedPacketData = {
    deadlines,
    fees,
    contacts,
    roster_rules: normalizeRosterRules(record.roster_rules),
    performance_rules: normalizePerformanceRules(record.performance_rules),
  };

  if (countExtractedFields(data) === 0) {
    throw new Error("EMPTY_EXTRACTION");
  }

  return data;
}

export function parseExtractedPacketResponse(
  responseText: string,
): ParsedExtractionResult {
  const warnings: string[] = [];
  const { parsed, usedRecovery } = parseJsonLoose(responseText);

  if (usedRecovery) {
    warnings.push(
      "The AI response needed cleanup. Please double-check every field before saving.",
    );
  }

  try {
    const data = normalizeExtractedPacketData(parsed, warnings);

    if (
      data.deadlines.length === 0 &&
      data.fees.length === 0 &&
      data.contacts.length === 0
    ) {
      warnings.push(
        "We only found rule details, not individual deadlines or fees. You may need to add those manually.",
      );
    }

    if (countExtractedFields(data) <= 2) {
      warnings.push(
        "Very little text was extracted. If this PDF is scanned or image-based, fill in missing details manually.",
      );
    }

    return { data, warnings };
  } catch (error) {
    if (error instanceof Error && error.message === "EMPTY_EXTRACTION") {
      return {
        data: {
          deadlines: [],
          fees: [],
          contacts: [],
          roster_rules: {
            min_size: null,
            max_size: null,
            per_person_registration_cost: null,
          },
          performance_rules: {
            min_duration_minutes: null,
            max_duration_minutes: null,
            mix_format: null,
            tech_rehearsal_required: null,
          },
        },
        warnings: [
          "We could not read text from this PDF. It may be a scanned document. You can still add deadlines manually on the next screen.",
        ],
      };
    }

    throw error;
  }
}

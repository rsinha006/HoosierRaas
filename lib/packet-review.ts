import type {
  ExtractedContact,
  ExtractedDeadline,
  ExtractedFee,
  ExtractedPacketData,
  ExtractedPerformanceRules,
  ExtractedRosterRules,
} from "@/lib/packet-extraction-types";

export type AiFieldFlags<T extends string> = Partial<Record<T, boolean>>;

export type ReviewDeadlineRow = {
  id: string;
  databaseId?: string | null;
  name: string;
  due_date: string;
  fine_amount: string;
  is_hard_cutoff: boolean;
  aiFields: AiFieldFlags<
    "name" | "due_date" | "fine_amount" | "is_hard_cutoff"
  >;
};

export type ReviewFeeRow = {
  id: string;
  databaseId?: string | null;
  name: string;
  amount: string;
  is_per_person: boolean;
  is_refundable: boolean;
  due_date: string;
  aiFields: AiFieldFlags<
    "name" | "amount" | "is_per_person" | "is_refundable" | "due_date"
  >;
};

export type ReviewContactRow = {
  id: string;
  databaseId?: string | null;
  name: string;
  role: string;
  email: string;
  phone: string;
  aiFields: AiFieldFlags<"name" | "role" | "email" | "phone">;
};

export type ReviewRosterRules = {
  min_size: string;
  max_size: string;
  per_person_registration_cost: string;
  aiFields: AiFieldFlags<
    "min_size" | "max_size" | "per_person_registration_cost"
  >;
};

export type ReviewPerformanceRules = {
  min_duration_minutes: string;
  max_duration_minutes: string;
  mix_format: string;
  tech_rehearsal_required: boolean | null;
  aiFields: AiFieldFlags<
    | "min_duration_minutes"
    | "max_duration_minutes"
    | "mix_format"
    | "tech_rehearsal_required"
  >;
};

export type PacketReviewFormState = {
  competitionId: string;
  competitionName: string;
  extractionWarnings?: string[];
  rowSnapshot?: {
    deadlineIds: string[];
    feeIds: string[];
    contactIds: string[];
  };
  deadlines: ReviewDeadlineRow[];
  fees: ReviewFeeRow[];
  contacts: ReviewContactRow[];
  roster_rules: ReviewRosterRules;
  performance_rules: ReviewPerformanceRules;
};

export const PACKET_REVIEW_STORAGE_KEY = "hros-packet-review";

function valueWasExtracted(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim() !== "";
  }

  if (typeof value === "number") {
    return !Number.isNaN(value);
  }

  if (typeof value === "boolean") {
    return true;
  }

  return false;
}

function createId() {
  return crypto.randomUUID();
}

function createDeadlineRow(deadline: ExtractedDeadline): ReviewDeadlineRow {
  return {
    id: createId(),
    name: deadline.name ?? "",
    due_date: deadline.due_date ?? "",
    fine_amount:
      deadline.fine_amount != null ? String(deadline.fine_amount) : "",
    is_hard_cutoff: deadline.is_hard_cutoff ?? false,
    aiFields: {
      name: valueWasExtracted(deadline.name),
      due_date: valueWasExtracted(deadline.due_date),
      fine_amount: deadline.fine_amount != null,
      is_hard_cutoff: valueWasExtracted(deadline.is_hard_cutoff),
    },
  };
}

function createFeeRow(fee: ExtractedFee): ReviewFeeRow {
  return {
    id: createId(),
    name: fee.name ?? "",
    amount: fee.amount != null ? String(fee.amount) : "",
    is_per_person: fee.is_per_person ?? false,
    is_refundable: fee.is_refundable ?? false,
    due_date: fee.due_date ?? "",
    aiFields: {
      name: valueWasExtracted(fee.name),
      amount: fee.amount != null,
      is_per_person: valueWasExtracted(fee.is_per_person),
      is_refundable: valueWasExtracted(fee.is_refundable),
      due_date: valueWasExtracted(fee.due_date),
    },
  };
}

function createContactRow(contact: ExtractedContact): ReviewContactRow {
  return {
    id: createId(),
    name: contact.name ?? "",
    role: contact.role ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    aiFields: {
      name: valueWasExtracted(contact.name),
      role: valueWasExtracted(contact.role),
      email: valueWasExtracted(contact.email),
      phone: valueWasExtracted(contact.phone),
    },
  };
}


export type ExistingDeadlineRow = {
  id?: string;
  name: string;
  due_date: string | null;
  fine_amount: number | null;
  is_hard_cutoff: boolean;
};

export type ExistingFeeRow = {
  id?: string;
  name: string;
  amount: number;
  is_per_person: boolean;
  is_refundable: boolean;
  due_date: string | null;
};

export type ExistingContactRow = {
  id?: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
};

export type ExistingRosterRules = {
  min_size: number | null;
  max_size: number | null;
  per_person_registration_cost: number | null;
};

export type ExistingPerformanceRules = {
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
  mix_format: string | null;
  tech_rehearsal_required: boolean | null;
};

export type ExistingCompetitionPacketData = {
  deadlines: ExistingDeadlineRow[];
  fees: ExistingFeeRow[];
  contacts: ExistingContactRow[];
  roster_rules: ExistingRosterRules;
  performance_rules: ExistingPerformanceRules;
};

function normalizeRowName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Existing saved rows are already human-reviewed, so they're kept as-is and never
 *  AI-highlighted. Newly extracted rows are only appended when their name doesn't
 *  already match something saved, so re-extraction can't silently drop or duplicate
 *  data a reviewer already confirmed. */
function mergeDeadlines(
  existing: ExistingDeadlineRow[],
  extracted: ExtractedDeadline[],
): ReviewDeadlineRow[] {
  const existingRows = existing.map((deadline) => ({
    id: deadline.id ?? createId(),
    databaseId: deadline.id ?? null,
    name: deadline.name,
    due_date: deadline.due_date ?? "",
    fine_amount:
      deadline.fine_amount != null ? String(deadline.fine_amount) : "",
    is_hard_cutoff: deadline.is_hard_cutoff,
    aiFields: {},
  }));

  const existingNames = new Set(
    existing.map((deadline) => normalizeRowName(deadline.name)),
  );

  const newRows = extracted
    .filter(
      (deadline) =>
        valueWasExtracted(deadline.name) &&
        !existingNames.has(normalizeRowName(deadline.name ?? "")),
    )
    .map(createDeadlineRow);

  return [...existingRows, ...newRows];
}

function mergeFees(
  existing: ExistingFeeRow[],
  extracted: ExtractedFee[],
): ReviewFeeRow[] {
  const existingRows = existing.map((fee) => ({
    id: fee.id ?? createId(),
    databaseId: fee.id ?? null,
    name: fee.name,
    amount: String(fee.amount),
    is_per_person: fee.is_per_person,
    is_refundable: fee.is_refundable,
    due_date: fee.due_date ?? "",
    aiFields: {},
  }));

  const existingNames = new Set(
    existing.map((fee) => normalizeRowName(fee.name)),
  );

  const newRows = extracted
    .filter(
      (fee) =>
        valueWasExtracted(fee.name) &&
        !existingNames.has(normalizeRowName(fee.name ?? "")),
    )
    .map(createFeeRow);

  return [...existingRows, ...newRows];
}

function mergeContacts(
  existing: ExistingContactRow[],
  extracted: ExtractedContact[],
): ReviewContactRow[] {
  const existingRows = existing.map((contact) => ({
    id: contact.id ?? createId(),
    databaseId: contact.id ?? null,
    name: contact.name,
    role: contact.role ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    aiFields: {},
  }));

  const existingNames = new Set(
    existing.map((contact) => normalizeRowName(contact.name)),
  );

  const newRows = extracted
    .filter(
      (contact) =>
        valueWasExtracted(contact.name) &&
        !existingNames.has(normalizeRowName(contact.name ?? "")),
    )
    .map(createContactRow);

  return [...existingRows, ...newRows];
}

/** A saved value takes precedence over the new extraction — it's already been
 *  reviewed once. The AI only fills in fields that are still blank. */
function mergeRosterRules(
  existing: ExistingRosterRules,
  extracted: ExtractedRosterRules,
): ReviewRosterRules {
  const minSize = existing.min_size ?? extracted.min_size;
  const maxSize = existing.max_size ?? extracted.max_size;
  const perPersonCost =
    existing.per_person_registration_cost ??
    extracted.per_person_registration_cost;

  return {
    min_size: minSize != null ? String(minSize) : "",
    max_size: maxSize != null ? String(maxSize) : "",
    per_person_registration_cost:
      perPersonCost != null ? String(perPersonCost) : "",
    aiFields: {
      min_size: existing.min_size == null && extracted.min_size != null,
      max_size: existing.max_size == null && extracted.max_size != null,
      per_person_registration_cost:
        existing.per_person_registration_cost == null &&
        extracted.per_person_registration_cost != null,
    },
  };
}

function mergePerformanceRules(
  existing: ExistingPerformanceRules,
  extracted: ExtractedPerformanceRules,
): ReviewPerformanceRules {
  const minDuration = existing.min_duration_minutes ?? extracted.min_duration_minutes;
  const maxDuration = existing.max_duration_minutes ?? extracted.max_duration_minutes;
  const mixFormat = existing.mix_format ?? extracted.mix_format;
  const techRehearsalRequired =
    existing.tech_rehearsal_required ?? extracted.tech_rehearsal_required;

  return {
    min_duration_minutes: minDuration != null ? String(minDuration) : "",
    max_duration_minutes: maxDuration != null ? String(maxDuration) : "",
    mix_format: mixFormat ?? "",
    tech_rehearsal_required: techRehearsalRequired,
    aiFields: {
      min_duration_minutes:
        existing.min_duration_minutes == null &&
        extracted.min_duration_minutes != null,
      max_duration_minutes:
        existing.max_duration_minutes == null &&
        extracted.max_duration_minutes != null,
      mix_format: !valueWasExtracted(existing.mix_format) && valueWasExtracted(extracted.mix_format),
      tech_rehearsal_required:
        existing.tech_rehearsal_required == null &&
        extracted.tech_rehearsal_required != null,
    },
  };
}

export function buildMergedPacketReviewFormState(
  competitionId: string,
  competitionName: string,
  extracted: ExtractedPacketData,
  existing: ExistingCompetitionPacketData,
  extractionWarnings: string[] = [],
): PacketReviewFormState {
  return {
    competitionId,
    competitionName,
    extractionWarnings,
    rowSnapshot: {
      deadlineIds: existing.deadlines
        .map((deadline) => deadline.id)
        .filter((id): id is string => Boolean(id)),
      feeIds: existing.fees
        .map((fee) => fee.id)
        .filter((id): id is string => Boolean(id)),
      contactIds: existing.contacts
        .map((contact) => contact.id)
        .filter((id): id is string => Boolean(id)),
    },
    deadlines: mergeDeadlines(existing.deadlines, extracted.deadlines),
    fees: mergeFees(existing.fees, extracted.fees),
    contacts: mergeContacts(existing.contacts, extracted.contacts),
    roster_rules: mergeRosterRules(existing.roster_rules, extracted.roster_rules),
    performance_rules: mergePerformanceRules(
      existing.performance_rules,
      extracted.performance_rules,
    ),
  };
}

export function createEmptyDeadlineRow(): ReviewDeadlineRow {
  return {
    id: createId(),
    databaseId: null,
    name: "",
    due_date: "",
    fine_amount: "",
    is_hard_cutoff: false,
    aiFields: {},
  };
}

export function createEmptyFeeRow(): ReviewFeeRow {
  return {
    id: createId(),
    databaseId: null,
    name: "",
    amount: "",
    is_per_person: false,
    is_refundable: false,
    due_date: "",
    aiFields: {},
  };
}

export function createEmptyContactRow(): ReviewContactRow {
  return {
    id: createId(),
    databaseId: null,
    name: "",
    role: "",
    email: "",
    phone: "",
    aiFields: {},
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

export type PacketReviewValidationErrors = {
  deadlines: Record<string, string>;
  fees: Record<string, string>;
  contacts: Record<string, string>;
  rosterRules: Record<string, string>;
  performanceRules: Record<string, string>;
};

export function validatePacketReviewFormState(
  state: PacketReviewFormState,
): PacketReviewValidationErrors {
  const errors: PacketReviewValidationErrors = {
    deadlines: {},
    fees: {},
    contacts: {},
    rosterRules: {},
    performanceRules: {},
  };

  for (const deadline of state.deadlines) {
    if (!deadline.name.trim()) {
      errors.deadlines[deadline.id] = "Every deadline needs a name.";
      continue;
    }

    const fine = parseOptionalNumber(deadline.fine_amount);
    if (Number.isNaN(fine) || (fine != null && fine < 0)) {
      errors.deadlines[deadline.id] = "Fine amount can't be negative.";
    }
  }

  for (const fee of state.fees) {
    if (!fee.name.trim()) {
      errors.fees[fee.id] = "Every fee needs a name.";
      continue;
    }

    const amount = parseOptionalNumber(fee.amount);
    if (amount == null || Number.isNaN(amount) || amount < 0) {
      errors.fees[fee.id] = "Enter a valid amount of $0 or more.";
    }
  }

  for (const contact of state.contacts) {
    if (!contact.name.trim()) {
      errors.contacts[contact.id] = "Every contact needs a name.";
    }
  }

  const rosterMin = parseOptionalNumber(state.roster_rules.min_size);
  const rosterMax = parseOptionalNumber(state.roster_rules.max_size);
  const perPersonCost = parseOptionalNumber(
    state.roster_rules.per_person_registration_cost,
  );

  if (Number.isNaN(rosterMin) || (rosterMin != null && rosterMin < 0)) {
    errors.rosterRules.min_size = "Roster min can't be negative.";
  }
  if (Number.isNaN(rosterMax) || (rosterMax != null && rosterMax < 0)) {
    errors.rosterRules.max_size = "Roster max can't be negative.";
  }
  if (
    rosterMin != null &&
    rosterMax != null &&
    !Number.isNaN(rosterMin) &&
    !Number.isNaN(rosterMax) &&
    rosterMin > rosterMax
  ) {
    errors.rosterRules.max_size = "Roster max must be greater than or equal to roster min.";
  }
  if (Number.isNaN(perPersonCost) || (perPersonCost != null && perPersonCost < 0)) {
    errors.rosterRules.per_person_registration_cost = "Enter a valid cost of $0 or more.";
  }

  const minDuration = parseOptionalNumber(
    state.performance_rules.min_duration_minutes,
  );
  const maxDuration = parseOptionalNumber(
    state.performance_rules.max_duration_minutes,
  );

  if (Number.isNaN(minDuration) || (minDuration != null && minDuration < 0)) {
    errors.performanceRules.min_duration_minutes = "Min duration can't be negative.";
  }
  if (Number.isNaN(maxDuration) || (maxDuration != null && maxDuration < 0)) {
    errors.performanceRules.max_duration_minutes = "Max duration can't be negative.";
  }
  if (
    minDuration != null &&
    maxDuration != null &&
    !Number.isNaN(minDuration) &&
    !Number.isNaN(maxDuration) &&
    minDuration > maxDuration
  ) {
    errors.performanceRules.max_duration_minutes =
      "Max duration must be greater than or equal to min duration.";
  }

  return errors;
}

export function hasPacketReviewValidationErrors(
  errors: PacketReviewValidationErrors,
): boolean {
  return Object.values(errors).some((group) => Object.keys(group).length > 0);
}

export function savePacketReviewDraft(state: PacketReviewFormState) {
  sessionStorage.setItem(PACKET_REVIEW_STORAGE_KEY, JSON.stringify(state));
}

export function loadPacketReviewDraft(competitionId: string) {
  const raw = sessionStorage.getItem(PACKET_REVIEW_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PacketReviewFormState;
    if (parsed.competitionId !== competitionId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearPacketReviewDraft() {
  sessionStorage.removeItem(PACKET_REVIEW_STORAGE_KEY);
}

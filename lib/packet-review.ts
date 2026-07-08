import type {
  ExtractedContact,
  ExtractedDeadline,
  ExtractedFee,
  ExtractedPacketData,
} from "@/lib/packet-extraction-types";

export type AiFieldFlags<T extends string> = Partial<Record<T, boolean>>;

export type ReviewDeadlineRow = {
  id: string;
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

export function buildPacketReviewFormState(
  competitionId: string,
  competitionName: string,
  data: ExtractedPacketData,
  extractionWarnings: string[] = [],
): PacketReviewFormState {
  return {
    competitionId,
    competitionName,
    extractionWarnings,
    deadlines: data.deadlines.map(createDeadlineRow),
    fees: data.fees.map(createFeeRow),
    contacts: data.contacts.map(createContactRow),
    roster_rules: {
      min_size:
        data.roster_rules.min_size != null
          ? String(data.roster_rules.min_size)
          : "",
      max_size:
        data.roster_rules.max_size != null
          ? String(data.roster_rules.max_size)
          : "",
      per_person_registration_cost:
        data.roster_rules.per_person_registration_cost != null
          ? String(data.roster_rules.per_person_registration_cost)
          : "",
      aiFields: {
        min_size: data.roster_rules.min_size != null,
        max_size: data.roster_rules.max_size != null,
        per_person_registration_cost:
          data.roster_rules.per_person_registration_cost != null,
      },
    },
    performance_rules: {
      min_duration_minutes:
        data.performance_rules.min_duration_minutes != null
          ? String(data.performance_rules.min_duration_minutes)
          : "",
      max_duration_minutes:
        data.performance_rules.max_duration_minutes != null
          ? String(data.performance_rules.max_duration_minutes)
          : "",
      mix_format: data.performance_rules.mix_format ?? "",
      tech_rehearsal_required: data.performance_rules.tech_rehearsal_required,
      aiFields: {
        min_duration_minutes:
          data.performance_rules.min_duration_minutes != null,
        max_duration_minutes:
          data.performance_rules.max_duration_minutes != null,
        mix_format: valueWasExtracted(data.performance_rules.mix_format),
        tech_rehearsal_required:
          data.performance_rules.tech_rehearsal_required != null,
      },
    },
  };
}

export function createEmptyDeadlineRow(): ReviewDeadlineRow {
  return {
    id: createId(),
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

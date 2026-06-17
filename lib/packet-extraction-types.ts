export type ExtractedDeadline = {
  name: string;
  due_date: string | null;
  fine_amount: number | null;
  is_hard_cutoff: boolean;
};

export type ExtractedFee = {
  name: string;
  amount: number;
  is_per_person: boolean;
  is_refundable: boolean;
  due_date: string | null;
};

export type ExtractedRosterRules = {
  min_size: number | null;
  max_size: number | null;
  per_person_registration_cost: number | null;
};

export type ExtractedPerformanceRules = {
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
  mix_format: string | null;
  tech_rehearsal_required: boolean | null;
};

export type ExtractedContact = {
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
};

export type ExtractedPacketData = {
  deadlines: ExtractedDeadline[];
  fees: ExtractedFee[];
  roster_rules: ExtractedRosterRules;
  performance_rules: ExtractedPerformanceRules;
  contacts: ExtractedContact[];
};

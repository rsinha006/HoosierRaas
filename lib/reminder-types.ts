export type ReminderSettings = {
  lead_days: number[];
};

// A single lead time by default — adding more than one means a separate email
// per deadline for each one, so we don't opt team managers into that by default.
export const DEFAULT_REMINDER_LEAD_DAYS = [3];

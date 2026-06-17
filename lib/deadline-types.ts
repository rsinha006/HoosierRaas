export type DeadlineRow = {
  id: string;
  competition_id: string;
  name: string;
  due_date: string | null;
  fine_amount: number | null;
  is_hard_cutoff: boolean;
  status: "pending" | "complete";
  completed_at: string | null;
  created_at: string;
};

export type PressingDeadlineGroup = {
  competitionId: string;
  competitionName: string;
  deadlines: DeadlineRow[];
};

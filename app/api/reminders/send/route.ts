import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findDeadlinesDueForReminder, reminderKey } from "@/lib/deadline-reminders";
import { sendReminderEmail } from "@/lib/send-reminder-email";
import type { DeadlineRow } from "@/lib/deadline-types";
import { DEFAULT_REMINDER_LEAD_DAYS } from "@/lib/reminder-types";

type CompetitionRef = { id: string; name: string; season: string };

type DeadlineWithCompetition = DeadlineRow & {
  competitions: CompetitionRef | CompetitionRef[] | null;
};

function getCompetition(row: DeadlineWithCompetition) {
  if (!row.competitions) {
    return null;
  }

  return Array.isArray(row.competitions) ? (row.competitions[0] ?? null) : row.competitions;
}

// Called by public.invoke_deadline_reminders() (pg_cron, see
// supabase/migrations/20260724100000_deadline_reminders_cron.sql), authenticated
// via a shared secret rather than a user session — this route has no request-time
// user, only the cron trigger.
export async function POST(request: Request) {
  const expectedSecret = process.env.REMINDER_CRON_SECRET;
  const providedSecret = request.headers.get("x-reminder-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "APP_URL is not configured." }, { status: 500 });
  }

  const admin = createAdminClient();

  const { data: activeSeason, error: seasonError } = await admin
    .from("seasons")
    .select("label")
    .eq("is_active", true)
    .maybeSingle();

  if (seasonError || !activeSeason) {
    return NextResponse.json({ error: "No active season configured." }, { status: 500 });
  }

  const { data: settingsRow } = await admin
    .from("reminder_settings")
    .select("lead_days")
    .eq("id", 1)
    .maybeSingle();

  const leadDays = settingsRow?.lead_days ?? DEFAULT_REMINDER_LEAD_DAYS;

  const { data: deadlinesData, error: deadlinesError } = await admin
    .from("deadlines")
    .select(
      `
      id,
      competition_id,
      name,
      due_date,
      fine_amount,
      is_hard_cutoff,
      status,
      completed_at,
      created_at,
      competitions!inner ( id, name, season )
      `,
    )
    .eq("status", "pending")
    .eq("competitions.season", activeSeason.label);

  if (deadlinesError) {
    return NextResponse.json({ error: deadlinesError.message }, { status: 500 });
  }

  const rows = (deadlinesData ?? []) as unknown as DeadlineWithCompetition[];
  const deadlineIds = rows.map((row) => row.id);

  const { data: sentRows } = deadlineIds.length
    ? await admin
        .from("deadline_reminders_sent")
        .select("deadline_id, lead_days")
        .in("deadline_id", deadlineIds)
    : { data: [] as { deadline_id: string; lead_days: number }[] };

  const alreadySentKeys = new Set(
    (sentRows ?? []).map((row) => reminderKey(row.deadline_id, row.lead_days)),
  );

  const plainDeadlines: DeadlineRow[] = rows.map(({ competitions: _competitions, ...deadline }) => deadline);
  const dueReminders = findDeadlinesDueForReminder(plainDeadlines, leadDays, alreadySentKeys);

  if (dueReminders.length === 0) {
    return NextResponse.json({ sent: 0, checked: 0 });
  }

  const { data: membershipRows, error: membershipError } = await admin
    .from("season_memberships")
    .select("member_id")
    .eq("season", activeSeason.label)
    .in("exec_title", ["captain", "team_manager"]);

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  const memberIds = (membershipRows ?? []).map((row) => row.member_id);

  const { data: memberRows } = memberIds.length
    ? await admin.from("members").select("email").in("id", memberIds)
    : { data: [] as { email: string }[] };

  const recipientEmails = (memberRows ?? [])
    .map((row) => row.email)
    .filter((email): email is string => Boolean(email));

  if (recipientEmails.length === 0) {
    return NextResponse.json({
      sent: 0,
      checked: dueReminders.length,
      warning: "No captain/team manager recipients found for the active season.",
    });
  }

  let sentCount = 0;

  for (const { deadline, leadDays: lead } of dueReminders) {
    const competitionRow = rows.find((row) => row.id === deadline.id);
    const competition = competitionRow ? getCompetition(competitionRow) : null;
    const competitionName = competition?.name ?? "Competition";

    try {
      await sendReminderEmail(
        {
          deadline,
          leadDays: lead,
          competitionName,
          competitionUrl: `${appUrl.replace(/\/$/, "")}/team-manager/competitions/${deadline.competition_id}`,
        },
        recipientEmails,
      );

      const { error: insertError } = await admin.from("deadline_reminders_sent").insert({
        deadline_id: deadline.id,
        lead_days: lead,
      });

      if (insertError) {
        console.error("Failed to record sent reminder", insertError);
        continue;
      }

      sentCount += 1;
    } catch (err) {
      console.error(`Failed to send reminder for deadline ${deadline.id}`, err);
    }
  }

  return NextResponse.json({ sent: sentCount, checked: dueReminders.length });
}

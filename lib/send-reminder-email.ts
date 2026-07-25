import { Resend } from "resend";
import {
  buildReminderEmailHtml,
  buildReminderEmailSubject,
  type ReminderEmailContext,
} from "@/lib/reminder-email";

export async function sendReminderEmail(
  context: ReminderEmailContext,
  recipientEmails: string[],
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error(
      "Reminder emails are not configured. Set RESEND_API_KEY and REMINDER_FROM_EMAIL.",
    );
  }

  if (recipientEmails.length === 0) {
    return;
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: recipientEmails,
    subject: buildReminderEmailSubject(context),
    html: buildReminderEmailHtml(context),
  });

  if (error) {
    throw new Error(error.message);
  }
}

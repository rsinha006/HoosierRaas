-- The original 20260724000000_deadline_reminders.sql shipped with a default of
-- all three lead times enabled ({1,3,7}), which sends three separate reminder
-- emails per deadline out of the box. Reset to a single default lead time so
-- reminders don't spam team managers unless they deliberately opt into more via
-- the "Set reminders" dialog.
--
-- Only touches the row if it's still exactly the old default — if a team
-- manager already customized it via the app, this leaves their choice alone.

update public.reminder_settings
set lead_days = '{3}', updated_at = now()
where id = 1 and lead_days = '{1,3,7}';

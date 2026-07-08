-- The AI packet extraction endpoint had no rate limiting — spam-clicking "Extract
-- Data" fired a Gemini API call every time with no cost control. Track the last
-- extraction attempt per competition so the API route can enforce a cooldown.
-- Run this in the Supabase SQL Editor.

alter table public.competitions
  add column if not exists last_packet_extraction_at timestamptz;

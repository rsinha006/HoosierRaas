export const PACKET_EXTRACTION_PROMPT = `You are extracting structured registration data from a dance team competition registration packet PDF.

Your job is to read the full document carefully, including tables, bullet lists, headers, footers, and fee/deadline sections.

Return ONLY valid raw JSON. No markdown. No code fences. No explanation.

Use this exact JSON shape:
{
  "deadlines": [
    {
      "name": "string",
      "due_date": "YYYY-MM-DD or null",
      "fine_amount": number or null,
      "is_hard_cutoff": boolean
    }
  ],
  "fees": [
    {
      "name": "string",
      "amount": number,
      "is_per_person": boolean,
      "is_refundable": boolean,
      "due_date": "YYYY-MM-DD or null"
    }
  ],
  "roster_rules": {
    "min_size": number or null,
    "max_size": number or null,
    "per_person_registration_cost": number or null
  },
  "performance_rules": {
    "min_duration_minutes": number or null,
    "max_duration_minutes": number or null,
    "mix_format": "string or null",
    "tech_rehearsal_required": boolean or null
  },
  "contacts": [
    {
      "name": "string",
      "role": "string or null",
      "email": "string or null",
      "phone": "string or null"
    }
  ]
}

Extraction rules:
- Extract ONLY values explicitly stated in the document.
- Do NOT guess, infer, or calculate missing values.
- If a section is not present with high confidence, use [] for arrays.
- If a single field is missing, use null.
- If the PDF appears scanned, image-only, or unreadable, return empty arrays and nulls rather than inventing data.

Deadlines guidance:
- Include registration due dates, music submission deadlines, roster submission deadlines, payment due dates, waiver deadlines, hotel/rooming deadlines, and similar requirements.
- "name" should be short and specific, like "Music submission" or "Final roster due".
- "fine_amount" is a number only when a late fee or penalty amount is stated.
- "is_hard_cutoff" is true only when the document clearly says late submissions are not accepted or there is a hard cutoff.

Fees guidance:
- Include registration fees, team fees, late fees, spectator fees, parking fees, and similar charges.
- "amount" must be a number without currency symbols.
- "is_per_person" is true for per-dancer or per-team-member fees.
- "is_refundable" is true only when the document explicitly says refundable.

Roster rules guidance:
- Look for team size limits, roster minimum/maximum, and per-person registration cost.

Performance rules guidance:
- Look for set length, performance duration limits, mix/CD/USB requirements, and whether tech rehearsal is required.

Contacts guidance:
- Include competition director, registrar, coordinator, tech contact, or other named contacts with email/phone when present.

Formatting rules:
- Dates must be YYYY-MM-DD when a specific calendar date is stated.
- Convert written dates like "March 15, 2026" to 2026-03-15.
- If only a month is given without a day, use null.
- Booleans must be true or false, never strings.
- Phone numbers and emails should be copied exactly when present.`;

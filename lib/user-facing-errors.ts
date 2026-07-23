export function toUserFacingExtractionError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message === "INCOMPLETE_JSON") {
    return "The AI could not return readable data from this packet. Try again, or add deadlines manually on the review screen.";
  }

  if (message === "UNREADABLE_RESPONSE") {
    return "We did not get a usable response from the AI. Please try extracting again.";
  }

  if (message === "EMPTY_EXTRACTION") {
    return "We could not find competition details in this PDF. It may be a scanned image, blank, or not a registration packet. You can still add deadlines manually.";
  }

  if (message.includes("429") || message.includes("quota")) {
    return "The AI service quota has been reached. Check your Google AI Studio billing and API key, then try again in a few minutes.";
  }

  if (message.includes("404") && message.includes("models/")) {
    return "The AI model is not available for your API key. Ask your admin to update the Gemini model setting.";
  }

  if (message.includes("API key") || message.includes("API_KEY")) {
    return "The AI service is not configured correctly. Ask your admin to check the Gemini API key.";
  }

  if (message.includes("GOOGLE_GEMINI_API_KEY")) {
    return "The AI service is not set up yet. Ask your admin to add the Gemini API key.";
  }

  return "Something went wrong while reading the registration packet. Please try again.";
}

export function toUserFacingSaveError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("row-level security") || message.includes("permission")) {
    return "You do not have permission to save this data. Only Captains and Team Managers can confirm packet details.";
  }

  if (message.includes("competition_contacts") && message.includes("does not exist")) {
    return "Contacts could not be saved because the database is missing the contacts table. Deadlines and fees may still need a database update.";
  }

  if (message.includes("deadlines") && message.includes("does not exist")) {
    return "Deadlines could not be saved. The database may need the latest migration applied in Supabase.";
  }

  if (message.includes("fees") && message.includes("does not exist")) {
    return "Fees could not be saved. The database may need the latest migration applied in Supabase.";
  }

  if (message.includes("per_person_registration_cost") || message.includes("tech_rehearsal_required")) {
    return "Some competition fields could not be saved. The database may need the latest migration applied in Supabase.";
  }

  return "We could not save your changes. Please try again. If this keeps happening, contact your admin.";
}

export function toUserFacingDeadlineError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("row-level security") || message.includes("permission")) {
    return "You do not have permission to update this deadline.";
  }

  return "We could not update this deadline. Please try again.";
}

export function toUserFacingStorageError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("not found") || message.includes("object not found")) {
    return "The registration packet file could not be found. Try uploading the PDF again.";
  }

  if (message.includes("row-level security") || message.includes("permission")) {
    return "You do not have permission to open this file.";
  }

  return "We could not open the registration packet. Please try again.";
}

export function toUserFacingAuthError(): string {
  return "You need to sign in again before continuing.";
}

export function toUserFacingMemberSaveError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("row-level security") || message.includes("permission")) {
    return "You do not have permission to confirm this member.";
  }

  if (message.includes("duplicate") || message.includes("unique")) {
    return "Another member already uses this email address.";
  }

  return "We could not confirm this member. Please try again.";
}

export function toUserFacingMemberDeleteError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("not found")) {
    return "This member could not be found.";
  }

  if (
    message.includes("invalid api key") ||
    message.includes("jwt") ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return "Member deletion is not configured correctly on the server. Ask your admin to verify SUPABASE_SERVICE_ROLE_KEY.";
  }

  if (
    message.includes("member_has_linked_income_entries") ||
    message.includes("expense_requests") ||
    message.includes("reimbursements") ||
    message.includes("income_entries") ||
    message.includes("dues_requires_member") ||
    message.includes("check constraint") ||
    message.includes("foreign key") ||
    message.includes("violates foreign key") ||
    message.includes("still referenced")
  ) {
    if (
      message.includes("member_has_linked_income_entries") ||
      message.includes("income_entries") ||
      message.includes("dues_requires_member")
    ) {
      return "This member cannot be deleted because they have linked income records that could not be removed.";
    }

    return "This member cannot be deleted because they have expense requests or reimbursements on record.";
  }

  if (message.includes("admin_delete_member")) {
    return "Member deletion is not available yet. Ask your admin to apply the latest database migration.";
  }

  return "We could not delete this member. Please try again.";
}

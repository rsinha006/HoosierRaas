/** Maps a validateForm() error key to the id of the field it belongs to, in
 *  the order the fields actually appear on the page. Object key order in a
 *  validation function doesn't reliably match visual order — some forms
 *  validate a later field before an earlier one — so the scroll target has
 *  to be looked up from an explicit list instead. */
export type FieldOrder = { key: string; id: string }[];

/** Scrolls to (and focuses, if possible) the first invalid field so a long
 *  form doesn't leave every error out of view after a failed submit. */
export function focusFirstFieldError(
  fieldOrder: FieldOrder,
  errors: Record<string, string>,
) {
  if (typeof document === "undefined") {
    return;
  }

  const firstField = fieldOrder.find((field) => errors[field.key]);
  if (!firstField) {
    return;
  }

  // The setFieldErrors call this runs alongside hasn't been painted yet —
  // every field's new error text is about to land and reflow the page.
  // Scrolling in the same tick races that reflow and the browser silently
  // drops the scroll. requestAnimationFrame would be the usual fix, but it
  // doesn't fire at all on a backgrounded tab; setTimeout still runs there
  // and, for a real foregrounded tab, still lands after React's commit.
  //
  // Deliberately "auto" (instant), not "smooth": a smooth scroll's own
  // animation raced the same reflow unpredictably in testing. Instant is
  // less polished but never silently fails to move at all.
  setTimeout(() => {
    const element = document.getElementById(firstField.id);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "auto", block: "center" });

    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.focus({ preventScroll: true });
    }
  }, 0);
}

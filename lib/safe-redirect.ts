/**
 * Constrains a caller-supplied redirect target to somewhere on this site.
 *
 * /api/viewing-season took its `redirect` straight from the query string and
 * handed it to NextResponse.redirect, so a link beginning with the real HROS
 * address forwarded the browser anywhere - the standard shape of a phishing
 * link, and one that defeats "check the URL before you click" precisely
 * because the visible domain is genuine.
 *
 * Anything that is not an unambiguous same-origin path falls back rather than
 * erroring: the redirect is a convenience, and a surprising landing page beats
 * a dead end.
 */

export const DEFAULT_REDIRECT_PATH = "/dashboard";

/** Backslashes (browsers fold them to "/"), and control characters, which have
 *  no business in a path and are the raw material for header injection. */
const UNSAFE_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

export function resolveSafeRedirectPath(
  value: string | null | undefined,
  origin: string,
  fallback: string = DEFAULT_REDIRECT_PATH,
): string {
  if (!value) {
    return fallback;
  }

  // Must be site-relative. This rejects "https://evil.com" and "evil.com"
  // alike, since neither begins with a slash.
  if (!value.startsWith("/")) {
    return fallback;
  }

  // "//evil.com" is protocol-relative - it starts with a slash but leaves the
  // site. So does "/\evil.com" once the browser folds the backslash.
  if (value.startsWith("//")) {
    return fallback;
  }

  if (UNSAFE_CHARACTERS.test(value)) {
    return fallback;
  }

  try {
    const target = new URL(value, origin);

    // Belt and braces: whatever the string looked like, refuse it if resolving
    // it did not land back on this origin.
    if (target.origin !== new URL(origin).origin) {
      return fallback;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

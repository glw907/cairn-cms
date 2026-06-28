// Validate a post-login redirect target against the site's own origin. The target rides the magic-link
// URL and the confirm handler, so an over-permissive check turns the trusted login mail into an open
// redirect. Parse against the origin and accept ONLY a same-origin result, never a substring match.
// See the extensibility spec, "Redirect validation and cookie attributes", and OWASP Unvalidated
// Redirects.

/** A safe same-origin path-and-query for `target`, or null when it is absent or points elsewhere. */
export function validateRedirect(target: string | null, origin: string): string | null {
  if (!target) return null;
  // Reject byte sequences that browsers normalize into a host before we parse: a leading slash must be
  // a single forward slash, never // or /\ or \/, and there must be no scheme.
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\') || target.startsWith('\\')) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(target, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  return url.pathname + url.search;
}

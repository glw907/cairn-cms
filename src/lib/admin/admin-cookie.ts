// The admin preference cookie string, kept pure so a unit test can reach the https branch that a
// browser component test on http://localhost cannot.

/**
 * Builds the `document.cookie` string for an admin preference: path-scoped to `/admin`, a year
 * long, `samesite=lax`, and `secure` only when the page was served over https.
 */
export function adminCookie(name: string, value: string, secure: boolean): string {
  return `${name}=${value}; path=/admin; max-age=31536000; samesite=lax${secure ? '; secure' : ''}`;
}

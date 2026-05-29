/**
 * Returns the site's public origin from configuration.
 *
 * The origin is always config-derived, never read from a request header, so a
 * forged Host header cannot redirect a magic link (spec 7.1, risk H3).
 *
 * @throws Error when `PUBLIC_ORIGIN` is unset or empty.
 */
export function requireOrigin(env: { PUBLIC_ORIGIN?: string }): string {
  const origin = env.PUBLIC_ORIGIN;
  if (!origin) {
    throw new Error('PUBLIC_ORIGIN is not configured');
  }
  return origin;
}

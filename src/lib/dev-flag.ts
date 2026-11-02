// cairn-cms: the CAIRN_DEV_BACKEND flag, its truthiness rule, and the local-host predicate its
// refusal and the CSRF cookie decision read. Two sites read this module rather than hand-writing
// a second copy: `sveltekit/guard.ts` (the admin guard, which mounts only in a production build
// and refuses on the flag alone) and `sveltekit/csrf.ts` (which reads only the local-host
// predicate). The refusal rule is in docs/internal/engine-rulings.md, `dev-backend-flag-refusal`.
//
// It sits at the lib root and imports nothing, so any module can read it without risking an
// import cycle.
export const CAIRN_DEV_BACKEND_FLAG = 'CAIRN_DEV_BACKEND';

/** The shared refusal message every dev-backend-leak site throws or returns. */
export const CAIRN_DEV_BACKEND_MESSAGE =
  'cairn: the dev backend flag is set in a deployed environment. Unset CAIRN_DEV_BACKEND.';

/**
 * Decide whether one raw env read has the dev-backend flag live, the single truthiness rule every
 * read site shares.
 *
 * `'1'` is the documented shell form (`CAIRN_DEV_BACKEND=1 npm run dev`) and `true` is the boolean
 * a wrangler var can carry. Nothing else counts: `'true'`, `'yes'`, and `'0'` are all unset here,
 * deliberately, since no cairn documentation ever tells an operator to write them, and a wider
 * rule would turn a typo into a production outage.
 */
export function isDevBackendFlagSet(raw: unknown): boolean {
  return raw === '1' || raw === true;
}

/**
 * Decide whether a hostname names a local development host (`wrangler dev`, a local preview
 * server, a `.localhost` alias). Each caller supplies its framing for what the answer means:
 * a cookie-name choice or a help-page trigger. The hostname alone is client-controlled off
 * Cloudflare, so it is never a trustworthy deployment verdict.
 */
export function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
}

/**
 * Read `PUBLIC_ORIGIN` from the Worker env the caller passes, the `env` the Workers runtime
 * exports. The read has one source: a process-level `PUBLIC_ORIGIN` carries no meaning
 * here, so the answer never depends on the shell the runtime was started from. An empty string
 * counts as absent, since a var set to `''` configures nothing.
 *
 * `csrfSecure` (`sveltekit/csrf.ts`) reads through this one function, so the cookie-name decision
 * resolves the origin one way.
 */
export function readPublicOrigin(env: unknown): string | undefined {
  const bindings = typeof env === 'object' && env !== null ? (env as Record<string, unknown>) : undefined;
  const value = bindings?.PUBLIC_ORIGIN;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

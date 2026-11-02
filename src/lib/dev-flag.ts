// cairn-cms: the CAIRN_DEV_BACKEND flag, its truthiness rule, the local-host predicate the https
// help page and the CSRF cookie decision read, and the dev-only text of an unmapped-target refusal.
// `sveltekit/guard.ts` reads the flag, and refuses on it alone, because the guard mounts only in a
// production build. `sveltekit/csrf.ts` reads the local-host predicate. `sveltekit/section-action.ts`
// shares the refusal text with the guard.
//
// It sits at the lib root and imports nothing, so any module can read it without risking an
// import cycle.
export const CAIRN_DEV_BACKEND_FLAG = 'CAIRN_DEV_BACKEND';

/** The refusal message the guard returns; the dev package's handle keeps a copy of it. */
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

/**
 * Name the fix for a missing access rule, but only on a local dev-backend request. The signal is
 * `event.locals.cairnBackend`, which only the dev handle sets and a production request leaves
 * unset, so a deployed site's 403 never says which targets the access map lacks. Returns null for
 * any other reason or when the backend is unset, and the caller keeps its generic refusal.
 */
export function localNoRuleMessage(reason: string, target: string, cairnBackend: unknown): string | null {
  if (reason !== 'no_rule' || !cairnBackend) return null;
  return `No access rule for ${target}. Add it to the adapter's access map.`;
}

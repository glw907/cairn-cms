// cairn-cms: the CAIRN_DEV_BACKEND flag, its truthiness rule, and the local-host predicate its
// refusals and the CSRF cookie decision all read. Three sites read this module rather than
// hand-writing a second copy: `sveltekit/guard.ts` (the admin guard, which mounts only in a
// production build and refuses on the flag alone), `auth-channel/factory.ts` (one factory
// instance serves both dev and prod, so it additionally requires a deployed request before
// refusing), and `sveltekit/csrf.ts` (which reads only the local-host predicate). A divergent
// second wording would violate the read-from-the-source rule this pass's own Task 1 enforces;
// the two flag refusals diverge on WITNESS, never on message, and each states why where it fires
// (Task 9, ruling 4 as letter-amended: refuse when the flag is set AND the request is deployed;
// docs/internal/engine-rulings.md, `dev-backend-flag-refusal`).
//
// It sits at the lib root rather than under `auth-channel/`, where it started, because its
// consumers now span `sveltekit/` and `auth-channel/`. It imports nothing, so any module can read
// it without risking an import cycle.
export const CAIRN_DEV_BACKEND_FLAG = 'CAIRN_DEV_BACKEND';

/** The shared refusal message every dev-backend-leak site throws or returns. */
export const CAIRN_DEV_BACKEND_MESSAGE =
  'cairn: the dev backend flag is set in a deployed environment. Unset CAIRN_DEV_BACKEND.';

/**
 * Decide whether one raw env read has the dev-backend flag live, the single truthiness rule every
 * read site shares so a value that trips the guard cannot slip past the channel factory.
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
 * server, a `.localhost` alias). Each caller supplies its own framing for what the answer means:
 * a deployment witness, a cookie-name choice, or a help-page trigger. The hostname alone is
 * client-controlled off Cloudflare, so a caller that needs a trustworthy deployment verdict reads
 * {@link isDeployedHost} instead of calling this on `event.url.hostname` directly.
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
 * Read `PUBLIC_ORIGIN` from whichever env source this runtime carries it in: a Cloudflare Worker
 * var lands on `platform.env`, an adapter-node OS var on `process.env`. The adapter-node half is
 * what makes {@link isDeployedHost} work at all on the deployment where the Host header is most
 * freely forged, so it is not an optional convenience.
 */
function readPublicOrigin(platformEnv: unknown): string | undefined {
  const fromPlatform =
    typeof platformEnv === 'object' && platformEnv !== null
      ? (platformEnv as Record<string, unknown>).PUBLIC_ORIGIN
      : undefined;
  if (typeof fromPlatform === 'string' && fromPlatform.length > 0) return fromPlatform;
  const fromProcess = typeof process !== 'undefined' ? process.env?.PUBLIC_ORIGIN : undefined;
  return typeof fromProcess === 'string' && fromProcess.length > 0 ? fromProcess : undefined;
}

/**
 * Decide whether this request is being served by a deployed runtime rather than local
 * development, the witness a dev-backend refusal pairs with the flag itself.
 *
 * `event.url` derives from the client `Host` header everywhere except Cloudflare, so a caller who
 * asked `isLocalHost(event.url.hostname)` alone could be talked out of refusing by a forged
 * `Host: localhost`. The site's own configured `PUBLIC_ORIGIN` is not client-controlled, so it is
 * consulted first: a `PUBLIC_ORIGIN` naming a non-local host settles the question outright,
 * whatever the request claims about itself. The rule is monotonic toward refusing. A configuration
 * can force a deployed verdict but can never talk one down, so a `PUBLIC_ORIGIN` that names a
 * local host (or is absent, or does not parse) leaves the request's own hostname to decide, the
 * behavior a site with no `PUBLIC_ORIGIN` at all keeps.
 *
 * The residual is honest and documented (docs/extend/security-model.md): a deployment that sets
 * no `PUBLIC_ORIGIN` still rests on the Host-derived fallback.
 */
export function isDeployedHost(event: { url: URL; platform?: { env?: unknown } | undefined }): boolean {
  const origin = readPublicOrigin(event.platform?.env);
  if (origin !== undefined) {
    try {
      if (!isLocalHost(new URL(origin).hostname)) return true;
    } catch {
      // An unparseable PUBLIC_ORIGIN decides nothing; the request's own hostname answers below.
    }
  }
  return !isLocalHost(event.url.hostname);
}

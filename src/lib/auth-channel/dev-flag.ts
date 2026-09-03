// cairn-cms: the CAIRN_DEV_BACKEND flag, refused wherever a deployed runtime can see it live.
// Two sites read this module rather than hand-writing a second wording: `sveltekit/guard.ts`
// (the admin guard, which mounts only in a production build and refuses on the flag alone) and
// `auth-channel/factory.ts` (one factory instance serves both dev and prod, so it additionally
// requires a non-local request before refusing). A divergent second wording would violate the
// read-from-the-source-rule this pass's own Task 1 enforces; the two refusals diverge on
// WITNESS, never on message, and each states why where it fires (Task 9, ruling 4 as
// letter-amended: refuse when the flag is set AND the request is non-local).
export const CAIRN_DEV_BACKEND_FLAG = 'CAIRN_DEV_BACKEND';

/** The shared refusal message every dev-backend-leak site throws or returns. */
export const CAIRN_DEV_BACKEND_MESSAGE =
  'cairn: the dev backend flag is set in a deployed environment. Unset CAIRN_DEV_BACKEND.';

/**
 * Local development (`wrangler dev`, a local preview server) legitimately runs with the dev
 * backend flag live; a deployed host never does. The hostname comes from the client `Host`
 * header, so a caller that treats this as an auth check on its own is misusing it: it is a
 * deployment witness, paired with the flag read at each call site, never a standalone gate.
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

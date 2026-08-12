// Resolving the pasted Cloudflare API token that every chapter-2 call signs with. Pure over the
// in-memory record, like account.mjs's ensureAccountId: this returns the resolved token and
// never touches the state store itself, so the caller (chapter2.mjs) decides when and whether to
// persist it.
//
// The prefill URL's permission keys are the one thing here that must be verified against the
// live dashboard before shipping, never assumed from the vendor's docs alone: Cloudflare's own
// template mechanism fails an unrecognized key SILENTLY, rendering an empty "Select..." control
// in its place rather than reporting an error (observed 2026-08-11,
// docs/internal/2026-08-11-t4a-domain-spike.md, "Addendum: the minted spike token"). A key that
// looks plausible is not evidence, so PREFILL_PERMISSION_KEYS below records what was actually
// seen for each key.
//
// What validateToken can and cannot prove is worth being exact about. It reads zones, so it
// proves the token authenticates and carries zone read, which catches a typo, an expired token,
// and a paste from the wrong account. It cannot prove a WRITE permission, because no read call
// exercises one. A token missing zone create or DNS edit therefore still passes here and fails
// later at the call that needs it, where api.mjs maps the 403 to token-scope-missing and the row
// names the permission Cloudflare says is absent (spike amendment 2). That late failure is
// legible by design; do not add a write call here to make it early.
import { promptSecret } from '../prompts.mjs';
import { openBrowser as defaultOpenBrowser } from '../github/open.mjs';
import { makeApi } from './api.mjs';

/**
 * The `permissionGroupKeys` Cloudflare's create-token template URL accepts: one entry per
 * requested permission, always at `edit`. Verified against the live dashboard rather than the
 * vendor's docs alone, 2026-08-11 (docs/internal/2026-08-11-t4a-domain-spike.md, "Addendum: the
 * minted spike token"). Do not add a key here without opening the resulting URL and confirming
 * Cloudflare actually filled it in; the dashboard gives no error for a key it does not recognize.
 *
 * - `zone`, `dns`, `workers_scripts`: observed to resolve correctly.
 * - `ssl_and_certificates`: the vendor's own documented key for the Zone-scoped "SSL and
 *   Certificates" permission
 *   (https://developers.cloudflare.com/fundamentals/api/how-to/account-owned-token-template/),
 *   carried here on the strength of that documentation; not yet independently observed to
 *   resolve. A shorter, plausible-looking alternative key was tried live instead and rendered
 *   the empty, unresolved control; it is deliberately never used here (see the spike doc's
 *   "Addendum: the minted spike token" for the exact key and the observation).
 *
 * Email Sending, which this chapter's second half needs, is deliberately absent: the dashboard
 * offers it as an Account-scope permission group (its name confirmed live, 2026-08-11), but
 * Cloudflare documents no template key for it, so the URL cannot prefill it. EMAIL_SENDING_HINT
 * below tells the admin to add it by hand instead.
 * @type {Array<{ key: string, type: 'edit' }>}
 */
export const PREFILL_PERMISSION_KEYS = [
  { key: 'zone', type: 'edit' },
  { key: 'dns', type: 'edit' },
  { key: 'workers_scripts', type: 'edit' },
  { key: 'ssl_and_certificates', type: 'edit' },
];

/** The name Cloudflare pre-fills into the create-token page's own "Token name" field. */
const PREFILL_TOKEN_NAME = 'cairn create-cairn-site';

/**
 * The prefilled create-token page: every permission in PREFILL_PERMISSION_KEYS at edit, over
 * every account and every zone. Format documented by Cloudflare
 * (https://developers.cloudflare.com/fundamentals/api/how-to/account-owned-token-template/);
 * `accountId=*` and `zoneId=all` were both confirmed live to render as "All accounts" and "All
 * zones", 2026-08-11.
 * @type {string}
 */
export const PREFILL_URL = (() => {
  const params = new URLSearchParams({
    permissionGroupKeys: JSON.stringify(PREFILL_PERMISSION_KEYS),
    accountId: '*',
    zoneId: 'all',
    name: PREFILL_TOKEN_NAME,
  });
  return `https://dash.cloudflare.com/profile/api-tokens?${params.toString()}`;
})();

/**
 * Printed alongside the prefill link: Cloudflare's template mechanism has no key for the Email
 * Sending permission group this chapter's second half needs, so the admin has to add it by hand.
 */
export const EMAIL_SENDING_HINT =
  "Cloudflare's link cannot pre-select the Email Sending permission this site will need later, " +
  'so before you create the token, also add Account > Email Sending > Edit in the permission ' +
  'picker.';

/** The question the first paste and the retry both ask, so the retry reads as the same request. */
const PASTE_PROMPT = 'Paste your Cloudflare API token';

/**
 * The shapes a real Cloudflare API token takes. Used only to catch a token mistakenly placed on
 * the command line, never to validate a pasted token (that is what validateToken proves, against
 * the live API).
 *
 * Two forms, because Cloudflare changed the format and both are in circulation. The current one
 * carries a `cf..._` prefix and runs well past 40 characters: a token minted 2026-08-11 for the
 * T4a spike was 53. The legacy form is a bare 40 characters from the URL-safe alphabet. Matching
 * only the legacy form, as this guard first did, meant it could not catch any token Cloudflare
 * issues today, which is the whole population it exists to catch. Test both shapes; a fixture
 * built by repeating one character 40 times proves only the form nobody is issued any more.
 */
const TOKEN_SHAPES = [/^cf[a-z]{2}_[A-Za-z0-9_-]{20,}$/, /^[A-Za-z0-9_-]{40}$/];

/**
 * Find the first argv entry that looks like a Cloudflare API token, checking both a bare value
 * (`--flag value`, two argv entries) and a combined `--flag=value` entry. No flag in this tool's
 * args.mjs carries a token today, and none ever should: this is a defensive net against a
 * mistake, not a response to one specific flag, per the plan's "a secret never appears in argv"
 * constraint.
 * @param {string[]} argv the argument vector to scan
 * @returns {string | undefined} the offending argv entry, or undefined when none matches
 */
function findTokenShapedArg(argv) {
  return argv.find((arg) => {
    const equals = arg.indexOf('=');
    const value = equals === -1 ? arg : arg.slice(equals + 1);
    return TOKEN_SHAPES.some((shape) => shape.test(value));
  });
}

/**
 * Check a candidate token against the live API rather than trusting the prefill or a saved value.
 * `listZones` is the call: a GET, so it costs nothing to retry, and its 403/400 mapping in
 * api.mjs (spike-corrected 2026-08-11) separates an unusable token from an underscoped one. This
 * establishes that the token authenticates and can read zones. It does not establish that the
 * token can write; see the module header for why that gap is deliberate.
 * @param {string} token the token to check
 * @param {{ dir: string | undefined, accountId: string | undefined }} scope the site's dir and
 *  account id, both interpolated into any thrown row
 * @returns {Promise<{ ok: true } | { ok: false, error: Error & { catalogue: object } }>}
 */
async function validateToken(token, { dir, accountId }) {
  const api = makeApi({ token, accountId, dir });
  try {
    await api.listZones();
    return { ok: true };
  } catch (error) {
    if (!error?.catalogue) throw error;
    return { ok: false, error };
  }
}

/**
 * @typedef {object} EnsureApiTokenInput
 * @property {object | null} [record] the site's current in-memory state record; reads
 *  `record.dir`, `record.cloudflare?.accountId`, and `record.cloudflare?.apiToken`, and never
 *  persists anything itself, mirroring account.mjs's ensureAccountId
 * @property {(line: string) => void} log receives one printed line per call; never receives the
 *  token itself, on any branch
 * @property {(url: string, log: (line: string) => void) => Promise<void>} [openBrowser] opens the
 *  admin's browser to the create-token page; defaults to open.mjs's real opener, overridden in
 *  tests the same way chapter.mjs's own openBrowser seam is
 * @property {boolean} [yes] true for a non-interactive run; skips the browser and paste prompt
 *  entirely and reads CAIRN_CF_API_TOKEN instead
 * @property {(message: string) => Promise<string>} [promptSecretFn] the paste prompt, a test
 *  seam defaulting to prompts.mjs's own promptSecret
 * @property {Record<string, string | undefined>} [env] the environment CAIRN_CF_API_TOKEN is
 *  read from under `yes`; defaults to `process.env`, injected in tests
 * @property {string[]} [argv] the argument vector scanned for a mistakenly-passed token; defaults
 *  to `process.argv.slice(2)`, injected in tests
 */

/**
 * Resolve the Cloudflare API token every chapter-2 call signs with. A saved token that still
 * validates is reused with no browser trip; one that no longer does sends the admin through the
 * same prefilled create-token page a fresh run would use. An underscoped paste gets exactly one
 * more try before this throws the token-scope-missing row the admin has to act on. An unattended
 * run never prompts at all: it reads CAIRN_CF_API_TOKEN, and refuses outright, before doing
 * anything else, when argv itself looks like it is carrying the token, since a flag is a place a
 * secret must never sit (visible to every other process on the machine, and it tends to end up in
 * shell history).
 * @param {EnsureApiTokenInput} args
 * @returns {Promise<string>} the resolved, validated token
 */
export async function ensureApiToken({
  record,
  log,
  openBrowser = defaultOpenBrowser,
  yes = false,
  promptSecretFn = promptSecret,
  env = process.env,
  argv = process.argv.slice(2),
}) {
  const offender = findTokenShapedArg(argv);
  if (offender) {
    throw new Error(
      `The command line carries what looks like a Cloudflare API token ("${offender}"). A ` +
        'token must never be passed as a flag or argument: argv is visible to every other ' +
        'process on the machine and often ends up in shell history.\n' +
        'Next: remove it from the command line and set CAIRN_CF_API_TOKEN in the environment ' +
        'instead.',
    );
  }

  const scope = { dir: record?.dir, accountId: record?.cloudflare?.accountId };

  const saved = record?.cloudflare?.apiToken;
  if (saved) {
    const result = await validateToken(saved, scope);
    if (result.ok) return saved;
    log('Your saved Cloudflare API token no longer works; you will need to create a new one.');
  }

  if (yes) {
    const fromEnv = env.CAIRN_CF_API_TOKEN;
    if (!fromEnv) {
      throw new Error(
        'This run is not interactive, so it cannot open a browser to create a Cloudflare API ' +
          'token or ask you to paste one.\n' +
          'Next: set CAIRN_CF_API_TOKEN in your environment to a token scoped the way the ' +
          'create-token page asks for, then re-run.',
      );
    }
    const result = await validateToken(fromEnv, scope);
    if (!result.ok) throw result.error;
    return fromEnv;
  }

  await openBrowser(PREFILL_URL, log);
  log(EMAIL_SENDING_HINT);

  const pasted = await promptSecretFn(PASTE_PROMPT);
  const firstTry = await validateToken(pasted, scope);
  if (firstTry.ok) return pasted;

  // One retry, not a loop: a mistyped or half-copied paste is worth a second chance, and a token
  // that fails twice is missing a permission the admin has to go and add, which no further
  // re-prompt can fix.
  log('That token did not work; check it and paste it again.');
  const repasted = await promptSecretFn(PASTE_PROMPT);
  const secondTry = await validateToken(repasted, scope);
  if (secondTry.ok) return repasted;
  throw secondTry.error;
}

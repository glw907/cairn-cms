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
 * Every key here has been opened in the dashboard and seen to fill its row. `zone`, `dns`, and
 * `workers_scripts` were confirmed 2026-08-11; `ssl_and_certificates` and `email_sending` were
 * confirmed by a second probe the same day, which loaded all five plus two controls and reported
 * five filled.
 *
 * Two keys are deliberately absent because they were observed NOT to resolve, and both rendered
 * an empty control rather than any error: `ssl_certs`, a plausible-looking guess at the SSL
 * permission whose real key is `ssl_and_certificates`, and `email`, a guess at the Email Sending
 * permission whose real key is `email_sending`. Cloudflare documents no template key for Email
 * Sending at all; `email_sending` is known to work only because it was tried.
 * @type {Array<{ key: string, type: 'edit' }>}
 */
export const PREFILL_PERMISSION_KEYS = [
  { key: 'zone', type: 'edit' },
  { key: 'dns', type: 'edit' },
  { key: 'workers_scripts', type: 'edit' },
  { key: 'ssl_and_certificates', type: 'edit' },
  { key: 'email_sending', type: 'edit' },
];

/**
 * The three keys chapter 3 (Builds connect) adds to PREFILL_PERMISSION_KEYS. Verified live
 * 2026-08-12 (docs/internal/2026-08-12-t4c-builds-spike.md), one at a different confidence than
 * the other two:
 *
 * `workers_ci` was seen filling its row on the live dashboard, 2026-08-12, the same bar every key
 * above met.
 *
 * `d1` has NOT yet been confirmed on the live dashboard. Its requirement is observed, not
 * guessed: a Builds deploy of a cairn-shaped scaffold, run with a token missing it, died on
 * `GET /d1/database/{id}` with `Authentication error [code: 10000]`.
 *
 * `workers_r2` has NOT yet been confirmed on the live dashboard either, and unlike `d1` its
 * requirement is inferred, not observed: the failing build above died at the first D1 binding
 * and never reached the R2 binding, so no request ever exercised this permission directly. A
 * second token carrying both `d1` and `workers_r2` deployed the same scaffold successfully, which
 * is the evidence for including it, not a request log entry naming it.
 *
 * `d1` and `workers_r2` still owe one live dashboard confirmation before this list ships, the
 * same bar `workers_ci` and every key in PREFILL_PERMISSION_KEYS already cleared.
 * @type {Array<{ key: string, type: 'edit' }>}
 */
const BUILDS_PERMISSION_KEYS = [
  { key: 'workers_ci', type: 'edit' },
  { key: 'd1', type: 'edit' },
  { key: 'workers_r2', type: 'edit' },
];

/**
 * The chapter-3 union key set: PREFILL_PERMISSION_KEYS plus BUILDS_PERMISSION_KEYS. One token,
 * pasted once, has to authorize every call chapter 2 and chapter 3 both make (module header,
 * "The narrower reading, and why the chapter does not take it").
 * @type {Array<{ key: string, type: 'edit' }>}
 */
export const CHAPTER3_PERMISSION_KEYS = [...PREFILL_PERMISSION_KEYS, ...BUILDS_PERMISSION_KEYS];

/** The name Cloudflare pre-fills into the create-token page's own "Token name" field. */
const PREFILL_TOKEN_NAME = 'cairn create-cairn-site';

/**
 * Build the prefilled create-token page for a given permission-group key list, over every
 * account and every zone. Format documented by Cloudflare
 * (https://developers.cloudflare.com/fundamentals/api/how-to/account-owned-token-template/);
 * `accountId=*` and `zoneId=all` were both confirmed live to render as "All accounts" and "All
 * zones", 2026-08-11.
 * @param {Array<{ key: string, type: 'edit' }>} [keys] the permission-group keys to request;
 *  defaults to PREFILL_PERMISSION_KEYS, the chapter-2 set
 * @returns {string} the full prefilled create-token URL
 */
export function prefillUrl(keys = PREFILL_PERMISSION_KEYS) {
  const params = new URLSearchParams({
    permissionGroupKeys: JSON.stringify(keys),
    accountId: '*',
    zoneId: 'all',
    name: PREFILL_TOKEN_NAME,
  });
  return `https://dash.cloudflare.com/profile/api-tokens?${params.toString()}`;
}

/**
 * The chapter-2 prefilled create-token page, built from PREFILL_PERMISSION_KEYS. Byte-stable
 * across the prefillUrl seam's addition: this is exactly `prefillUrl()`'s default-argument
 * result, kept as its own export so chapter 2's callers need not change.
 * @type {string}
 */
export const PREFILL_URL = prefillUrl();

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
 * @property {Array<{ key: string, type: 'edit' }>} [permissionKeys] the permission-group keys
 *  the browser prefill requests; defaults to PREFILL_PERMISSION_KEYS, the chapter-2 set. Chapter
 *  3 passes CHAPTER3_PERMISSION_KEYS. Only the prefill URL changes; validateToken always calls
 *  listZones regardless of which keys were requested.
 */

/**
 * Try a saved token, validating it against the live API. Returns `{ ok: true, token }` for one
 * that still validates, or `{ ok: false }`, after logging the "no longer works" line, for no
 * saved token or one that no longer does; either shape tells the caller whether to fall through
 * to its own next source. A failure carries the validation error, so a caller holding the same
 * string from another source can throw it rather than spend a second round trip proving it again.
 * @param {string | undefined} saved the saved token, if any
 * @param {{ dir: string | undefined, accountId: string | undefined }} scope forwarded to
 *  validateToken
 * @param {(line: string) => void} log receives the "no longer works" line when validation fails
 * @returns {Promise<{ ok: true, token: string } | { ok: false, error?: Error & { catalogue: object } }>}
 *  `error` is set whenever a saved token was present and failed validation, absent when there was
 *  no saved token to try
 */
async function trySavedToken(saved, scope, log) {
  if (!saved) return { ok: false };
  const result = await validateToken(saved, scope);
  if (result.ok) return { ok: true, token: saved };
  log('Your saved Cloudflare API token no longer works; you will need to create a new one.');
  return { ok: false, error: result.error };
}

/**
 * Resolve the Cloudflare API token every chapter-2 call signs with. A saved token that still
 * validates is reused with no browser trip; one that no longer does sends the admin through the
 * same prefilled create-token page a fresh run would use. An underscoped paste gets exactly one
 * more try before this throws the token-scope-missing row the admin has to act on. An unattended
 * run never prompts at all: it refuses outright, before doing anything else, when argv itself
 * looks like it is carrying the token, since a flag is a place a secret must never sit (visible
 * to every other process on the machine, and it tends to end up in shell history).
 *
 * Under `yes`, CAIRN_CF_API_TOKEN takes precedence over a saved token whenever the two differ: an
 * operator who set the variable is expressing intent a saved value cannot override, so that token
 * is validated and used (or, if it fails validation, thrown, never silently falling back to the
 * saved one). Only when there is no differing env value does a valid saved token get reused; with
 * neither a usable saved token nor an env value, this throws, naming the variable to set.
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
  permissionKeys = PREFILL_PERMISSION_KEYS,
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

  if (yes) {
    const fromEnv = env.CAIRN_CF_API_TOKEN;
    if (fromEnv && fromEnv !== saved) {
      const result = await validateToken(fromEnv, scope);
      if (!result.ok) throw result.error;
      return fromEnv;
    }
    // Past the branch above, CAIRN_CF_API_TOKEN is either unset or the same string as the saved
    // token, so this one validation covers both sources.
    const savedResult = await trySavedToken(saved, scope, log);
    if (savedResult.ok) return savedResult.token;
    if (!fromEnv) {
      throw new Error(
        'This run is not interactive, so it cannot open a browser to create a Cloudflare API ' +
          'token or ask you to paste one.\n' +
          'Next: set CAIRN_CF_API_TOKEN in your environment to a token scoped the way the ' +
          'create-token page asks for, then re-run.',
      );
    }
    // The env value is that same rejected string, so its own validation is already spent: throw
    // what it produced rather than asking Cloudflare the identical question twice.
    throw savedResult.error;
  }

  const savedResult = await trySavedToken(saved, scope, log);
  if (savedResult.ok) return savedResult.token;

  await openBrowser(prefillUrl(permissionKeys), log);

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

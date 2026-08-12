// Creating or adopting the Cloudflare zone chapter 2 needs, and checking whether the admin's
// domain has finished delegating to it. Every finding below traces to the T4a domain spike
// (docs/internal/2026-08-11-t4a-domain-spike.md) and its two addenda, dated 2026-08-11 and
// 2026-08-12 UTC.
//
// createOrAdoptZone reads before it writes: it lists zones by name first and adopts on a hit,
// posting a create only on a miss, the same discipline email.mjs's ensureSendingDomain already
// follows for its own non-idempotent write. A live defect (T4b.1) showed why the order matters:
// an owner whose zone already exists but whose token cannot create zones used to die on a 403
// from the create it never needed, because the create was tried unconditionally and only a 1061
// response ever triggered the adopt lookup. The list-by-name check is now the main door.
//
// The three zone-create shapes this module recognizes (1061 already-exists, 1428 zone-hold, 1002
// invalid-domain) are matched on Cloudflare's numeric `errors[0].code`, carried through by
// api.mjs on the thrown error's `api` field. They are deliberately NOT matched on the message
// text. A code is part of the API contract; the prose beside it is not, and Cloudflare can reword
// it in a release note nobody reads. A text match would then stop recognizing the shape, and it
// would fail by quietly falling through to the generic row rather than by breaking a test.
//
// On 1061, this module does NOT read ownership out of the body. The observed body,
// `{"success":false,"errors":[{"code":1061,"message":"<name> already exists"}],"messages":[],
// "result":null}`, carries no account or ownership field, so it cannot tell a zone this account
// holds from one held elsewhere (spike, "the zone-already-exists body, and 1061 does NOT
// discriminate by account"). A GET /zones?name=<domain> lookup after the fact settles it, the
// same shape as the list-first lookup above: a hit is ours to adopt, a miss is the
// zone-already-exists row, which now means the foreign-owner case alone. Since the list-first
// check above already missed by the time a create is even attempted, 1061 here means a second
// run raced this one between that list and this create; the lookup stays as that race's guard,
// not as the only door.
//
// nameServers is always read from a zone RE-READ, never trusted from the create response: no
// externally registered domain was ever observed going through POST /zones, so whether a create
// response populates name_servers at all is unknown (amendment 16). The scratch domain
// (registered at Cloudflare itself) went created-to-active in 0.36 seconds and never passed
// through `pending`, so `alreadyActive` short-circuits a delegation wait that domain would
// otherwise stage forever.
//
// checkDelegation's own NS lookup is a plain recursive one, deliberately not the
// authoritative-nameserver read records.mjs's readCurrentRecords uses. A delegation check is
// re-run on every resumed invocation until it reports 'active', so a stale recursive answer here
// self-corrects on the next run; it carries none of readCurrentRecords' silent-data-loss risk,
// where a stale negative is read once and trusted forever.
import { resolveNs as systemResolveNs } from 'node:dns/promises';
import { cloudflareError } from './catalogue.mjs';

/** Matches a Cloudflare-assigned nameserver hostname, `<name>.ns.cloudflare.com`. */
const CLOUDFLARE_NS_PATTERN = /\.ns\.cloudflare\.com$/i;

/**
 * Cloudflare's `errors[0].code` values for the three zone-create outcomes this chapter handles,
 * each captured live in the T4a spike.
 */
const ZONE_CREATE_CODES = {
  /** The name is already a zone somewhere, on this account or another. Body carries no owner. */
  alreadyExists: 1061,
  /** A zone hold on the name blocks creation until the current holder removes it. */
  zoneHold: 1428,
  /** The name is not a valid domain. It reaches here as free text from the admin. */
  invalidDomain: 1002,
};

/**
 * The Cloudflare error code behind a failed zone create, or undefined when the failure did not
 * come from api.mjs's mapped throw. Reading the code rather than the message is what keeps this
 * detection from depending on Cloudflare's wording.
 * @param {unknown} err the error api.createZone threw
 * @returns {number | undefined} the raw `errors[0].code`
 */
function zoneCreateCode(err) {
  if (err?.catalogue?.code !== 'zone-create-failed') return undefined;
  return err.api?.code;
}

/**
 * Look the domain up among this account's zones by exact name. Cloudflare's `name` filter is the
 * server-side narrowing, and the exact-name find is the client-side confirmation, since a filtered
 * list is not a promise of an exact match.
 * @param {ReturnType<typeof import('./api.mjs').makeApi>} api the Cloudflare API client
 * @param {string} domain the domain to look for
 * @returns {Promise<{ id: string, name: string } | undefined>} the matching zone, or undefined
 */
async function findZoneByName(api, domain) {
  const matches = await api.listZones({ name: domain });
  return matches.find((zone) => zone.name === domain);
}

/**
 * Resolve the zone id for the domain: list zones by name first and adopt on a hit, or create the
 * zone when the list misses. The list is the primary door, mirroring email.mjs's
 * ensureSendingDomain, since a create is a non-idempotent write and a token that cannot create
 * must not be forced through one for a zone that already exists. The 1061-triggered adopt inside
 * the create's catch stays as a race guard for the gap between this function's own list and its
 * own create, not as the only door. Returns the id and nothing else, so no other field can reach
 * the caller from the create response, which is exactly the trust ensureZone must not place in it.
 * @param {object} args
 * @param {ReturnType<typeof import('./api.mjs').makeApi>} args.api the Cloudflare API client
 * @param {string} args.domain the domain to create a zone for
 * @param {string} args.dir the `--dir` value, interpolated into every catalogued row raised here
 * @param {(line: string) => void} args.log receives the line printed when a zone is adopted
 * @returns {Promise<string>} the found, created, or adopted zone's id
 */
async function createOrAdoptZone({ api, domain, dir, log }) {
  // Both doors below (the list-first hit and the race guard) end the same way, so the line the
  // owner reads on an adopt is written once.
  function adopt(zone) {
    log(`${domain} is already a Cloudflare zone on this account; using it.`);
    return zone.id;
  }

  const hit = await findZoneByName(api, domain);
  if (hit) return adopt(hit);

  try {
    const created = await api.createZone(domain);
    return created.id;
  } catch (err) {
    switch (zoneCreateCode(err)) {
      case ZONE_CREATE_CODES.alreadyExists: {
        // This function's own list above already missed, so a 1061 here means another run's
        // create won a race in the gap between that list and this create, not that the list was
        // wrong. The 1061 body still names the zone and nothing else, so ownership still comes
        // from a lookup, kept here purely as the race guard rather than the main door.
        const raceHit = await findZoneByName(api, domain);
        if (!raceHit) throw cloudflareError('zone-already-exists', { dir, domain });
        return adopt(raceHit);
      }
      case ZONE_CREATE_CODES.zoneHold:
        throw cloudflareError('zone-hold', { dir, domain });
      case ZONE_CREATE_CODES.invalidDomain:
        throw cloudflareError('domain-invalid', { dir, domain });
      default:
        throw err;
    }
  }
}

/**
 * @typedef {object} EnsureZoneResult
 * @property {string} zoneId the zone's id, whether newly created or adopted
 * @property {string[]} nameServers the pair Cloudflare assigned, read from a zone re-read rather
 *  than trusted from the create response
 * @property {boolean} alreadyActive true when the zone arrived already active: the
 *  Cloudflare-registrar path, which never passes through a pending state and has nothing to wait
 *  on
 */

/**
 * Resolve the Cloudflare zone for the admin's domain: adopt it when a list-by-name already finds
 * it, or create it when the list misses. Reading before writing means a token that cannot create
 * zones never needs to, for a domain whose zone already exists. Pure over the record: reads
 * `record.dir` and `record.cloudflare.domain`, and never persists anything itself, mirroring
 * account.mjs's ensureAccountId and prefill.mjs's ensureApiToken; the caller decides when to save
 * the result.
 * @param {object} args
 * @param {object} args.record the site's in-memory state record; reads `record.dir` and
 *  `record.cloudflare.domain`
 * @param {ReturnType<typeof import('./api.mjs').makeApi>} args.api the Cloudflare API client
 *  returned by makeApi
 * @param {(line: string) => void} args.log receives one printed line per call
 * @returns {Promise<EnsureZoneResult>} the resolved zone id, nameservers, and activation state
 */
export async function ensureZone({ record, api, log }) {
  const { dir } = record;
  const { domain } = record.cloudflare;

  const zoneId = await createOrAdoptZone({ api, domain, dir, log });

  const zone = await api.getZone(zoneId);
  return {
    zoneId,
    nameServers: zone.name_servers,
    alreadyActive: zone.status === 'active',
  };
}

/**
 * Check whether the admin's domain has finished delegating to this zone's assigned nameservers.
 * An independent NS lookup, compared against the assigned pair, distinguishes four states: still
 * at the old registrar (`pending`), pointed at Cloudflare but a different account's pair
 * (`wrong-nameservers`, since one account has exactly one pair, shared by every zone on it),
 * pointed at the right pair but the zone itself has not finished activating (`propagating`), and
 * fully live (`active`). A zone that arrived already active (ensureZone's `alreadyActive`) short
 * circuits to `'active'` without any lookup, since the Cloudflare-registrar path has nothing to
 * wait on.
 * @param {object} args
 * @param {object} args.record the site's in-memory state record; reads
 *  `record.cloudflare.{zoneId,nameServers,domain,alreadyActive}`
 * @param {ReturnType<typeof import('./api.mjs').makeApi>} args.api the Cloudflare API client
 * @param {(domain: string) => Promise<string[]>} [args.resolveNs] the NS lookup, defaulting to
 *  `node:dns/promises`' own `resolveNs`; a test seam
 * @returns {Promise<'pending' | 'wrong-nameservers' | 'propagating' | 'active'>} the delegation state
 */
export async function checkDelegation({ record, api, resolveNs = systemResolveNs }) {
  const { zoneId, nameServers, domain, alreadyActive } = record.cloudflare;
  if (alreadyActive) return 'active';

  let actual;
  try {
    actual = await resolveNs(domain);
  } catch {
    actual = [];
  }

  const actualLower = new Set(actual.map((ns) => ns.toLowerCase()));
  const matchesAssigned = nameServers.every((ns) => actualLower.has(ns.toLowerCase()));

  if (!matchesAssigned) {
    const looksLikeCloudflare = actual.some((ns) => CLOUDFLARE_NS_PATTERN.test(ns));
    return looksLikeCloudflare ? 'wrong-nameservers' : 'pending';
  }

  const zone = await api.getZone(zoneId);
  return zone.status === 'active' ? 'active' : 'propagating';
}

/**
 * Render generic delegation instructions naming the assigned nameserver pair. Deliberately not
 * per-registrar: amendment 16 cut the registrar-instructions table after the scratch domain
 * showed a Cloudflare-registered domain carries no `original_registrar` to key off, and rather
 * than branch on the domains that do, the chapter ships one generic set of steps.
 * @param {string[]} nameServers the pair to name in the instructions
 * @returns {string} the instructions, naming the pair
 */
export function delegationInstructions(nameServers) {
  const pair = nameServers.join(' and ');
  return (
    "Update your domain's nameservers at wherever you manage them today (your registrar, or a " +
    'separate DNS provider if you use one) to the pair Cloudflare assigned this account: ' +
    `${pair}. Every provider's control panel has a nameservers or DNS settings section, though ` +
    'the exact menu name varies. This can take anywhere from a few minutes to 48 hours to take ' +
    'effect.'
  );
}

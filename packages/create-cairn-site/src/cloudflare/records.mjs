// Reading the admin's current DNS records before the new zone takes over, and writing them into
// it behind an explicit confirm. Every finding below traces to the T4a domain spike
// (docs/internal/2026-08-11-t4a-domain-spike.md), particularly its Step 3 and "Addendum 2: the
// scratch domain".
//
// THE DEFECT THIS MODULE EXISTS TO PREVENT: a stale negative DNS cache reads exactly like an
// absent record, and it bites in the exact window this chapter runs in. The spike observed it
// twice on its own scratch domain: seeded MX records returned nothing from a recursive resolver
// while the apex AAAA on the same name resolved in the same batch, then returned normally minutes
// later with nothing in DNS having changed. The negative is cached PER RECORD TYPE, so the apex
// resolving proves nothing about a missing MX, and the failure is silent, because an empty record
// list is exactly what a domain with no mail configured looks like. A carry-over that trusts it
// stops the admin's mail and reports success.
//
// readCurrentRecords therefore prefers the domain's AUTHORITATIVE nameservers, which no recursive
// cache sits in front of: it looks up the domain's own NS records, resolves one of those
// hostnames to an address, and queries that address directly for every probe. Only when that
// fails (the NS lookup itself fails, or none of the NS hostnames resolve to an address) does it
// fall back to a recursive resolver, and `lowConfidence` is set on exactly that fallback, never on
// the ordinary case.
//
// readCurrentRecords refuses to run once the domain's own NS already carries a
// `.ns.cloudflare.com` pair: at that point a probe would read this tool's own writes rather than
// what the admin had before, and the persisted carry-over snapshot (this function's own earlier
// return value, saved by the caller) is the source of truth from there on.
import { cloudflareError } from './catalogue.mjs';
import { defaultResolve, readNsNames, selectAuthoritativeResolver } from './dns.mjs';

/** Matches a Cloudflare-assigned nameserver hostname, `<name>.ns.cloudflare.com`. */
const CLOUDFLARE_NS_PATTERN = /\.ns\.cloudflare\.com$/i;

/**
 * The probe list this chapter reads, fixed rather than open-ended: DNS has no enumeration
 * primitive, so discovery asks an explicit list and cannot see anything else. Matches the T4a
 * design's ruling 4 exactly: apex A/AAAA/MX/TXT/CAA/NS, plus `www`, `mail`, `autodiscover`, and
 * `_dmarc` (DMARC records are always TXT, per RFC 7489), plus every named DKIM selector, probed as
 * both TXT (Google's own publishing form) and CNAME (Fastmail's, observed live on 907.life's own
 * zone in the spike appendix).
 * @type {{ apex: string[], subdomains: Record<string, string[]>, dkimSelectors: string[] }}
 */
export const PROBE_PLAN = {
  apex: ['A', 'AAAA', 'MX', 'TXT', 'CAA', 'NS'],
  subdomains: {
    www: ['A', 'AAAA', 'CNAME'],
    mail: ['A', 'AAAA', 'CNAME'],
    autodiscover: ['A', 'AAAA', 'CNAME'],
    _dmarc: ['TXT'],
  },
  // Not independently observed live beyond 'google' (the spike's own Step 3 run) and 'fm1'
  // (Fastmail's own selector, seen on 907.life's zone in the spike appendix); fm2/fm3 follow
  // Fastmail's documented rotation, and selector1/selector2 are Microsoft 365's documented
  // default pair. A best-effort list, per ruling 4: it cannot see a selector outside it.
  dkimSelectors: ['google', 'fm1', 'fm2', 'fm3', 'selector1', 'selector2'],
};

const METHOD_BY_TYPE = {
  A: 'resolve4',
  AAAA: 'resolve6',
  NS: 'resolveNs',
  CNAME: 'resolveCname',
  TXT: 'resolveTxt',
  MX: 'resolveMx',
  CAA: 'resolveCaa',
};

/** The three CAA tag keys `node:dns`'s resolveCaa can return, one per entry. */
const CAA_TAG_KEYS = ['issue', 'issuewild', 'iodef'];

/**
 * Expand PROBE_PLAN into the flat list of probes to run, in the order their answers are reported:
 * the apex, then each named subdomain, then each DKIM selector. Each entry carries the `host` tag
 * every record found there is stamped with.
 * @param {string} domain the domain being probed
 * @returns {Array<{ host: string, name: string, types: string[] }>} one entry per probe target
 */
function probeTargets(domain) {
  return [
    { host: 'apex', name: domain, types: PROBE_PLAN.apex },
    ...Object.entries(PROBE_PLAN.subdomains).map(([host, types]) => ({
      host,
      name: `${host}.${domain}`,
      types,
    })),
    // Each selector is probed in both publishing forms, TXT and CNAME, since which one a provider
    // uses is the provider's choice and not something this list can know in advance.
    ...PROBE_PLAN.dkimSelectors.map((selector) => ({
      host: `${selector}._domainkey`,
      name: `${selector}._domainkey.${domain}`,
      types: ['TXT', 'CNAME'],
    })),
  ];
}

/**
 * Run one probe, translating `node:dns`'s absence codes into an empty result rather than a
 * thrown error, and mapping anything else onto `records-read-failed`: absence and failure are
 * distinguishable, and only failure aborts the read (the spike's Step 3: `ENODATA` and
 * `ENOTFOUND` are authoritatively absent, anything else is a real read failure).
 * @param {object} resolver the resolver-like object to query
 * @param {string} method the resolver method name (a value of METHOD_BY_TYPE)
 * @param {string} name the DNS name to query
 * @param {string} dir the `--dir` value, interpolated into a thrown row
 * @returns {Promise<unknown[]>} the resolver's answer array, or `[]` on authoritative absence
 */
async function probe(resolver, method, name, dir) {
  try {
    return await resolver[method](name);
  } catch (err) {
    if (err?.code === 'ENODATA' || err?.code === 'ENOTFOUND') return [];
    throw cloudflareError('records-read-failed', { dir });
  }
}

/**
 * Translate one probe's raw answer into this module's typed record shape, tagged with `host` (the
 * probe target it came from) so a caller can reason about which records are apex records without
 * re-deriving it from `name`.
 * @param {string} type the DNS record type probed
 * @param {unknown[]} answer the raw answer from `probe`
 * @param {string} name the DNS name that was probed
 * @param {string} host the probe target's label (`'apex'`, a subdomain, or a DKIM selector host)
 * @returns {Array<object>} zero or more typed records
 */
function translate(type, answer, name, host) {
  switch (type) {
    // Every type whose answer entries are already the record's content: an address, a nameserver
    // hostname, a CNAME target.
    case 'A':
    case 'AAAA':
    case 'NS':
    case 'CNAME':
      return answer.map((content) => ({ type, name, content, host }));
    case 'TXT':
      // Each entry is itself an array of chunks for one TXT record; join with no separator, per
      // the spike's own observed [255, 155]/[255, 182]-byte DKIM chunking.
      return answer.map((chunks) => ({ type, name, content: chunks.join(''), host }));
    case 'MX':
      return answer.map((mx) => ({ type, name, content: mx.exchange, priority: mx.priority, host }));
    case 'CAA':
      return answer.map((entry) => {
        const tag = CAA_TAG_KEYS.find((key) => key in entry);
        const value = entry[tag];
        return {
          type,
          name,
          content: `${entry.critical} ${tag} "${value}"`,
          data: { flags: entry.critical, tag, value },
          host,
        };
      });
    default:
      return [];
  }
}

/**
 * @typedef {object} ReadCurrentRecordsResult
 * @property {object[]} records every record the probe list found, each `{ type, name, content,
 *  priority?, data?, host }`
 * @property {boolean} lowConfidence true when the read fell back to a recursive resolver rather
 *  than the domain's own authoritative nameservers, per the negative-cache defect this module
 *  exists to guard against
 */

/**
 * Read the admin's current DNS records against the fixed probe list, preferring the domain's own
 * authoritative nameservers. Refuses to run once the domain is already delegated to Cloudflare,
 * since a probe past that point would read this tool's own writes.
 * @param {object} args
 * @param {string} args.domain the domain to probe
 * @param {string} args.dir the `--dir` value, interpolated into a records-read-failed row
 * @param {(servers?: string[]) => object} [args.resolve] builds a resolver pointed at the given
 *  servers, or the pinned recursive pair when called with none; defaults to a real
 *  `node:dns/promises` Resolver, overridden in tests
 * @returns {Promise<ReadCurrentRecordsResult>} the typed records found, and the confidence flag
 */
export async function readCurrentRecords({ domain, dir, resolve = defaultResolve }) {
  const recursive = resolve();
  const nsNames = await readNsNames(recursive, domain);

  if (nsNames.some((ns) => CLOUDFLARE_NS_PATTERN.test(ns))) {
    // A plain Error rather than a catalogued row, unlike every other failure here: calling this
    // after delegation is a caller ordering mistake, and there is nothing for the admin to fix.
    throw new Error(
      `readCurrentRecords refuses to run: ${domain} is already delegated to Cloudflare (its ` +
        'nameservers already carry a .ns.cloudflare.com pair), so a fresh probe would read this ' +
        "tool's own writes rather than what the admin had before. The persisted carry-over " +
        'snapshot is the source of truth once delegation is active.',
    );
  }

  const { resolver, lowConfidence } = await selectAuthoritativeResolver({
    recursive,
    domain,
    nameServers: nsNames,
    resolve,
  });

  const records = [];
  for (const { host, name, types } of probeTargets(domain)) {
    for (const type of types) {
      const answer = await probe(resolver, METHOD_BY_TYPE[type], name, dir);
      records.push(...translate(type, answer, name, host));
    }
  }

  return { records, lowConfidence };
}

/**
 * Ruling 4's incompleteness caveat, and amendment 6's overcompleteness one, folded into a single
 * literal so the gate always states both: DNS has no enumeration primitive, so this list is only
 * ever what the fixed probe list found, and a domain that answers wildcard subdomains can make an
 * entry look real when nobody created it.
 */
export const INCOMPLETE_CAVEAT =
  'This list may be incomplete, and it may also show more than you actually set up: DNS has no ' +
  'way to list every record that exists, so this is only what a fixed set of common lookups ' +
  'found, and a domain that answers every subdomain (a wildcard) can make an entry look real ' +
  'when nobody created it on purpose. Compare this list against your records at your current ' +
  'registrar or DNS provider before confirming.';

/**
 * Amendment 15's low-confidence caveat: printed only when readCurrentRecords fell back to a
 * recursive resolver, since a public resolver can hold a stale "not found" answer for a record
 * that was in fact just created or changed.
 */
export const LOW_CONFIDENCE_CAVEAT =
  "This read could not reach your domain's own nameservers directly, so it fell back to a " +
  'public resolver. A public resolver can cache a false "not found" answer for a few minutes ' +
  'after a record changes, so a record you expect to see here but do not may still exist: wait a ' +
  'few minutes and re-run rather than assuming it is gone.';

/**
 * Amendment 12's apex-collision note: the Custom Domain attach this chapter's cutover performs
 * later writes a proxied AAAA at the apex pointing at the IPv6 discard prefix, and no A record,
 * which sits in the way of any A or AAAA record already carried over.
 */
export const APEX_ADDRESS_COLLISION_CAVEAT =
  "Your domain's apex (the bare domain, with no www) already has an address record. Connecting " +
  'your site later in this chapter replaces it with one pointing at your new site, so the old ' +
  'one will stop resolving once you finish, whether or not you copy it now.';

/**
 * Whether a record is an address record at the apex, the one shape the Custom Domain attach later
 * in this chapter overwrites.
 * @param {object} record a typed record from readCurrentRecords
 * @returns {boolean} true for an apex A or AAAA record
 */
function isApexAddress(record) {
  return record.host === 'apex' && (record.type === 'A' || record.type === 'AAAA');
}

/**
 * Build the carry-over gate's printed message: what was found, then the caveats that apply.
 * @param {object[]} records the records that would be written (already filtered to writable types)
 * @param {boolean} lowConfidence whether the read fell back to a recursive resolver
 * @returns {string} the full gate message
 */
function buildGateMessage(records, lowConfidence) {
  const summary =
    records.length === 0
      ? 'The tool found no existing DNS records it can copy into the new zone.'
      : `The tool found ${records.length} existing DNS record(s) it can copy into the new zone: ` +
        `${[...new Set(records.map((record) => record.type))].sort().join(', ')}.`;

  const caveats = [INCOMPLETE_CAVEAT];
  if (lowConfidence) caveats.push(LOW_CONFIDENCE_CAVEAT);
  if (records.some(isApexAddress)) caveats.push(APEX_ADDRESS_COLLISION_CAVEAT);

  return [summary, ...caveats].join('\n\n');
}

/**
 * Translate one typed record into the body `api.createDnsRecord` expects. Every carried record
 * writes `ttl: 1` (Cloudflare's "automatic"): `node:dns` does not surface a source TTL without an
 * extra per-record lookup, and automatic is the safe default the spike's own captured record used
 * too. Address and CNAME records write unproxied, since proxying a record the admin never asked
 * this tool to proxy could break a non-HTTP protocol (mail, for one) sitting behind it.
 * @param {object} record a typed record from readCurrentRecords
 * @returns {object} the `createDnsRecord` request body
 */
function toApiRecord(record) {
  const body = { type: record.type, name: record.name, content: record.content, ttl: 1 };
  if (record.priority !== undefined) body.priority = record.priority;
  if (record.data !== undefined) body.data = record.data;
  if (record.type === 'A' || record.type === 'AAAA' || record.type === 'CNAME') {
    body.proxied = false;
  }
  return body;
}

/**
 * @typedef {object} CarryOverResult
 * @property {'carried' | 'declined'} outcome whether the admin confirmed the copy. chapter2.mjs
 *  persists a third value, `'not-needed'`, when it skips this function because the zone arrived
 *  already active; that value never comes from here.
 * @property {number} count how many records were written; `0` when declined
 * @property {string[]} types the distinct record types written, sorted; `[]` when declined
 */

/**
 * Copy the admin's discovered records into the new zone, writing nothing until `confirm` resolves
 * true. NS records are excluded entirely, both from what gets written and from the gate's summary
 * count: Cloudflare assigns and manages a zone's own apex nameservers, and writing the domain's
 * old NS values as ordinary records into the new zone does not carry any useful meaning.
 * @param {object} args
 * @param {ReturnType<typeof import('./api.mjs').makeApi>} args.api the Cloudflare API client
 * @param {string} args.zoneId the zone to write into
 * @param {object[]} args.records the typed records from readCurrentRecords
 * @param {boolean} [args.lowConfidence] readCurrentRecords' own confidence flag, folded into the
 *  gate copy when true
 * @param {(message: string) => Promise<boolean>} args.confirm shown the gate message; resolves
 *  true to proceed, false to decline
 * @param {(line: string) => void} args.log receives one printed line once the copy finishes
 * @returns {Promise<CarryOverResult>} the outcome, count, and types written
 */
export async function carryOverRecords({ api, zoneId, records, lowConfidence = false, confirm, log }) {
  const writable = records.filter((record) => record.type !== 'NS');
  const proceed = await confirm(buildGateMessage(writable, lowConfidence));
  if (!proceed) {
    return { outcome: 'declined', count: 0, types: [] };
  }

  const types = new Set();
  for (const record of writable) {
    await api.createDnsRecord(zoneId, toApiRecord(record));
    types.add(record.type);
  }
  log(`Copied ${writable.length} DNS record${writable.length === 1 ? '' : 's'} into the new zone.`);
  return { outcome: 'carried', count: writable.length, types: [...types].sort() };
}

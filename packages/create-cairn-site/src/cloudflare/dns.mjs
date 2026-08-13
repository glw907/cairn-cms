// The authoritative-versus-recursive DNS machinery, extracted from records.mjs so it can be
// reused by more than one caller. It was written once, for records.mjs's own negative-cache
// defect (see that module's header): a stale negative answer from a public recursive resolver
// reads exactly like an absent record, so a caller that can reach the domain's own authoritative
// nameservers directly should prefer that answer, which no recursive cache sits in front of.
//
// Three consumers share this module: records.mjs's carry-over read (one resolver chosen up
// front, then queried for a whole fixed probe list), hostname.mjs's propagation diagnosis (one
// name queried both ways, so a caller can tell an authoritative "yes, it exists" apart from a
// recursive resolver still holding a stale "no"), and, later, the console's own propagation view.
//
// The delegation-refusal check (has the domain's own NS pair already switched to Cloudflare?)
// stays in records.mjs: it is that module's own ordering rule, not a DNS mechanic this module owns.
import { Resolver } from 'node:dns/promises';

/**
 * The recursive resolvers this module falls back to, and uses to discover a domain's own
 * authoritative nameservers in the first place. Pinned to the pair the T4a domain spike itself
 * used (docs/internal/2026-08-11-t4a-domain-spike.md, Step 3).
 */
export const RECURSIVE_SERVERS = ['1.1.1.1', '8.8.8.8'];

/**
 * Build a resolver pointed at the given servers, or the pinned recursive pair when none are
 * given. The default `resolve` factory every call in this module goes through, injectable so a
 * test can stub both the recursive and the authoritative path.
 * @param {string[]} [servers] the server IPs to query; defaults to `RECURSIVE_SERVERS`
 * @returns {import('node:dns/promises').Resolver} a resolver pointed at those servers
 */
export function defaultResolve(servers = RECURSIVE_SERVERS) {
  const resolver = new Resolver();
  resolver.setServers(servers);
  return resolver;
}

/**
 * Look up a domain's own NS records, the read that supplies the authoritative query targets. A
 * lookup that fails or answers something other than a list reports empty rather than throwing,
 * since every caller here treats "no NS names found" as the ordinary fallback-to-recursive case.
 * @param {object} recursive the recursive resolver to query
 * @param {string} domain the domain whose NS records to read
 * @returns {Promise<string[]>} the NS hostnames, or `[]` when none could be read
 */
export async function readNsNames(recursive, domain) {
  try {
    const answer = await recursive.resolveNs(domain);
    return Array.isArray(answer) ? answer : [];
  } catch {
    return [];
  }
}

/**
 * Resolve one nameserver hostname to an address usable as an authoritative query target, trying
 * every hostname in turn until one resolves.
 * @param {object} recursive the recursive resolver to resolve NS hostnames against
 * @param {string[]} nsNames the domain's own NS hostnames
 * @returns {Promise<string | null>} the first resolvable address, or `null` when none resolve
 */
export async function firstAuthoritativeAddress(recursive, nsNames) {
  for (const nsName of nsNames) {
    for (const method of ['resolve4', 'resolve6']) {
      try {
        const addresses = await recursive[method](nsName);
        if (addresses?.[0]) return addresses[0];
      } catch {
        // A nameserver with no address of this family is ordinary; try the other family, then
        // the next nameserver. Exhausting every one is what the recursive fallback is for.
      }
    }
  }
  return null;
}

/**
 * Pick the resolver a caller should treat as authoritative for a domain: the zone's own
 * nameservers when `nameServers` is already known, or discovered via a fresh NS lookup
 * otherwise, falling back to the plain recursive resolver (flagged `lowConfidence`) when no
 * authoritative address can be found either way. This is records.mjs's own resolver-selection
 * block, generalized with the optional `nameServers` parameter: a caller already holding a
 * zone's assigned nameservers (for example a saved `record.cloudflare.nameServers`) can skip the
 * NS discovery lookup entirely, which both saves a round trip and sidesteps that lookup being
 * itself vulnerable to the same negative-cache defect this module exists to guard against.
 * @param {object} args
 * @param {object} args.recursive a resolver already pointed at the recursive fallback servers,
 *  used both as the fallback query target and, absent `nameServers`, to discover the domain's
 *  own NS hostnames
 * @param {string} args.domain the domain whose authoritative nameservers to use
 * @param {string[]} [args.nameServers] the domain's own NS hostnames, when already known; skips
 *  the NS discovery lookup
 * @param {(servers?: string[]) => object} args.resolve builds a resolver pointed at given servers
 * @returns {Promise<{ resolver: object, lowConfidence: boolean }>} the resolver to query, and
 *  whether it is the recursive fallback rather than a true authoritative source
 */
export async function selectAuthoritativeResolver({ recursive, domain, nameServers, resolve }) {
  const nsNames = nameServers ?? (await readNsNames(recursive, domain));
  if (nsNames.length > 0) {
    const authoritativeAddress = await firstAuthoritativeAddress(recursive, nsNames);
    if (authoritativeAddress) {
      return { resolver: resolve([authoritativeAddress]), lowConfidence: false };
    }
  }
  return { resolver: recursive, lowConfidence: true };
}

/**
 * Run one resolver method, translating any failure (an authoritative absence, a real lookup
 * error, an unreachable server) into an empty answer rather than throwing. Callers here are
 * doing best-effort diagnosis, not a validated data read (that stricter contract is
 * records.mjs's own `probe`, which distinguishes absence from failure for its own
 * records-read-failed row); a DNS hiccup during diagnosis should never itself throw.
 * @param {object} resolver the resolver-like object to query
 * @param {string} method the resolver method name (for example `'resolve6'`)
 * @param {string} name the DNS name to query
 * @returns {Promise<unknown[]>} the resolver's answer array, or `[]` on any failure
 */
async function safeQuery(resolver, method, name) {
  try {
    return await resolver[method](name);
  } catch {
    return [];
  }
}

/**
 * Read one DNS answer twice: once against the domain's own authoritative nameservers (immune to
 * a recursive resolver's negative cache) and once against the ordinary recursive resolver,
 * returning both so a caller can reason about a split between them (a record that already
 * exists at the authoritative source but has not yet shown up through a resolver still holding a
 * stale "not found" answer).
 * @param {object} args
 * @param {string} args.domain the domain whose authoritative nameservers to use
 * @param {string} args.name the DNS name to query
 * @param {string} args.method the resolver method name to call (for example `'resolve6'`)
 * @param {string[]} [args.nameServers] the domain's own NS hostnames, when already known; skips
 *  the NS discovery lookup, forwarded to `selectAuthoritativeResolver`
 * @param {(servers?: string[]) => object} [args.resolve] builds a resolver pointed at the given
 *  servers, or the pinned recursive pair when called with none; defaults to `defaultResolve`,
 *  overridden in tests
 * @returns {Promise<{ authoritative: unknown[] | null, recursive: unknown[], lowConfidence:
 *  boolean }>} `authoritative` is `null` when no authoritative source could be found at all
 *  (the same case `lowConfidence: true` reports); `recursive` is always the recursive resolver's
 *  own answer, queried independently of whether an authoritative source was found
 */
export async function readAuthoritativeAndRecursive({ domain, name, method, nameServers, resolve = defaultResolve }) {
  const recursive = resolve();
  const recursiveAnswer = await safeQuery(recursive, method, name);

  const { resolver: authoritativeResolver, lowConfidence } = await selectAuthoritativeResolver({
    recursive,
    domain,
    nameServers,
    resolve,
  });
  const authoritative = lowConfidence ? null : await safeQuery(authoritativeResolver, method, name);

  return { authoritative, recursive: recursiveAnswer, lowConfidence };
}

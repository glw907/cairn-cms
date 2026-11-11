// The gate's own copy of the setup tool's authoritative lookup. This workstation's resolver caches a
// negative answer for the test domain for up to 30 minutes, so the gate asks the zone's own
// nameservers for the address instead. It deliberately does not import from packages/.
import { promises as dnsPromises } from 'node:dns';

/** The public resolvers the zone's NS records and the nameservers' own addresses are read through. */
const PUBLIC_RESOLVERS = ['1.1.1.1', '8.8.8.8'];

/**
 * @typedef {object} DnsReader
 * @property {(name: string) => Promise<string[]>} resolveNs the NS hostnames for a name
 * @property {(name: string) => Promise<string[]>} resolve4 the A addresses for a name
 */

/**
 * The real reader: a node:dns Resolver, optionally pointed at specific servers.
 * @param {string[]} [servers] the servers to ask; the system's when omitted
 * @returns {DnsReader}
 */
export function defaultMakeResolver(servers) {
  const resolver = new dnsPromises.Resolver({ timeout: 4000, tries: 2 });
  if (servers) resolver.setServers(servers);
  return resolver;
}

/**
 * @typedef {object} ResolveOptions
 * @property {(servers?: string[]) => DnsReader} [makeResolver] builds a reader; tests inject one
 */

/**
 * Whether a lookup failure is a nameserver's own "no such data" answer, as opposed to a failure to
 * reach it (timeout, refusal, a blocked port 53). Only the first is evidence about the zone.
 * @param {unknown} error
 */
function isAnswer(error) {
  const code = /** @type {{ code?: string } | null} */ (error)?.code;
  return code === 'ENODATA' || code === 'ENOTFOUND';
}

/**
 * Find a domain's address as its zone's authoritative nameservers answer it, bypassing every
 * caching resolver. The zone is found by trying the domain, then each parent, for NS records.
 * Three outcomes, which callers must not conflate: a string is the address; null is a real answer
 * with no address (the zone's nameserver replied, or no NS record exists for the name); undefined
 * means nothing could be asked (the public resolvers or the nameservers were unreachable, or a
 * resolver could not be built), so it says nothing about whether the zone has an address.
 * @param {string} domain the hostname to resolve
 * @param {ResolveOptions} [options]
 * @returns {Promise<string | null | undefined>}
 */
export async function authoritativeAddress(domain, { makeResolver = defaultMakeResolver } = {}) {
  try {
    const publicReader = makeResolver(PUBLIC_RESOLVERS);
    const labels = domain.split('.');
    /** @type {string[]} */
    let nameServers = [];
    let nsUnasked = false;
    for (let start = 0; start < labels.length - 1 && nameServers.length === 0; start++) {
      nameServers = await publicReader.resolveNs(labels.slice(start).join('.')).catch((/** @type {unknown} */ error) => {
        if (!isAnswer(error)) nsUnasked = true;
        return [];
      });
    }
    if (nameServers.length === 0) return nsUnasked ? undefined : null;
    let answered = false;
    for (const nameServer of nameServers) {
      const addresses = await publicReader.resolve4(nameServer).catch(() => []);
      if (addresses.length === 0) continue;
      let reached = true;
      const answer = await makeResolver(addresses).resolve4(domain).catch((/** @type {unknown} */ error) => {
        if (!isAnswer(error)) reached = false;
        return [];
      });
      if (answer.length > 0) return answer[0];
      if (reached) answered = true;
    }
    return answered ? null : undefined;
  } catch {
    return undefined;
  }
}

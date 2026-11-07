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
 * Find a domain's address as its zone's authoritative nameservers answer it, bypassing every
 * caching resolver. The zone is found by trying the domain, then each parent, for NS records.
 * @param {string} domain the hostname to resolve
 * @param {ResolveOptions} [options]
 * @returns {Promise<string | null>} the first address any nameserver gives, or null when none does
 */
export async function authoritativeAddress(domain, { makeResolver = defaultMakeResolver } = {}) {
  try {
    const publicReader = makeResolver(PUBLIC_RESOLVERS);
    const labels = domain.split('.');
    /** @type {string[]} */
    let nameServers = [];
    for (let start = 0; start < labels.length - 1 && nameServers.length === 0; start++) {
      nameServers = await publicReader.resolveNs(labels.slice(start).join('.')).catch(() => []);
    }
    for (const nameServer of nameServers) {
      const addresses = await publicReader.resolve4(nameServer).catch(() => []);
      if (addresses.length === 0) continue;
      const answer = await makeResolver(addresses).resolve4(domain).catch(() => []);
      if (answer.length > 0) return answer[0];
    }
  } catch {
    // A resolver that cannot be built means no address: callers fall back to the system resolver.
  }
  return null;
}

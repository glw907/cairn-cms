// The guards. Each throws before the request it protects is sent.

export const TEST_ZONE = 'carin-test.org';
export const TEST_LOGIN = 'glw907-test';

/** A run id: `t` and the base-36 clock, the shape `record.mjs` generates. */
export const RUN_ID = /^t[0-9a-z]{8,}$/;
const ZONE_ID = /^[0-9a-f]{32}$/;
const OWNED_ID = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** The suffix each resource kind's name carries after `cairn-rec-<run id>-`. */
export const NAME_SUFFIX = /** @type {const} */ ({ d1: 'db', r2: 'bucket', 'cf-token': 'key', repo: 'repo', 'github-app': 'app' });

/**
 * Throw unless a run id has the generated shape.
 * @param {unknown} runId the run id
 * @returns {string} the run id
 */
export function requireRunId(runId) {
  if (typeof runId !== 'string' || !RUN_ID.test(runId)) throw new Error(`A run id looks like t followed by eight or more base-36 characters; got ${JSON.stringify(runId)}.`);
  return runId;
}

/**
 * The one name a run gives a resource of a kind.
 * @param {string} runId the run id
 * @param {keyof typeof NAME_SUFFIX} kind the resource kind
 * @returns {string}
 */
export function resourceName(runId, kind) {
  return `cairn-rec-${requireRunId(runId)}-${NAME_SUFFIX[kind]}`;
}

/**
 * The Cloudflare write guard. A write passes only when its path is under the test zone, or a path
 * segment or the body's `name` is exactly one of the run's Cloudflare resource names, or a path
 * segment is the id of a resource this run created.
 * @param {string} runId the run id
 * @returns {{ setZone: (id: string) => void, adopt: (id: string) => void, assertCloudflare: (method: string, path: string, body?: unknown) => void }}
 */
export function createGuards(runId) {
  const names = new Set(/** @type {const} */ (['d1', 'r2', 'cf-token']).map((kind) => resourceName(runId, kind)));
  /** @type {string | null} */
  let zoneId = null;
  /** @type {Set<string>} */
  const owned = new Set();
  return {
    setZone(id) {
      if (typeof id !== 'string' || !ZONE_ID.test(id)) throw new Error('Refused zone id: it is not 32 hex characters.');
      zoneId = id;
    },
    adopt(id) {
      if (typeof id !== 'string' || !OWNED_ID.test(id)) throw new Error('Refused resource id: it is neither a UUID nor 32 hex characters.');
      owned.add(id);
    },
    assertCloudflare(method, path, body) {
      if (method === 'GET' || method === 'HEAD') return;
      const segments = path.split('?')[0].split('/');
      const name = body && typeof body === 'object' ? /** @type {{ name?: unknown }} */ (body).name : undefined;
      const named = typeof name === 'string' && names.has(name);
      const inZone = zoneId !== null && segments[1] === 'zones' && segments[2] === zoneId;
      const carries = inZone || segments.some((segment) => names.has(segment) || owned.has(segment));
      if (!carries && !named) throw new Error(`Refused Cloudflare write ${method} ${path}: it names neither the ${TEST_ZONE} zone nor a run ${runId} resource.`);
    },
  };
}

/**
 * Require that the account's token answers as the test account.
 * @param {typeof fetch} fetcher the fetch to use
 * @param {string} apiBase the API origin
 * @param {string} token the account's token
 * @returns {Promise<void>}
 */
export async function assertTestIdentity(fetcher, apiBase, token) {
  const response = await fetcher(`${apiBase}/user`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' }, redirect: 'error' });
  const login = response.ok ? (await response.json()).login : null;
  if (login !== TEST_LOGIN) throw new Error(`Refused write: GET /user answered ${login === null ? `status ${response.status}` : 'another account'}, not ${TEST_LOGIN}.`);
}

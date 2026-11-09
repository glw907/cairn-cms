// The guards. Each throws before the request it protects is sent.

export const TEST_ZONE = 'carin-test.org';
export const TEST_LOGIN = 'glw907-test';

/** A run id: `t` and the base-36 clock, the shape `record.mjs` generates. */
export const RUN_ID = /^t[0-9a-z]{8,}$/;
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

/** The create collections a body `name` may pass a write for, each with the kind it creates. */
const CREATES = /** @type {const} */ ([
  ['d1', /^\/accounts\/[0-9a-f]{32}\/d1\/database$/],
  ['r2', /^\/accounts\/[0-9a-f]{32}\/r2\/buckets$/],
  ['cf-token', /^\/user\/tokens$/],
]);

/**
 * The Cloudflare write guard. The run makes no zone write. A write passes only when a path segment
 * is exactly one of the run's Cloudflare resource names or the id of a resource this run created,
 * or when it is a POST to a create collection whose body `name` is the run's name for that kind.
 * @param {string} runId the run id
 * @returns {{ adopt: (id: string) => void, assertCloudflare: (method: string, path: string, body?: unknown) => void }}
 */
export function createGuards(runId) {
  const names = new Set(/** @type {const} */ (['d1', 'r2', 'cf-token']).map((kind) => resourceName(runId, kind)));
  /** @type {Set<string>} */
  const owned = new Set();
  return {
    adopt(id) {
      if (typeof id !== 'string' || !OWNED_ID.test(id)) throw new Error('Refused resource id: it is neither a UUID nor 32 hex characters.');
      owned.add(id);
    },
    assertCloudflare(method, path, body) {
      if (method === 'GET' || method === 'HEAD') return;
      const bare = path.split('?')[0];
      const name = body && typeof body === 'object' ? /** @type {{ name?: unknown }} */ (body).name : undefined;
      const named = method === 'POST' && CREATES.some(([kind, collection]) => collection.test(bare) && name === resourceName(runId, kind));
      const carries = bare.split('/').some((segment) => names.has(segment) || owned.has(segment));
      if (!carries && !named) throw new Error(`Refused Cloudflare write ${method} ${path}: it names no run ${runId} resource.`);
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

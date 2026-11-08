// The guards. Each throws before the request it protects is sent.

export const TEST_ZONE = 'carin-test.org';
export const TEST_LOGIN = 'glw907-test';

/**
 * The Cloudflare write guard. A write passes only when its path carries the test zone's id, or a
 * name carrying the run id (in the path or the body), or the id of a resource this run created.
 * @param {string} runId the run id
 * @returns {{ setZone: (id: string) => void, adopt: (id: string) => void, assertCloudflare: (method: string, path: string, body?: unknown) => void }}
 */
export function createGuards(runId) {
  /** @type {string | null} */
  let zoneId = null;
  const owned = new Set();
  return {
    setZone(id) {
      zoneId = id;
    },
    adopt(id) {
      owned.add(id);
    },
    assertCloudflare(method, path, body) {
      if (method === 'GET' || method === 'HEAD') return;
      const name = body && typeof body === 'object' ? /** @type {{ name?: unknown }} */ (body).name : undefined;
      const named = typeof name === 'string' && name.includes(runId);
      const carries = (zoneId && path.includes(zoneId)) || path.includes(runId) || [...owned].some((id) => path.includes(id));
      if (!carries && !named) throw new Error(`Refused Cloudflare write ${method} ${path}: it names neither the ${TEST_ZONE} zone nor run ${runId}.`);
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
  const response = await fetcher(`${apiBase}/user`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' } });
  const login = response.ok ? (await response.json()).login : null;
  if (login !== TEST_LOGIN) throw new Error(`Refused write: GET /user answered ${login === null ? `status ${response.status}` : 'another account'}, not ${TEST_LOGIN}.`);
}

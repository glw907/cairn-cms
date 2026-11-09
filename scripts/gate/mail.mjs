// The gate's mailbox reader over JMAP. It finds the sign-in message one request caused and checks
// that the mailbox answers, for the smoke. A JMAP method error is never read as an empty mailbox.

/**
 * @typedef {object} MailQuery
 * @property {string} login the mailbox
 * @property {string} password its password; used for the basic-auth header only
 * @property {string} siteName the site's name; the subject is `Sign in to <name>`
 * @property {string} owner the address the link was requested for
 * @property {number} sinceMs the time the request was made
 * @property {string} expectedOrigin the origin the link must carry
 * @property {string} [sessionUrl] the JMAP session (`https://ward.907.life/.well-known/jmap`, the host that serves it; `907.life` answers 308 to it)
 * @property {string[]} [trustedHosts] other hosts a redirect may take the credentials to; by default the session host's registrable domain
 * @property {typeof fetch} [fetchImpl] the fetch
 * @property {number} [budgetMs] how long to poll (10 minutes)
 * @property {number} [intervalMs] the gap between polls (15 seconds)
 * @property {(ms: number) => Promise<void>} [sleep] the wait
 * @property {() => number} [now] the clock
 */

/**
 * The registrable domain of the session host (its last two labels), so a redirect from `907.life`
 * to `ward.907.life` keeps its credentials. An IP address or a bare host trusts nothing.
 * @param {string} sessionUrl
 * @returns {string[]} the trusted domains: a host equal to one, or ending in `.` plus one, is trusted
 */
function sameRegistrableDomain(sessionUrl) {
  const host = new URL(sessionUrl).hostname;
  const labels = host.split('.');
  if (labels.length < 2 || /^\d+(\.\d+){3}$/.test(host) || host.includes(':')) return [];
  return [labels.slice(-2).join('.')];
}

/**
 * Fetch with credentials, following redirects by hand. `fetch` drops the Authorization header on a
 * redirect to another host, so a session URL that redirects (`907.life` to `ward.907.life`) reaches
 * the server anonymous and gets an empty session. A same-host redirect is followed as it comes; one
 * to another host re-sends the credentials only when that host is trusted, and otherwise throws.
 * @param {typeof fetch} fetchImpl
 * @param {string} url
 * @param {RequestInit} init
 * @param {string[]} trusted hostnames, or registrable domains, a redirect may take the credentials to
 * @returns {Promise<Response>}
 */
async function fetchWithAuth(fetchImpl, url, init, trusted) {
  let target = new URL(url);
  for (let hop = 0; hop < 5; hop++) {
    const response = await fetchImpl(target, { ...init, redirect: 'manual' });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) return response;
    const next = new URL(location, target);
    if (!isTrustedRedirect(target, next, trusted)) throw new Error(`the request was redirected to ${next.hostname}, which is not a trusted host`);
    target = next;
  }
  throw new Error('too many redirects');
}

/**
 * Whether credentials sent to `from` may go on to `to`: never to a URL that carries userinfo, never
 * from https to anything else (a downgrade would put them on the wire in the clear), and only to the
 * same hostname or a trusted domain or one of its subdomains. The match is on whole labels, so
 * `evil907.life` and `907.life.evil.com` are not `907.life`.
 * @param {URL} from the URL the credentials were sent to
 * @param {URL} to the URL a redirect or the session document points at next
 * @param {string[]} trusted the trusted domains
 * @returns {boolean}
 */
export function isTrustedRedirect(from, to, trusted) {
  if (to.username || to.password) return false;
  if (from.protocol === 'https:' && to.protocol !== 'https:') return false;
  return to.hostname === from.hostname || trusted.some((entry) => to.hostname === entry || to.hostname.endsWith(`.${entry}`));
}

/**
 * Poll the gate mailbox over JMAP for the sign-in message the request caused: received after the
 * request, to the owner, with the site's sign-in subject, in any mailbox. Never "the newest message".
 * @param {MailQuery} query
 * @returns {Promise<{ found: true, from: string, url: string } | { found: false, reason: string }>}
 *  a message and its link, or why none came; throws when a JMAP method answers an error or the link
 *  is on another origin
 */
export async function findSignInMessage(query) {
  const {
    login,
    password,
    siteName,
    owner,
    sinceMs,
    expectedOrigin,
    sessionUrl = 'https://ward.907.life/.well-known/jmap',
    fetchImpl = fetch,
    trustedHosts,
    budgetMs = 10 * 60_000,
    intervalMs = 15_000,
    sleep = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
  } = query;
  const authorization = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
  const trusted = trustedHosts ?? sameRegistrableDomain(sessionUrl);
  /** @type {Response} */
  let sessionResponse;
  try {
    sessionResponse = await fetchWithAuth(fetchImpl, sessionUrl, { headers: { authorization } }, trusted);
  } catch (error) {
    return { found: false, reason: `the JMAP session read failed: ${/** @type {Error} */ (error).message}`.slice(0, 200) };
  }
  if (sessionResponse.status !== 200) return { found: false, reason: `the JMAP session answered ${sessionResponse.status}` };
  const session = /** @type {{ apiUrl: string, primaryAccounts?: Record<string, string> }} */ (await sessionResponse.json());
  const accountId = session.primaryAccounts?.['urn:ietf:params:jmap:mail'];
  // A login the server does not know can still get a 200 session with no accounts; reading it as an
  // empty mailbox would hide the real cause.
  if (!accountId) return { found: false, reason: 'the JMAP session holds no mail account for this login' };
  // The session document names the API URL the credentials go to next; hold it to the same rule as a redirect.
  let apiUrl;
  try {
    apiUrl = new URL(session.apiUrl);
  } catch {
    return { found: false, reason: 'the JMAP session names no usable API URL' };
  }
  if (!isTrustedRedirect(new URL(sessionUrl), apiUrl, trusted)) {
    return { found: false, reason: `the JMAP session names an API on ${apiUrl.hostname}, which is not a trusted host` };
  }
  const subject = `Sign in to ${siteName}`;
  const deadline = now() + budgetMs;
  /** What the last poll saw since the request, named by sender and subject only, so a miss says what arrived instead. */
  let seen = 'the mailbox held 0 messages since the request';
  for (;;) {
    /** @type {Response} */
    let response;
    try {
      response = await fetchWithAuth(fetchImpl, session.apiUrl, {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({
        using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
        methodCalls: [
          ['Email/query', { accountId, filter: { after: new Date(sinceMs - 2000).toISOString() }, sort: [{ property: 'receivedAt', isAscending: false }], limit: 50 }, 'q'],
          [
            'Email/get',
            {
              accountId,
              '#ids': { resultOf: 'q', name: 'Email/query', path: '/ids' },
              properties: ['receivedAt', 'from', 'to', 'subject', 'textBody', 'bodyValues'],
              fetchTextBodyValues: true,
            },
            'g',
          ],
        ],
      }),
      }, trusted);
    } catch (error) {
      return { found: false, reason: `the JMAP read failed: ${/** @type {Error} */ (error).message}`.slice(0, 200) };
    }
    if (response.status !== 200 && response.status >= 400 && response.status < 500) {
      return { found: false, reason: `the JMAP API answered ${response.status}` };
    }
    if (response.status === 200) {
      const answer = /** @type {{ methodResponses: Array<[string, { list?: any[], type?: string }, string]> }} */ (await response.json());
      // A JMAP method error is an answer, not an empty list: throwing keeps a bad account or a
      // refused login from reading as "0 messages".
      const failed = answer.methodResponses.find((call) => call[0] === 'error');
      if (failed) throw new Error(`the JMAP read failed: ${failed[1]?.type ?? 'unknown error'}`);
      const list = answer.methodResponses.find((call) => call[0] === 'Email/get')?.[1].list ?? [];
      const recent = list.filter((message) => Date.parse(message.receivedAt) >= sinceMs - 1000);
      seen =
        `the mailbox held ${recent.length} message${recent.length === 1 ? '' : 's'} since the request` +
        recent
          .slice(0, 5)
          .map((message) => `; ${message.receivedAt} from ${message.from?.[0]?.email ?? 'unknown'} "${String(message.subject ?? '').slice(0, 80)}"`)
          .join('');
      const match = list
        .filter(
          (message) =>
            Date.parse(message.receivedAt) >= sinceMs - 1000 &&
            message.subject === subject &&
            (message.to ?? []).some((/** @type {{ email?: string }} */ to) => to.email?.toLowerCase() === owner.toLowerCase()),
        )
        .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))[0];
      if (match) {
        const part = match.textBody?.[0]?.partId;
        const text = String(part ? (match.bodyValues?.[part]?.value ?? '') : '');
        const link = /https?:\/\/[^\s<>"]+\/admin\/auth\/confirm\?token=[^\s<>"]+/.exec(text)?.[0];
        if (!link) return { found: false, reason: 'the sign-in message has no link in its text body' };
        if (new URL(link).origin !== expectedOrigin) throw new Error(`The sign-in link is on ${new URL(link).origin}, not ${expectedOrigin}; refusing to open it.`);
        return { found: true, from: match.from?.[0]?.email ?? '', url: link };
      }
    }
    if (now() + intervalMs > deadline) return { found: false, reason: `no matching sign-in message arrived within the budget; ${seen.slice(0, 200)}` };
    await sleep(intervalMs);
  }
}

/**
 * Prove the mailbox answers: the session names a mail account, and an `Email/query` on it returns
 * no method error. Holds the session and API URLs to the same trusted-host rule as the sign-in read.
 * @param {{ login: string, password: string, sessionUrl?: string, trustedHosts?: string[], fetchImpl?: typeof fetch }} input
 *  the mailbox login and password; the session URL defaults to the host that serves it
 * @returns {Promise<{ messages: number }>} how many message ids the query returned, up to its limit of 1
 * @throws when the session, the API call, or any JMAP method fails
 */
export async function checkMailbox({ login, password, sessionUrl = 'https://ward.907.life/.well-known/jmap', trustedHosts, fetchImpl = fetch }) {
  const authorization = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
  const trusted = trustedHosts ?? sameRegistrableDomain(sessionUrl);
  const sessionResponse = await fetchWithAuth(fetchImpl, sessionUrl, { headers: { authorization } }, trusted);
  if (sessionResponse.status !== 200) throw new Error(`the JMAP session answered ${sessionResponse.status}`);
  const session = /** @type {{ apiUrl: string, primaryAccounts?: Record<string, string> }} */ (await sessionResponse.json());
  const accountId = session.primaryAccounts?.['urn:ietf:params:jmap:mail'];
  if (!accountId) throw new Error('the JMAP session holds no mail account for this login');
  const apiUrl = new URL(session.apiUrl);
  if (!isTrustedRedirect(new URL(sessionUrl), apiUrl, trusted)) {
    throw new Error(`the JMAP session names an API on ${apiUrl.hostname}, which is not a trusted host`);
  }
  const response = await fetchWithAuth(
    fetchImpl,
    session.apiUrl,
    {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({
        using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
        methodCalls: [['Email/query', { accountId, limit: 1 }, 'q']],
      }),
    },
    trusted,
  );
  if (response.status !== 200) throw new Error(`the JMAP API answered ${response.status}`);
  const answer = /** @type {{ methodResponses: Array<[string, { ids?: string[], type?: string }, string]> }} */ (await response.json());
  const failed = answer.methodResponses.find((call) => call[0] === 'error');
  if (failed) throw new Error(`the JMAP read failed: ${failed[1]?.type ?? 'unknown error'}`);
  const query = answer.methodResponses.find((call) => call[0] === 'Email/query');
  if (!query) throw new Error('the JMAP answer held no Email/query response');
  return { messages: query[1].ids?.length ?? 0 };
}

// The gate's four legs. Each runs the real create-cairn-site CLI at one exact version, publishes an
// edit through the install's admin, and passes only on what a script fetched from the live address.
// A leg's verdict is `evaluateLeg`'s: a CLI exit code is never an input that can pass it.
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runDriver } from './driver.mjs';
import { confirmSignIn, handleUrl, launchBrowser, publishViaAdmin, requestSignInLink, tailUrlLog } from './browser.mjs';
import { defaultFetch, fetchCheck, fetchCheckAbsent } from './fetch-check.mjs';
import { authoritativeAddress } from './resolve.mjs';
import { recordLeg } from './record.mjs';
import { startWorkerTail } from './tail.mjs';

/** The test domain the gate's installs connect. */
export const TEST_DOMAIN = 'carin-test.org';
/** What the admin says after a publish. */
export const PUBLISHED_ALERT = 'Published. The live site shows this change once the site rebuilds.';
/** The closing block's publish lines. */
export const CONNECTED_SENTENCE = 'Each publish from your admin commits to GitHub, and Workers Builds deploys it, so your live site updates by itself.';
export const NOT_CONNECTED_SENTENCE =
  'Workers Builds is not connected, so a publish from your admin commits to GitHub and your live site does not change.';
export const END_TO_END_SENTENCE = 'This site is set up end to end.';
/** The sender a sign-in email from the connected domain carries. */
export const MAIL_SENDER = `no-reply@${TEST_DOMAIN}`;
const INSTALL_NAME_LIMIT = 34;

/**
 * What each leg does. `install` names the install the leg runs on; `first` marks the leg that creates it.
 * @type {Record<string, { install: 'a' | 'b', first: boolean, connect: boolean, domain: boolean, email: boolean, builds: boolean }>}
 */
export const LEG_PLANS = {
  A1: { install: 'a', first: true, connect: false, domain: true, email: true, builds: false },
  A2: { install: 'a', first: false, connect: true, domain: false, email: false, builds: true },
  B1: { install: 'b', first: true, connect: false, domain: false, email: false, builds: true },
  B2: { install: 'b', first: false, connect: false, domain: true, email: true, builds: false },
};

/**
 * An install's name: `cairn-e2e-gate-<v>-<a|b>-<ddhhmm>`, `<v>` the version with every
 * non-alphanumeric character removed.
 * @param {string} version the exact version under test
 * @param {'a' | 'b'} install which install
 * @param {Date} [when] the run's start
 * @returns {string} the name, at most 34 characters
 */
export function installName(version, install, when = new Date()) {
  const two = (/** @type {number} */ n) => String(n).padStart(2, '0');
  const stamp = `${two(when.getUTCDate())}${two(when.getUTCHours())}${two(when.getUTCMinutes())}`;
  const name = `cairn-e2e-gate-${version.replace(/[^A-Za-z0-9]/g, '')}-${install}-${stamp}`;
  if (name.length > INSTALL_NAME_LIMIT) throw new Error(`The install name "${name}" is ${name.length} characters; the limit is ${INSTALL_NAME_LIMIT}.`);
  return name;
}

/** @param {string} text */
const normalize = (text) => text.replace(/[│┃]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * @typedef {object} LegResults
 * @property {string} closingText the CLI's final screen
 * @property {string | null} alertText the admin's alert after the publish
 * @property {import('./fetch-check.mjs').FetchCheckResult | null} fetch the marker fetch (A2, B1, B2)
 * @property {(import('./fetch-check.mjs').FetchCheckResult & { absent: boolean, reason?: string }) | null} absent
 *  the unchanged-page check (A1)
 * @property {boolean} commitOnDefaultBranch whether the marker's commit is on the default branch (A1)
 * @property {boolean} robotsHasSitemap whether `robots.txt` names the domain's sitemap (A2, B2)
 * @property {{ from: string, fetch: import('./fetch-check.mjs').FetchCheckResult | null } | null} mail
 *  the mail-borne sign-in's sender and its marker fetch (B2)
 */

/**
 * Decide a leg. Only the closing text, the alert, and the fetch results count.
 * @param {string} leg `A1`, `A2`, `B1`, or `B2`
 * @param {LegResults} results what the leg gathered
 * @returns {{ pass: boolean, failures: string[] }} the verdict and every reason it failed
 */
export function evaluateLeg(leg, results) {
  /** @type {string[]} */
  const failures = [];
  const closing = normalize(results.closingText);
  /** @param {string} sentence @param {string} what */
  const needs = (sentence, what) => {
    if (!closing.includes(sentence)) failures.push(`the closing block lacks ${what}`);
  };
  if (leg === 'A1') needs(NOT_CONNECTED_SENTENCE, 'the not-connected sentence');
  if (leg === 'A2') needs(CONNECTED_SENTENCE, 'the connected sentence');
  if (leg === 'B1' || leg === 'B2') {
    needs(END_TO_END_SENTENCE, 'the end-to-end sentence');
    needs(CONNECTED_SENTENCE, 'the connected sentence');
  }
  if (results.alertText !== PUBLISHED_ALERT) failures.push(`the publish alert read ${JSON.stringify(results.alertText)}`);
  if (leg === 'A1') {
    if (!results.commitOnDefaultBranch) failures.push("the marker's commit is not on the default branch");
    if (!results.absent) failures.push('no unchanged-page check ran');
    else if (!results.absent.absent) failures.push(`the unchanged-page check failed: ${results.absent.reason ?? 'unknown'}`);
  } else {
    if (!results.fetch) failures.push('no fetch result');
    else if (!results.fetch.found) failures.push(`the fetch did not find the marker (status ${results.fetch.status})`);
  }
  if ((leg === 'A2' || leg === 'B2') && !results.robotsHasSitemap) failures.push(`robots.txt lacks https://${TEST_DOMAIN}/sitemap.xml`);
  if (leg === 'B2') {
    if (!results.mail) failures.push('no mail-borne sign-in ran');
    else {
      if (results.mail.from !== MAIL_SENDER) failures.push(`the sign-in mail came from ${results.mail.from}, not ${MAIL_SENDER}`);
      if (!results.mail.fetch?.found) failures.push("the mail session's marker was not fetched");
    }
  }
  return { pass: failures.length === 0, failures };
}

/**
 * Run work, and tear down only when it throws.
 * @template T
 * @param {() => Promise<T>} work the leg
 * @param {() => Promise<unknown>} teardown the cleanup
 * @returns {Promise<T>}
 */
export async function guardedRun(work, teardown) {
  try {
    return await work();
  } catch (error) {
    await teardown();
    throw error;
  }
}

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
 *  a message and its link, or why none came; throws when the link is on another origin
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
      // A JMAP method error is an answer, not an empty list: naming it keeps a bad account or a
      // refused login from reading as "0 messages".
      const failed = answer.methodResponses.find((call) => call[0] === 'error');
      if (failed) return { found: false, reason: `the JMAP read failed: ${failed[1]?.type ?? 'unknown error'}` };
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
 * Whether the domain's robots.txt names its own sitemap.
 * @param {typeof fetch} [fetchImpl] the fetch
 * @param {string} [origin] the origin to ask
 * @returns {Promise<boolean>}
 */
export async function robotsHasSitemap(fetchImpl = defaultFetch, origin = `https://${TEST_DOMAIN}`) {
  try {
    const response = await fetchImpl(`${origin}/robots.txt`, { headers: { 'cache-control': 'no-cache' } });
    return response.status === 200 && (await response.text()).includes(`${origin}/sitemap.xml`);
  } catch {
    return false;
  }
}

/**
 * The commit that put a marker into a file on the default branch, through the machine token.
 * @param {{ fetchImpl?: typeof fetch, githubBase?: string, token: string, owner: string, repo: string, branch: string, filePath: string, marker: string }} input
 * @returns {Promise<string | null>} the commit sha, or null when the branch's file lacks the marker
 */
export async function markerCommit({ fetchImpl = fetch, githubBase = 'https://api.github.com', token, owner, repo, branch, filePath, marker }) {
  const headers = { authorization: `Bearer ${token}`, 'user-agent': 'cairn-gate' };
  const file = await fetchImpl(`${githubBase}/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`, {
    headers: { ...headers, accept: 'application/vnd.github.raw+json' },
  });
  if (file.status !== 200 || !(await file.text()).includes(marker)) return null;
  const commits = await fetchImpl(`${githubBase}/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&path=${filePath}&per_page=1`, { headers });
  if (commits.status !== 200) return null;
  return /** @type {Array<{ sha: string }>} */ (await commits.json())[0]?.sha ?? null;
}

/**
 * The answers the CLI's prompts take on a leg, matched by prompt text.
 * @param {{ siteName: string, dir: string, ownerEmail: string, token: string, buildToken?: string, accountName: string, plan: (typeof LEG_PLANS)[string] }} input
 * @returns {import('./driver.mjs').PromptEntry[]}
 */
export function promptTable({ siteName, dir, ownerEmail, token, buildToken = '', accountName, plan }) {
  return [
    { match: 'Site name', kind: 'text', value: siteName },
    { match: 'Short description', kind: 'text' },
    { match: 'Brand color', kind: 'text' },
    { match: 'AI training crawlers', kind: 'select', label: 'No preference' },
    { match: 'Directory', kind: 'text', value: dir },
    { match: 'Create the GitHub App and repository now?', kind: 'confirm', answer: true },
    { match: 'Where should the GitHub App and repository live?', kind: 'select', label: 'My personal account' },
    { match: 'Repository name', kind: 'text' },
    { match: 'GitHub App name', kind: 'text' },
    { match: 'Install, build, and deploy your site now?', kind: 'confirm', answer: true },
    { match: 'Sign-in email', kind: 'text', value: ownerEmail },
    { match: 'Which Cloudflare account', kind: 'select', label: accountName },
    { match: 'Paste your Cloudflare API token', kind: 'password', value: () => token },
    { match: 'Paste your Workers Builds deploy token', kind: 'password', value: () => buildToken },
    { match: 'Connect a domain you own to this site now?', kind: 'confirm', answer: plan.domain },
    { match: 'Which domain do you want to connect?', kind: 'text', value: TEST_DOMAIN },
    { match: 'Copy these records into the new zone?', kind: 'confirm', answer: true },
    { match: 'Turn on email sign-in for your domain now?', kind: 'confirm', answer: plan.email },
    { match: 'Connect this repository to Workers Builds now?', kind: 'confirm', answer: plan.builds },
  ];
}

/** The gate mailbox, which owns every gate install and receives its sign-in links. */
export const DEFAULT_OWNER_EMAIL = 'cairn-gate@probe.907.life';

/**
 * The owner's sign-in email for a gate run.
 * @param {Record<string, string | undefined>} env the gate's environment
 * @returns {string} `GATE_OWNER_EMAIL` when set and non-empty, else the gate mailbox
 */
export function ownerEmailFor(env) {
  return env.GATE_OWNER_EMAIL || DEFAULT_OWNER_EMAIL;
}

/**
 * @typedef {object} Install
 * @property {string} name the install's name
 * @property {string} dir its directory
 * @property {import('playwright').BrowserContext} admin its admin browser context
 * @property {boolean} signedIn whether that context holds an admin session
 */

/**
 * @typedef {object} LegContext
 * @property {string} accountName the gate Cloudflare account's name, which the CLI's account select picks
 * @property {string} leg `A1`, `A2`, `B1`, or `B2`
 * @property {string} version the exact version
 * @property {string} runDir the run directory
 * @property {Record<string, string | undefined>} env the allowlisted environment
 * @property {Record<string, string>} cliEnv the CLI child's environment
 * @property {Install} install the install the leg runs on
 * @property {import('./browser.mjs').Launched} launched the browser
 * @property {import('./browser.mjs').Creds} creds the machine account
 * @property {string} releaseNotesDir where the release notes file goes
 * @property {string} [cli] an absolute `.tgz` of the CLI to run in place of the published version
 * @property {string} [recordFile] the rehearsal file the rows go to, never a release body
 * @property {(line: string) => void} log one line per event
 */

/**
 * The state record of one install: the shared state dir holds every install's, and a retired record
 * keeps a `.retired-` name.
 * @param {string} dir the state directory
 * @param {string} installDir the install's directory, which its record names as `dir`
 * @returns {Promise<any>} the record, or null
 */
export async function readRecord(dir, installDir) {
  for (const file of await readdir(dir).catch(() => /** @type {string[]} */ ([]))) {
    if (!file.endsWith('.json') || file.startsWith('.retired-')) continue;
    const record = JSON.parse(await readFile(path.join(dir, file), 'utf8').catch(() => 'null'));
    if (record?.dir === installDir) return record;
  }
  return null;
}

/**
 * Say why the CLI run failed: the driver's reason or the exit code, then the last non-blank lines of
 * its terminal capture with ANSI escapes and spinner glyphs removed. The capture is the CLI's
 * terminal output, which prints no token.
 * @param {{ code: number, failure?: string }} result the driver's result
 * @param {string} capture the raw pty capture
 * @param {number} [lines] how many trailing lines to keep
 * @returns {string}
 */
export function cliFailureMessage(result, capture, lines = 8) {
  const reason = result.failure ? result.failure.split('\n')[0] : `exit code ${result.code}`;
  const tail = capture
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007/g, '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[⠀-⣿◇◆○●│└┌]/g, '').trim())
    .filter(Boolean)
    .slice(-lines);
  return `the CLI run failed: ${reason}${tail.length ? `\nLast output:\n${tail.join('\n')}` : ''}`;
}

/**
 * The collaborators a leg calls, injected so a test can stand in for the CLI driver and the browser.
 * @typedef {object} LegDeps
 * @property {typeof runDriver} runDriver runs the CLI
 * @property {typeof handleUrl} handleUrl handles one URL the CLI opens
 * @property {typeof tailUrlLog} tailUrlLog follows the URL log
 * @property {typeof publishViaAdmin} publishViaAdmin publishes the leg's edit
 * @property {typeof recordLeg} recordLeg writes the leg's row
 * @property {(domain: string) => Promise<string | null>} authoritativeAddress the domain's address as
 *  its zone's nameservers answer it
 * @property {(hostRules: string[], runDir: string) => Promise<Pick<import('./browser.mjs').Launched, 'newAdminContext' | 'close'>>} launchPinned
 *  a browser whose resolver is pinned by Chromium host rules, for a domain this machine's resolver
 *  cannot see yet
 * @property {(options: { token: string, accountId: string }) => Promise<BuildsReader>} makeBuildsApi
 *  the Cloudflare client a Builds leg reads its trigger and builds through
 * @property {typeof startWorkerTail} startTail starts the short `wrangler tail` B2 reads the
 *  engine's sign-in verdict from
 */

/**
 * The reads a Builds leg logs.
 * @typedef {object} BuildsReader
 * @property {(workerName: string) => Promise<string | undefined>} findWorkerTag the tag for a Worker name
 * @property {(tag: string) => Promise<any[]>} listBuildTriggers the Worker's triggers
 * @property {(tag: string) => Promise<any[]>} listBuildsForWorker the Worker's builds
 */

// A computed specifier keeps the type check from pulling the untyped client source into this graph.
const API_MODULE = new URL('./cloudflare/api.mjs', import.meta.url).href;

/** @type {LegDeps['makeBuildsApi']} */
async function makeBuildsApiDefault(options) {
  return (await import(API_MODULE)).makeApi(options);
}

/**
 * Launch a throwaway browser whose resolver maps names to fixed addresses.
 * @type {LegDeps['launchPinned']}
 */
async function launchPinnedDefault(hostRules, runDir) {
  return launchBrowser({ statePath: path.join(runDir, 'pinned-browser-session.json'), hostRules });
}

/** @type {LegDeps} */
const DEFAULT_DEPS = { runDriver, handleUrl, tailUrlLog, publishViaAdmin, recordLeg, makeBuildsApi: makeBuildsApiDefault, authoritativeAddress, launchPinned: launchPinnedDefault, startTail: startWorkerTail };

/**
 * Log, before teardown, which build token the install's trigger uses and which keys the newest
 * build's trigger metadata carries. A failed read is logged and never fails the leg. Neither line
 * prints a secret: a uuid and key names only.
 * @param {LegContext} ctx
 * @param {LegDeps} deps
 * @param {any} record the install's state record
 */
async function logBuildsFacts(ctx, deps, record) {
  const { log, cliEnv } = ctx;
  /** @param {unknown} error */
  const why = (error) => (error instanceof Error ? error.message : String(error));
  /** @type {BuildsReader} */
  let api;
  /** @type {string | undefined} */
  let tag;
  try {
    api = await deps.makeBuildsApi({ token: cliEnv.CLOUDFLARE_API_TOKEN, accountId: cliEnv.CLOUDFLARE_ACCOUNT_ID });
    const workerName = record?.cloudflare?.workerName;
    if (!workerName) throw new Error('the state record names no Worker');
    tag = await api.findWorkerTag(workerName);
    if (!tag) throw new Error(`no Worker named ${workerName}`);
  } catch (error) {
    log(`trigger build token: read failed: ${why(error)}`);
    log(`build trigger metadata keys: read failed: ${why(error)}`);
    return;
  }
  try {
    const triggers = await api.listBuildTriggers(tag);
    const recorded = record?.cloudflare?.buildsTriggerUuid;
    const trigger = triggers.find((/** @type {{ trigger_uuid?: string }} */ t) => t.trigger_uuid === recorded) ?? triggers[0];
    if (!trigger?.build_token_uuid) throw new Error('no trigger holds a build token');
    log(`trigger build token: ${trigger.build_token_uuid}`);
  } catch (error) {
    log(`trigger build token: read failed: ${why(error)}`);
  }
  try {
    const builds = await api.listBuildsForWorker(tag);
    const newest = [...builds].sort((a, b) => String(b.created_on ?? '').localeCompare(String(a.created_on ?? '')))[0];
    if (!newest) throw new Error('no build is listed');
    log(`build trigger metadata keys: ${Object.keys(newest.build_trigger_metadata ?? {}).sort().join(', ') || '(none)'}`);
  } catch (error) {
    log(`build trigger metadata keys: read failed: ${why(error)}`);
  }
}

/** @typedef {{ path: string, url: string, commit: string, marker: string, fetched: string }} RowCells */

/**
 * Run one leg end to end and record it. The row is written in a `finally`, so a leg that fails,
 * returns early, or throws still leaves one, carrying every reason joined by `"; "`. A failed record
 * write is logged and never replaces the leg's own verdict or error. A leg that fails or throws also
 * leaves a `failed` marker in the run directory, which keeps its captures through teardown.
 * @param {LegContext} ctx
 * @param {Partial<LegDeps>} [deps] collaborators, defaulting to the real ones
 * @returns {Promise<{ pass: boolean, failures: string[] }>} the verdict
 */
export async function runLeg(ctx, deps = {}) {
  const all = { ...DEFAULT_DEPS, ...deps };
  /** @type {RowCells} */
  const cells = { path: '-', url: '-', commit: '-', marker: '-', fetched: '-' };
  /** @type {{ pass: boolean, failures: string[] } | undefined} */
  let verdict;
  /** @type {string | undefined} */
  let thrown;
  try {
    verdict = await runLegSteps(ctx, all, cells);
    return verdict;
  } catch (error) {
    thrown = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (!verdict?.pass) await writeFile(path.join(ctx.runDir, 'failed'), `${ctx.leg}\n`).catch(() => {});
    const reasons = verdict ? verdict.failures : [thrown ?? 'the leg ended without a verdict'];
    try {
      await all.recordLeg({
        version: ctx.version,
        notesDir: ctx.releaseNotesDir,
        ...(ctx.recordFile ? { recordFile: ctx.recordFile } : {}),
        row: { leg: ctx.leg, ...cells, verdict: verdict?.pass ? 'pass' : `fail: ${reasons.join('; ')}`, run: path.basename(ctx.runDir) },
      });
    } catch (error) {
      ctx.log(`record: could not write the ${ctx.leg} row: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * @param {LegContext} ctx
 * @param {LegDeps} deps
 * @param {RowCells} cells the row's cells, filled as the leg learns them
 * @returns {Promise<{ pass: boolean, failures: string[] }>}
 */
async function runLegSteps(ctx, deps, cells) {
  const { accountName, leg, version, runDir, env, cliEnv, install, launched, creds, log } = ctx;
  const plan = LEG_PLANS[leg];
  const token = cliEnv.CLOUDFLARE_API_TOKEN;
  const stateDir = path.join(runDir, 'state');
  const urlLog = path.join(runDir, 'urls.log');
  await mkdir(path.dirname(install.dir), { recursive: true });

  let runCount = 0;
  let capturePath = '';

  /**
   * Run the CLI at the exact version, handling every URL it opens.
   * @param {string[]} extra the flags after `--dir`
   */
  async function runCli(extra) {
    const abort = new AbortController();
    /** @type {unknown} */
    let handlerFailure;
    // Start at the log's current end: the log is shared by every runCli of the run, and a URL an
    // earlier call handled must not be handled again.
    runCount += 1;
    capturePath = path.join(runDir, `capture-${leg}-${runCount}.bin`);
    const from = existsSync(urlLog) ? (await stat(urlLog)).size : 0;
    const tail = deps.tailUrlLog(urlLog, async (url) => {
      if (handlerFailure) return;
      try {
        const kind = await deps.handleUrl(url, {
          github: launched.github,
          admin: () => install.admin,
          creds,
          leg,
          evidenceDir: runDir,
          log,
        });
        // handleUrl returns for a sign-in only once the admin has landed on /admin.
        if (kind === 'signin') install.signedIn = true;
      } catch (error) {
        handlerFailure = error;
        abort.abort(error instanceof Error ? error.message : String(error));
      }
    }, { from });
    const result = await deps.runDriver({
      command: 'npx',
      args: [...(ctx.cli ? ['--yes', `file:${ctx.cli}`] : ['--yes', '--prefer-online', `create-cairn-site@${version}`]), '--dir', install.dir, ...extra],
      env: cliEnv,
      cwd: path.dirname(install.dir),
      table: promptTable({ siteName: install.name, dir: install.dir, ownerEmail: ownerEmailFor(env), token, buildToken: env.CF_CI_CAIRN_BUILD_TOKEN ?? '', accountName, plan }),
      logPath: path.join(runDir, 'driver.log'),
      capturePath,
      signal: abort.signal,
    });
    await tail.stop();
    return result;
  }

  const ownerFlags = plan.first ? ['--name', install.name, '--owner-email', ownerEmailFor(env), '--ai-posture', 'none'] : [];
  const cli = await runCli([...ownerFlags, ...(plan.connect ? ['--connect'] : [])]);
  if (cli.failure || cli.code !== 0) return { pass: false, failures: [cliFailureMessage(cli, await readFile(capturePath, 'utf8').catch(() => ''))] };

  const record = await readRecord(stateDir, install.dir);
  const origin = String(record?.cloudflare?.url ?? '');
  if (!origin) {
    return { pass: false, failures: ['the state record holds no workers.dev address'] };
  }

  if (plan.builds) await logBuildsFacts(ctx, deps, record);

  if (!install.signedIn) {
    const signIn = await runCli(['--sign-in']);
    if (signIn.failure || !install.signedIn) return { pass: false, failures: ['no admin session: the sign-in link was not opened and confirmed'] };
  }

  const epoch = Date.now();
  const marker = `gate-${version}-${leg}-${epoch}`;
  cells.marker = marker;
  const published = await deps.publishViaAdmin(install.admin, { origin, marker });
  const liveUrl = `${leg === 'B1' ? origin : `https://${TEST_DOMAIN}`}${published.entryPath}`;
  cells.path = published.entryPath;
  cells.url = liveUrl;

  /** @type {LegResults} */
  const results = { closingText: cli.screen, alertText: published.alertText, fetch: null, absent: null, commitOnDefaultBranch: false, robotsHasSitemap: false, mail: null };
  if (leg === 'A1') {
    const sha = await markerCommit({
      token: env.GITHUB_TEST_TOKEN ?? '',
      owner: record.github.repo.owner,
      repo: record.github.repo.repo,
      branch: record.github.repo.defaultBranch ?? 'main',
      filePath: `src/content/pages/${published.entryPath.slice(1)}.md`,
      marker,
    });
    results.commitOnDefaultBranch = sha !== null;
    cells.commit = sha ?? '-';
    results.absent = await fetchCheckAbsent(liveUrl, marker, published.control, { budgetMs: 5 * 60_000 });
  } else {
    results.fetch = await fetchCheck(liveUrl, marker);
  }
  if (leg === 'A2' || leg === 'B2') results.robotsHasSitemap = await robotsHasSitemap();

  /** @type {import('./fetch-check.mjs').FetchCheckResult | null} */
  let lastFetch = results.fetch ?? results.absent;
  if (leg === 'B2') {
    // This workstation's resolver may hold a negative answer for the test domain for 30 minutes, so
    // the browser maps it to the authoritative address when one is found.
    const address = await deps.authoritativeAddress(TEST_DOMAIN);
    const pinned = address ? await deps.launchPinned([`MAP ${TEST_DOMAIN} ${address}`], runDir) : null;
    const fresh = await (pinned ?? launched).newAdminContext();
    /** @type {ReturnType<typeof startWorkerTail> | null} */
    let tail = null;
    try {
      const owner = ownerEmailFor(env);
      // The engine logs its own verdict on a sign-in send (`auth.link.send_failed` and its code). A
      // short tail of the leg's Worker, started before the request, turns a mail miss into a cause.
      const workerName = String(record?.cloudflare?.workerName ?? '');
      tail = workerName ? deps.startTail({ workerName, env: cliEnv }) : null;
      await tail?.ready;
      const requestedAt = await requestSignInLink(fresh, { origin: `https://${TEST_DOMAIN}`, email: owner });
      const found = await findSignInMessage({
        login: owner,
        password: env.STALWART_PASSWORD_CAIRN_GATE ?? '',
        siteName: install.name,
        owner,
        sinceMs: requestedAt,
        expectedOrigin: `https://${TEST_DOMAIN}`,
      });
      const engineSaid = (await tail?.stop()) ?? [];
      if (!found.found) {
        results.mail = { from: '', fetch: null };
        log(`mail: ${found.reason}`);
        log(`engine: ${engineSaid.length ? engineSaid.join(' | ') : 'the Worker logged no sign-in event in the window'}`.slice(0, 600));
      } else {
        await confirmSignIn(fresh, found.url);
        const second = `gate-${version}-B2mail-${Date.now()}`;
        await publishViaAdmin(fresh, { origin: `https://${TEST_DOMAIN}`, marker: second });
        results.mail = { from: found.from, fetch: await fetchCheck(`https://${TEST_DOMAIN}${published.entryPath}`, second) };
      }
    } finally {
      await tail?.stop().catch(() => []);
      await fresh.close();
      await pinned?.close();
    }
  }

  const verdict = evaluateLeg(leg, results);
  lastFetch = lastFetch ?? results.fetch;
  cells.fetched = lastFetch?.fetchedAt ?? '-';
  return verdict;
}

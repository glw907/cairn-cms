// The gate's entry: the credential smoke that proves the proving accounts work, and the sweep that
// cleans up after a run. run-gate.sh starts this with an allowlisted environment.
//
// Every check prints one verdict and never a value. Every HTTP call goes through Node `fetch`, so
// no token is ever in argv.
import { mkdirSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { totpFromEnv } from './totp.mjs';
import { deleteGithubApp, ensureGithubSession, launchBrowser, listGithubApps } from './browser.mjs';
import { checkMailbox } from './mail.mjs';
import { GATE_ACCOUNT_ID, apply, checkScopes, cfResult, dryRun, findZone, groupReads, makeClients, runLogger } from './sweep.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Where the smoke writes the reply shapes the setup tool's fakes are checked against. */
export const SHAPES_FILE = path.join(HERE, '..', '..', 'src', 'tests', 'unit', 'fixtures', 'gate-reply-shapes.json');
/** The mailbox that owns every proving site and receives its sign-in links. */
export const DEFAULT_OWNER_EMAIL = 'cairn-gate@probe.907.life';

export { GATE_ACCOUNT_ID };

/**
 * The keys and types of a JSON value, with no value. An array is described by its first element.
 * @param {unknown} value
 * @returns {unknown} a structure of the same shape holding type names
 */
export function shapeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.length === 0 ? ['empty'] : [shapeOf(value[0])];
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(/** @type {Record<string, unknown>} */ (value)).map(([key, inner]) => [key, shapeOf(inner)]));
  }
  return typeof value;
}

/**
 * @typedef {object} SmokeDeps
 * @property {typeof fetch} [fetchImpl] the fetch for every HTTP call
 * @property {string} [apiBase] the Cloudflare API base, `https://api.cloudflare.com/client/v4`
 * @property {string} [githubBase] the GitHub API base, `https://api.github.com`
 * @property {string} [sessionUrl] the mailbox's JMAP session URL
 * @property {string} [shapesFile] where to write the reply shapes; none are written when omitted
 * @property {(line: string) => void} [print] receives each verdict line
 */

/**
 * Run the credential smoke: the token, one read per permission group, the machine account, the
 * TOTP code, and the mailbox. Only reads; it creates nothing.
 * @param {{ env: Record<string, string | undefined>, deps?: SmokeDeps }} input the gate's environment
 * @returns {Promise<boolean>} true when no check failed
 */
export async function runSmoke({ env, deps = {} }) {
  const {
    fetchImpl = fetch,
    apiBase = 'https://api.cloudflare.com/client/v4',
    githubBase = 'https://api.github.com',
    sessionUrl,
    shapesFile,
    print = console.log,
  } = deps;
  const token = env.CF_WS_CAIRN_CLEANROOM_TOKEN;
  const secrets = [token, env.GITHUB_TEST_TOKEN, env.GITHUB_TEST_PASSWORD, env.GITHUB_TEST_TOTP_SECRET, env.STALWART_PASSWORD_CAIRN_GATE];
  /** @param {string} text */
  const scrub = (text) => {
    let clean = text;
    for (const secret of secrets) if (secret) clean = clean.split(secret).join('[redacted]');
    return clean;
  };
  let failed = false;
  /** @type {Record<string, unknown>} */
  const shapes = {};

  /**
   * @param {string} name the check
   * @param {() => Promise<string>} run returns the detail; throws to fail
   */
  async function check(name, run) {
    try {
      const detail = await run();
      print(`ok       ${name}${detail ? `: ${scrub(detail)}` : ''}`);
    } catch (error) {
      failed = true;
      print(`FAIL     ${name}: ${scrub(error instanceof Error ? error.message : String(error))}`);
    }
  }

  print(`host ${hostname()}`);
  if (!token) {
    print('FAIL     cleanroom token: CF_WS_CAIRN_CLEANROOM_TOKEN is not in the environment; the age store holds it.');
    return false;
  }
  const clients = makeClients({ cloudflareToken: token, githubToken: env.GITHUB_TEST_TOKEN ?? '', fetchImpl, cloudflareBase: apiBase, githubBase });
  const { cf } = clients;
  /** @type {string | undefined} */
  let zoneId;

  await check('cleanroom token at /accounts/<id>/tokens/verify', async () => {
    const answer = await cf('GET', `/accounts/${GATE_ACCOUNT_ID}/tokens/verify`);
    const result = cfResult(answer, '/accounts/<id>/tokens/verify');
    shapes.tokenVerify = shapeOf(answer.json);
    if (result.status !== 'active') throw new Error(`the token is ${result.status}`);
    return `status ${result.status}`;
  });
  await check('permission group Zone (find carin-test.org)', async () => {
    zoneId = await findZone(clients);
    return 'one zone';
  });
  for (const read of groupReads(GATE_ACCOUNT_ID, zoneId ?? 'unknown')) {
    await check(`permission group ${read.group}`, async () => {
      if (!zoneId && read.route.includes('/zones/unknown')) throw new Error('no zone to ask');
      const answer = await cf('GET', read.route);
      cfResult(answer, `${read.group} read`);
      shapes[read.group] = shapeOf(answer.json);
      return 'read answered';
    });
  }
  await check('machine account GET /user', async () => {
    if (!env.GITHUB_TEST_TOKEN) throw new Error('GITHUB_TEST_TOKEN is not in the environment');
    const response = await fetchImpl(`${githubBase}/user`, {
      headers: { authorization: `Bearer ${env.GITHUB_TEST_TOKEN}`, 'user-agent': 'cairn-gate-smoke' },
    });
    if (response.status !== 200) throw new Error(`answered ${response.status}`);
    const body = /** @type {{ login?: string }} */ (await response.json());
    if (body.login !== env.GITHUB_TEST_LOGIN) throw new Error('the token belongs to a different login');
    const scopes = (response.headers.get('x-oauth-scopes') ?? '').split(',').map((scope) => scope.trim());
    for (const needed of ['repo', 'delete_repo']) {
      if (!scopes.includes(needed)) throw new Error(`the token lacks the ${needed} scope`);
    }
    shapes.githubUser = shapeOf(body);
    return 'login matches; scopes repo and delete_repo';
  });
  await check('TOTP code computes', async () => {
    if (!env.GITHUB_TEST_TOTP_SECRET) throw new Error('GITHUB_TEST_TOTP_SECRET is not in the environment');
    if (!/^\d{6}$/.test(totpFromEnv(env))) throw new Error('not a six-digit code');
    return 'six digits';
  });
  await check('mailbox over JMAP', async () => {
    if (!env.STALWART_PASSWORD_CAIRN_GATE) throw new Error('STALWART_PASSWORD_CAIRN_GATE is not in the environment');
    await checkMailbox({
      login: env.GATE_OWNER_EMAIL || DEFAULT_OWNER_EMAIL,
      password: env.STALWART_PASSWORD_CAIRN_GATE,
      ...(sessionUrl ? { sessionUrl, trustedHosts: [new URL(sessionUrl).hostname] } : {}),
      fetchImpl,
    });
    return 'session names a mail account and a query answers';
  });

  if (shapesFile) {
    mkdirSync(path.dirname(shapesFile), { recursive: true });
    writeFileSync(shapesFile, `${JSON.stringify(shapes, null, 2)}\n`);
    print(`ok       reply shapes written (keys and types only)`);
  }
  return !failed;
}

/**
 * The machine account's browser, launched on first use.
 * @param {Record<string, string | undefined>} env the allowlisted environment
 * @param {{ headed?: boolean }} [options] `headed` launches the browser with a window (headless otherwise)
 * @returns {{ getBrowser: () => Promise<import('./browser.mjs').Launched>, creds: import('./browser.mjs').Creds, close: () => Promise<void> }}
 */
export function makeSession(env, { headed = false } = {}) {
  const statePath = path.join(env.HOME ?? '', '.local', 'state', 'cairn-gate', 'github-session.json');
  /** @type {Promise<import('./browser.mjs').Launched> | undefined} */
  let launching;
  /** @type {import('./browser.mjs').Creds} */
  const creds = {
    login: env.GITHUB_TEST_LOGIN ?? '',
    password: env.GITHUB_TEST_PASSWORD ?? '',
    totp: () => totpFromEnv(env),
  };
  const getBrowser = () => {
    launching ??= launchBrowser({ statePath, headless: !headed }).then(async (launched) => {
      await ensureGithubSession(launched.github, creds);
      return launched;
    });
    return launching;
  };
  return {
    getBrowser,
    creds,
    close: async () => {
      if (launching) await (await launching).close();
    },
  };
}

const USAGE = 'Usage: run-gate.sh --smoke | sweep [--apply | --check-scopes] [--headed]';

/**
 * The collaborators `main` calls, injected so a test runs it with no browser and no network.
 * @typedef {object} MainDeps
 * @property {typeof makeSession} makeSession the browser wiring
 * @property {(env: Record<string, string | undefined>) => import('./sweep.mjs').Clients} makeClients the API clients
 * @property {(session: ReturnType<typeof makeSession>) => Pick<import('./sweep.mjs').Run, 'listApps' | 'deleteApp'>} browserApps the Apps calls, through the session's browser
 * @property {(line: string) => void} [print] receives each output line
 * @property {() => number} [now] the clock for the probe names
 */

/** @type {MainDeps} */
const DEFAULT_MAIN_DEPS = {
  makeSession,
  browserApps: (session) => ({
    listApps: async () => listGithubApps((await session.getBrowser()).github, session.creds),
    deleteApp: async (slug) => deleteGithubApp((await session.getBrowser()).github, slug, session.creds),
  }),
  makeClients: (env) => makeClients({ cloudflareToken: env.CF_WS_CAIRN_CLEANROOM_TOKEN ?? '', githubToken: env.GITHUB_TEST_TOKEN ?? '' }),
};

/**
 * The command line: `--smoke` runs the credential smoke; `sweep` lists what the runs left (a dry
 * run), `sweep --apply` deletes it, and `sweep --check-scopes` proves the token's groups.
 * @param {string[]} argv the arguments after the script name
 * @param {Record<string, string | undefined>} env the allowlisted environment
 * @param {Partial<MainDeps>} [overrides] collaborators, defaulting to the real ones
 * @returns {Promise<number>} the exit code
 */
export async function main(argv, env, overrides = {}) {
  const deps = { ...DEFAULT_MAIN_DEPS, ...overrides };
  const print = deps.print ?? console.log;
  const runDir = env.GATE_RUN_DIR;
  if (!runDir) {
    console.error('GATE_RUN_DIR is not set; start this through scripts/gate/run-gate.sh.');
    return 2;
  }
  if (argv.length === 1 && argv[0] === '--smoke') return (await runSmoke({ env, deps: { shapesFile: SHAPES_FILE, print } })) ? 0 : 1;

  const flags = argv.slice(1).filter((arg) => arg !== '--headed');
  const mode = flags.length === 0 ? 'dry' : flags.length === 1 && flags[0] === '--apply' ? 'apply' : flags.length === 1 && flags[0] === '--check-scopes' ? 'check-scopes' : null;
  if (argv[0] !== 'sweep' || !mode) {
    console.error(USAGE);
    return 2;
  }
  if (!env.CF_WS_CAIRN_CLEANROOM_TOKEN || !env.GITHUB_TEST_TOKEN) {
    console.error('The sweep needs CF_WS_CAIRN_CLEANROOM_TOKEN and GITHUB_TEST_TOKEN in the environment.');
    return 2;
  }
  const session = deps.makeSession(env, { headed: argv.includes('--headed') });
  try {
    const run = {
      clients: deps.makeClients(env),
      ...deps.browserApps(session),
      log: runLogger(runDir, print),
      ...(deps.now ? { now: deps.now } : {}),
    };
    return await (mode === 'dry' ? dryRun(run) : mode === 'apply' ? apply(run) : checkScopes(run));
  } catch (error) {
    console.error(`sweep failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    await session.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2), process.env);
}

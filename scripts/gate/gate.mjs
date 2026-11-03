// The release gate's entry: the environments each child gets, and the credential smoke that proves
// the gate's accounts work before any leg spends them. run-gate.sh starts this with an allowlisted
// environment; every child below gets an explicit environment object, never the parent's.
//
// The smoke prints one verdict per check and never a value. Every HTTP call goes through Node
// `fetch` (or the CLI's own `makeApi`, which does the same), so no token is ever in argv.
import { execFile } from 'node:child_process';
import { hostname } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { totpFromEnv } from './totp.mjs';

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
// The CLI's own API client. It is loaded by a computed specifier so the type check does not pull
// the package's untyped source into the repo's checked graph.
const API_MODULE = new URL('../../packages/create-cairn-site/src/cloudflare/api.mjs', import.meta.url).href;

/** The Cloudflare account the gate token and its throwaway resources live on. */
export const GATE_ACCOUNT_ID = '120c269ad6d3dfbe6d63a0bb53758ca0';
/** The test domain whose zone is active on that account. */
const TEST_DOMAIN = 'carin-test.org';
/** The wrangler the generated template pins (`templates/waymark/package.json`). */
const WRANGLER = 'wrangler@4.156.2';

/**
 * The environment the CLI child gets, and through it npm, Vite, and wrangler. It carries the gate
 * token as `CLOUDFLARE_API_TOKEN` and never a `GITHUB_TEST_*` name: the browser half owns those.
 * @param {{ runDir: string, parentEnv: Record<string, string | undefined> }} input the run
 *  directory and the allowlisted environment this process started with
 * @returns {Record<string, string>} the child's whole environment
 */
export function buildCliEnv({ runDir, parentEnv }) {
  const token = parentEnv.CF_WS_CAIRN_GATE_TOKEN;
  if (!token) throw new Error('CF_WS_CAIRN_GATE_TOKEN is not in the environment; the age store holds the gate token.');
  return {
    PATH: `${HERE}${path.delimiter}${parentEnv.PATH ?? ''}`,
    HOME: parentEnv.HOME ?? '',
    TERM: parentEnv.TERM ?? 'xterm-256color',
    LANG: parentEnv.LANG ?? 'C.UTF-8',
    CLOUDFLARE_API_TOKEN: token,
    CLOUDFLARE_ACCOUNT_ID: GATE_ACCOUNT_ID,
    CAIRN_STATE_DIR: path.join(runDir, 'state'),
    GATE_URL_LOG: path.join(runDir, 'urls.log'),
  };
}

/**
 * @typedef {object} SmokeDeps
 * @property {typeof fetch} [fetchImpl] the fetch for every HTTP call
 * @property {string} [apiBase] the Cloudflare API base, `https://api.cloudflare.com/client/v4`
 * @property {string} [githubBase] the GitHub API base, `https://api.github.com`
 * @property {(args: string[], env: Record<string, string>) => Promise<string>} [runWrangler] runs the
 *  template's wrangler and returns its stdout
 * @property {(line: string) => void} [print] receives each verdict line
 * @property {() => number} [now] the clock for the probe names
 */

/**
 * @param {string[]} args wrangler arguments
 * @param {Record<string, string>} env the CLI child's environment
 * @returns {Promise<string>} stdout, whether or not wrangler exited cleanly
 */
async function runWranglerDefault(args, env) {
  try {
    const { stdout } = await execFileAsync('npx', ['--yes', WRANGLER, ...args], { env, timeout: 180_000 });
    return stdout;
  } catch (error) {
    return /** @type {{ stdout?: string }} */ (error).stdout ?? '';
  }
}

/**
 * Run the credential smoke: the reads, then the three throwaway writes, each deleted by the id its
 * create returned.
 * @param {{ env: Record<string, string | undefined>, runDir: string, deps?: SmokeDeps }} input the
 *  gate's environment and run directory
 * @returns {Promise<boolean>} true when no check failed
 */
export async function runSmoke({ env, runDir, deps = {} }) {
  const {
    fetchImpl = fetch,
    apiBase = 'https://api.cloudflare.com/client/v4',
    githubBase = 'https://api.github.com',
    runWrangler = runWranglerDefault,
    print = console.log,
    now = Date.now,
  } = deps;
  const cliEnv = buildCliEnv({ runDir, parentEnv: env });
  const token = cliEnv.CLOUDFLARE_API_TOKEN;
  const secrets = [token, env.GITHUB_TEST_TOKEN, env.GITHUB_TEST_PASSWORD, env.GITHUB_TEST_TOTP_SECRET];
  /** @param {string} text */
  const scrub = (text) => {
    let clean = text;
    for (const secret of secrets) if (secret) clean = clean.split(secret).join('[redacted]');
    return clean;
  };
  let failed = false;

  /**
   * @param {string} name the check
   * @param {() => Promise<string | null>} run returns the detail, or null for a skip; throws to fail
   */
  async function check(name, run) {
    try {
      const detail = await run();
      print(detail === null ? `skipped  ${name}: not in store` : `ok       ${name}${detail ? `: ${scrub(detail)}` : ''}`);
    } catch (error) {
      failed = true;
      print(`FAIL     ${name}: ${scrub(error instanceof Error ? error.message : String(error))}`);
    }
  }

  /**
   * @param {string} method
   * @param {string} route a path under the Cloudflare API base
   * @param {unknown} [body]
   * @returns {Promise<{ status: number, json: any }>}
   */
  async function cf(method, route, body) {
    const response = await fetchImpl(`${apiBase}${route}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // A non-JSON body is reported by status alone.
    }
    return { status: response.status, json };
  }

  /**
   * @param {{ status: number, json: any }} answer
   * @param {string} what
   */
  function mustSucceed(answer, what) {
    if (answer.status !== 200 || !answer.json?.success) {
      const first = answer.json?.errors?.[0];
      throw new Error(`${what} answered ${answer.status}${first ? ` (${first.code}: ${first.message})` : ''}`);
    }
    return answer.json.result;
  }

  print(`host ${hostname()}`);
  const previousBase = process.env.CAIRN_CLOUDFLARE_API_BASE;
  process.env.CAIRN_CLOUDFLARE_API_BASE = apiBase;
  /** @type {{ makeApi: (options: { token: string, accountId: string, dir?: string }) => any }} */
  const { makeApi } = await import(API_MODULE);
  const api = makeApi({ token, accountId: GATE_ACCOUNT_ID });
  /** @type {string | undefined} */
  let zoneId;
  /** @type {string | undefined} */
  let verifiedId;

  try {
    await check('gate token at /user/tokens/verify', async () => {
      const result = mustSucceed(await cf('GET', '/user/tokens/verify'), '/user/tokens/verify');
      verifiedId = result.id;
      return `status ${result.status}`;
    });
    await check('gate token at /accounts/<id>/tokens/verify', async () => {
      const result = mustSucceed(await cf('GET', `/accounts/${GATE_ACCOUNT_ID}/tokens/verify`), 'the account verify route');
      return `status ${result.status}`;
    });
    await check(`makeApi.listZones for ${TEST_DOMAIN}`, async () => {
      const zones = await api.listZones({ name: TEST_DOMAIN });
      if (zones.length !== 1) throw new Error(`expected one zone, found ${zones.length}`);
      zoneId = zones[0].id;
      return `zone ${zones[0].status}`;
    });
    await check('makeApi.getBuildTokens', async () => `${(await api.getBuildTokens()).length} registrations`);
    await check('makeApi.listSendingSubdomains', async () => {
      if (!zoneId) throw new Error('no zone to ask');
      return `${(await api.listSendingSubdomains(zoneId)).length} subdomains`;
    });
    await check('wrangler whoami', async () => {
      const text = await runWrangler(['whoami'], cliEnv);
      if (!/you are logged in/i.test(text)) throw new Error('whoami did not print "you are logged in"');
      return 'logged in';
    });
    await check('wrangler whoami --json', async () => {
      const text = await runWrangler(['whoami', '--json'], cliEnv);
      const start = text.indexOf('{');
      const accounts = JSON.parse(start === -1 ? '{}' : text.slice(start)).accounts;
      if (!Array.isArray(accounts) || accounts.length === 0) throw new Error('no accounts listed');
      if (!accounts.some((/** @type {{ id?: string }} */ account) => account.id === GATE_ACCOUNT_ID)) {
        throw new Error('the accounts list does not name the gate account');
      }
      return `${accounts.length} account(s), gate account listed`;
    });
    await check('machine account GET /user', async () => {
      if (!env.GITHUB_TEST_TOKEN) return null;
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
      return 'login matches; scopes repo and delete_repo';
    });
    await check('TOTP code computes', async () => {
      if (!env.GITHUB_TEST_TOTP_SECRET) return null;
      if (!/^\d{6}$/.test(totpFromEnv(env))) throw new Error('not a six-digit code');
      return 'six digits';
    });

    const probe = `cairn-e2e-gate-probe-${now()}`;
    await check(`D1 write probe ${probe}`, async () => {
      const created = mustSucceed(await cf('POST', `/accounts/${GATE_ACCOUNT_ID}/d1/database`, { name: probe }), 'D1 create');
      mustSucceed(await cf('DELETE', `/accounts/${GATE_ACCOUNT_ID}/d1/database/${created.uuid}`), `D1 delete (left behind: ${probe})`);
      return 'created and deleted';
    });
    await check(`R2 write probe ${probe}`, async () => {
      mustSucceed(await cf('POST', `/accounts/${GATE_ACCOUNT_ID}/r2/buckets`, { name: probe }), 'R2 create');
      mustSucceed(await cf('DELETE', `/accounts/${GATE_ACCOUNT_ID}/r2/buckets/${probe}`), `R2 delete (left behind: ${probe})`);
      return 'created and deleted';
    });
    await check(`build token registration probe ${probe}`, async () => {
      if (!verifiedId) throw new Error('the user verify route gave no token id');
      const created = await api.createBuildToken({ name: probe, secret: token, cloudflareTokenId: verifiedId });
      mustSucceed(
        await cf('DELETE', `/accounts/${GATE_ACCOUNT_ID}/builds/tokens/${created.build_token_uuid}`),
        `build token delete (left behind: ${probe})`,
      );
      return 'Builds accepted the gate token; registered and deleted';
    });
  } finally {
    if (previousBase === undefined) delete process.env.CAIRN_CLOUDFLARE_API_BASE;
    else process.env.CAIRN_CLOUDFLARE_API_BASE = previousBase;
  }
  return !failed;
}

/**
 * The command line. `--smoke` runs the credential smoke; the legs and teardown arrive with the
 * browser half.
 * @param {string[]} argv the arguments after the script name
 * @param {Record<string, string | undefined>} env the allowlisted environment
 * @returns {Promise<number>} the exit code
 */
export async function main(argv, env) {
  const runDir = env.GATE_RUN_DIR;
  if (!runDir) {
    console.error('GATE_RUN_DIR is not set; start this through scripts/gate/run-gate.sh.');
    return 2;
  }
  if (argv.includes('--smoke')) return (await runSmoke({ env, runDir })) ? 0 : 1;
  console.error('Usage: run-gate.sh --smoke');
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2), process.env);
}

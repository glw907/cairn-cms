// The release gate's entry: the environments each child gets, and the credential smoke that proves
// the gate's accounts work before any leg spends them. run-gate.sh starts this with an allowlisted
// environment; every child below gets an explicit environment object, never the parent's.
//
// The smoke prints one verdict per check and never a value. Every HTTP call goes through Node
// `fetch` (or the CLI's own `makeApi`, which does the same), so no token is ever in argv.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { hostname } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { totpFromEnv } from './totp.mjs';
import { deleteGithubApp, ensureGithubSession, launchBrowser } from './browser.mjs';
import { LEG_PLANS, installName, runLeg } from './legs.mjs';
import { recordLeg, recordPending } from './record.mjs';
import { teardownStateDir } from './teardown.mjs';

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
// The gate's Cloudflare API client. It is loaded by a computed specifier so the type check does not
// pull its untyped source into the repo's checked graph.
const API_MODULE = new URL('./cloudflare/api.mjs', import.meta.url).href;

/** The Cloudflare account the gate token and its throwaway resources live on. */
export const GATE_ACCOUNT_ID = '120c269ad6d3dfbe6d63a0bb53758ca0';
/** That account's name, which the CLI's account select is answered with. */
export const GATE_ACCOUNT_NAME = 'glw907';
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
    const { stdout } = await execFileAsync('npx', ['--yes', '--prefer-online', WRANGLER, ...args], { env, timeout: 180_000 });
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
  const buildToken = env.CF_CI_CAIRN_BUILD_TOKEN;
  const secrets = [token, buildToken, env.GITHUB_TEST_TOKEN, env.GITHUB_TEST_PASSWORD, env.GITHUB_TEST_TOTP_SECRET];
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
   * Report a check that never fails the smoke, whatever it finds.
   * @param {string} name the check
   * @param {() => Promise<string>} run returns the detail; a throw is reported, not counted
   */
  async function info(name, run) {
    try {
      print(`info     ${name}: ${scrub(await run())}`);
    } catch (error) {
      print(`info     ${name}: ${scrub(error instanceof Error ? error.message : String(error))}`);
    }
  }

  /**
   * @param {string} method
   * @param {string} route a path under the Cloudflare API base
   * @param {unknown} [body]
   * @param {string} [bearer] the token to send; the gate token when omitted
   * @returns {Promise<{ status: number, json: any }>}
   */
  async function cf(method, route, body, bearer = token) {
    const response = await fetchImpl(`${apiBase}${route}`, {
      method,
      headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
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
  /** @type {string | undefined} */
  let buildVerifiedId;

  try {
    await check('gate token at /user/tokens/verify', async () => {
      const result = mustSucceed(await cf('GET', '/user/tokens/verify'), '/user/tokens/verify');
      verifiedId = result.id;
      return `status ${result.status}`;
    });
    // Informational: a user-owned token cannot use the account verify route, and the setup tool never calls it.
    await info('gate token at /accounts/<id>/tokens/verify', async () => {
      const result = mustSucceed(await cf('GET', `/accounts/${GATE_ACCOUNT_ID}/tokens/verify`), 'the account verify route');
      return `status ${result.status}`;
    });
    // Every Builds leg answers the CLI's build-token prompt with this second token, so its absence fails.
    await check('build token at /user/tokens/verify', async () => {
      if (!buildToken) throw new Error('CF_CI_CAIRN_BUILD_TOKEN is not in the environment; the age store holds the build token.');
      const result = mustSucceed(await cf('GET', '/user/tokens/verify', undefined, buildToken), '/user/tokens/verify with the build token');
      buildVerifiedId = result.id;
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
      const created = mustSucceed(await cf('POST', `/accounts/${GATE_ACCOUNT_ID}/d1/database`, { name: probe }, buildToken), 'D1 create');
      mustSucceed(await cf('DELETE', `/accounts/${GATE_ACCOUNT_ID}/d1/database/${created.uuid}`, undefined, buildToken), `D1 delete (left behind: ${probe})`);
      return 'created and deleted';
    });
    await check(`R2 write probe ${probe}`, async () => {
      mustSucceed(await cf('POST', `/accounts/${GATE_ACCOUNT_ID}/r2/buckets`, { name: probe }, buildToken), 'R2 create');
      mustSucceed(await cf('DELETE', `/accounts/${GATE_ACCOUNT_ID}/r2/buckets/${probe}`, undefined, buildToken), `R2 delete (left behind: ${probe})`);
      return 'created and deleted';
    });
    await check(`build token registration probe ${probe}`, async () => {
      if (!buildToken || !buildVerifiedId) throw new Error('the build token verify route gave no token id');
      // Registering needs Workers CI, which only the gate token holds, so the gate token's api sends
      // it; the registration carries the build token as its secret.
      const created = await api.createBuildToken({ name: probe, secret: buildToken, cloudflareTokenId: buildVerifiedId });
      mustSucceed(
        await cf('DELETE', `/accounts/${GATE_ACCOUNT_ID}/builds/tokens/${created.build_token_uuid}`),
        `build token delete (left behind: ${probe})`,
      );
      return 'Builds accepted the build token; registered and deleted';
    });
    // Integrity: the standing registration is named `cairn-build`; a probe leftover starts with the probe prefix.
    await info('cairn-build registrations', async () => {
      const tokens = await api.getBuildTokens();
      const standing = tokens.filter((/** @type {{ build_token_name?: string }} */ entry) => entry.build_token_name === 'cairn-build');
      const probes = tokens.filter((/** @type {{ build_token_name?: string }} */ entry) => entry.build_token_name?.startsWith('cairn-e2e-gate-probe-'));
      const each = standing.map(
        (/** @type {{ build_token_uuid?: string, cloudflare_token_id?: string }} */ entry) =>
          `uuid=${entry.build_token_uuid} token-id-match=${buildVerifiedId && entry.cloudflare_token_id === buildVerifiedId ? 'yes' : 'no'}`,
      );
      return `${standing.length}${each.length ? ` ${each.join(', ')}` : ''}; probe registrations: ${probes.length}`;
    });
  } finally {
    if (previousBase === undefined) delete process.env.CAIRN_CLOUDFLARE_API_BASE;
    else process.env.CAIRN_CLOUDFLARE_API_BASE = previousBase;
  }
  return !failed;
}

const USAGE =
  'Usage: run-gate.sh --smoke | --teardown-stale | --teardown-run | --leg <A1|A2|B1|B2> [--leg ...] --version <v> | --all --version <v> [--headed] [--cli <absolute .tgz> --record-file <absolute path>]';

/**
 * @param {string[]} argv the arguments
 * @param {string} name a flag
 * @returns {string[]} every value given to the flag
 */
function flagValues(argv, name) {
  /** @type {string[]} */
  const values = [];
  argv.forEach((arg, i) => {
    if (arg === name && argv[i + 1] !== undefined) values.push(argv[i + 1]);
  });
  return values;
}

/**
 * The gate's browser and teardown wiring for one process. The browser launches on first use.
 * @param {Record<string, string | undefined>} env the allowlisted environment
 * @param {{ headed?: boolean }} [options] `headed` launches the browser with a window (headless otherwise)
 * @returns {{ getBrowser: () => Promise<import('./browser.mjs').Launched>, creds: import('./browser.mjs').Creds, teardownDeps: import('./teardown.mjs').TeardownDeps, close: () => Promise<void> }}
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
    teardownDeps: {
      fetchImpl: fetch,
      cloudflareBase: 'https://api.cloudflare.com/client/v4',
      githubBase: 'https://api.github.com',
      cloudflareToken: env.CF_WS_CAIRN_GATE_TOKEN ?? '',
      githubToken: env.GITHUB_TEST_TOKEN ?? '',
      accountId: GATE_ACCOUNT_ID,
      deleteApp: async (slug) => deleteGithubApp((await getBrowser()).github, slug, creds),
    },
    close: async () => {
      if (launching) await (await launching).close();
    },
  };
}

/**
 * Tear down every install recorded under one run directory.
 * @param {string} dir the run directory
 * @param {import('./teardown.mjs').TeardownDeps} deps the teardown wiring
 * @returns {Promise<string[]>} the steps left
 */
export async function teardownRun(dir, deps) {
  // A failed leg's captures are the evidence of why it failed, so they outlive the teardown.
  const failed = existsSync(path.join(dir, 'failed'));
  const captures = failed ? [] : (await readdir(dir).catch(() => /** @type {string[]} */ ([]))).filter((f) => /^capture-.*\.bin$/.test(f));
  const { left } = await teardownStateDir({
    stateDir: path.join(dir, 'state'),
    deps,
    cleanup: [...captures.map((f) => path.join(dir, f)), ...(failed ? [] : [path.join(dir, 'urls.log')])],
  });
  for (const line of left) console.error(`teardown left: ${line}`);
  return left;
}

/**
 * Every earlier run directory with a recorded install gets the same teardown.
 * @param {string} runDir this run's directory, which is skipped
 * @param {import('./teardown.mjs').TeardownDeps} deps the teardown wiring
 * @returns {Promise<string[]>} the steps left
 */
export async function teardownStale(runDir, deps) {
  const runs = path.dirname(runDir);
  /** @type {string[]} */
  const left = [];
  for (const name of await readdir(runs).catch(() => /** @type {string[]} */ ([]))) {
    const dir = path.join(runs, name);
    if (dir !== runDir) left.push(...(await teardownRun(dir, deps)));
  }
  return left;
}

/**
 * The collaborators `main` calls, injected so a test can run it without a browser or a release.
 * @typedef {object} MainDeps
 * @property {typeof makeSession} makeSession the browser and teardown wiring
 * @property {typeof runLeg} runLeg runs one leg
 * @property {Partial<import('./legs.mjs').LegDeps>} legDeps collaborators handed to every leg
 * @property {typeof recordLeg} recordLeg writes a row for a leg that did not run
 * @property {typeof recordPending} recordPending marks legs `pending` before the run starts
 * @property {typeof teardownRun} teardownRun tears down one run directory
 * @property {typeof teardownStale} teardownStale tears down every earlier run directory
 */

/** @type {MainDeps} */
const DEFAULT_MAIN_DEPS = { makeSession, runLeg, legDeps: {}, recordLeg, recordPending, teardownRun, teardownStale };

/**
 * Split legs into one list per install, in the order given, so a failure in one install's legs
 * never stops the other's.
 * @param {string[]} legs the legs to run
 * @returns {string[][]} the groups
 */
function groupByInstall(legs) {
  /** @type {Map<string, string[]>} */
  const groups = new Map();
  for (const leg of legs) {
    const key = LEG_PLANS[leg].install;
    groups.set(key, [...(groups.get(key) ?? []), leg]);
  }
  return [...groups.values()];
}

/**
 * The command line. `--smoke` runs the credential smoke; `--leg` and `--all` run the legs;
 * `--teardown-run` and `--teardown-stale` remove what a run or an earlier run left. A run first
 * marks its legs `pending` under its run id and stops if it cannot; a group that fails or throws
 * leaves the other group to run, and the legs after the failure get a `skipped` row.
 * @param {string[]} argv the arguments after the script name
 * @param {Record<string, string | undefined>} env the allowlisted environment
 * @param {Partial<MainDeps>} [overrides] collaborators, defaulting to the real ones
 * @returns {Promise<number>} the exit code
 */
export async function main(argv, env, overrides = {}) {
  const deps = { ...DEFAULT_MAIN_DEPS, ...overrides };
  const runDir = env.GATE_RUN_DIR;
  if (!runDir) {
    console.error('GATE_RUN_DIR is not set; start this through scripts/gate/run-gate.sh.');
    return 2;
  }
  if (argv.includes('--smoke')) return (await runSmoke({ env, runDir })) ? 0 : 1;

  const session = deps.makeSession(env, { headed: argv.includes('--headed') });
  try {
    if (argv.includes('--teardown-run')) return (await deps.teardownRun(runDir, session.teardownDeps)).length === 0 ? 0 : 1;
    if (argv.includes('--teardown-stale')) return (await deps.teardownStale(runDir, session.teardownDeps)).length === 0 ? 0 : 1;

    const all = argv.includes('--all');
    const legs = all ? ['A1', 'A2', 'B1', 'B2'] : flagValues(argv, '--leg');
    const version = flagValues(argv, '--version')[0];
    if (legs.length === 0 || !version || legs.some((leg) => !(leg in LEG_PLANS))) {
      console.error(USAGE);
      return 2;
    }
    const cli = flagValues(argv, '--cli')[0];
    const recordFile = flagValues(argv, '--record-file')[0];
    if (argv.includes('--cli') ? !cli || !path.isAbsolute(cli) || !recordFile : recordFile !== undefined || argv.includes('--record-file')) {
      console.error(USAGE);
      return 2;
    }
    if (recordFile && !(await stat(path.dirname(recordFile)).then((s) => s.isDirectory(), () => false))) {
      console.error(`The directory of --record-file ${recordFile} does not exist; the gate ran nothing.`);
      return 2;
    }
    await deps.teardownStale(runDir, session.teardownDeps);

    const run = path.basename(runDir);
    const notesDir = path.join(runDir, 'notes');
    try {
      await deps.recordPending({ version, legs, run, notesDir, fresh: all, ...(recordFile ? { recordFile } : {}) });
    } catch (error) {
      console.error(`Could not mark the legs pending: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }

    /**
     * Write a row for a leg that did not run to its end, logging a failed write.
     * @param {string} leg the leg
     * @param {string} verdict the verdict cell
     */
    const recordUnrun = async (leg, verdict) => {
      try {
        await deps.recordLeg({ version, notesDir, ...(recordFile ? { recordFile } : {}), row: { leg, path: '-', url: '-', commit: '-', marker: '-', fetched: '-', verdict, run } });
      } catch (error) {
        console.error(`could not write the ${leg} row: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    const cliEnv = buildCliEnv({ runDir, parentEnv: env });
    const launched = await session.getBrowser();
    const started = new Date();
    /** @type {Map<string, import('./legs.mjs').Install>} */
    const installs = new Map();
    let passed = true;
    const names = { a: installName(version, 'a', started), b: installName(version, 'b', started) };

    /** @param {string[]} group the legs of one install, in order */
    const runGroup = async (group) => {
      for (const [index, leg] of group.entries()) {
        /** @type {string | undefined} */
        let stopped;
        let entered = false;
        try {
          const plan = LEG_PLANS[leg];
          let install = installs.get(plan.install);
          if (!install) {
            if (!plan.first) throw new Error(`Leg ${leg} needs the install an earlier leg makes; list ${plan.install === 'a' ? 'A1' : 'B1'} before it in the same run.`);
            install = {
              name: names[plan.install],
              dir: path.join(runDir, 'installs', names[plan.install]),
              admin: await launched.newAdminContext(),
              signedIn: false,
            };
            installs.set(plan.install, install);
          }
          console.log(`leg ${leg} on ${install.name}`);
          entered = true;
          const verdict = await deps.runLeg(
            {
              accountName: GATE_ACCOUNT_NAME,
              leg,
              version,
              runDir,
              env,
              cliEnv,
              install,
              launched,
              creds: session.creds,
              releaseNotesDir: notesDir,
              ...(cli ? { cli, recordFile } : {}),
              log: (line) => console.log(line),
            },
            { recordLeg: deps.recordLeg, ...deps.legDeps },
          );
          console.log(`${verdict.pass ? 'pass' : 'FAIL'}     leg ${leg}${verdict.pass ? '' : `: ${verdict.failures.join('; ')}`}`);
          if (!verdict.pass) stopped = leg;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`FAIL     leg ${leg}: ${message}`);
          if (!entered) await recordUnrun(leg, `fail: ${message}`);
          stopped = leg;
        }
        if (stopped) {
          passed = false;
          for (const later of group.slice(index + 1)) await recordUnrun(later, `skipped: needs ${stopped}`);
          return;
        }
      }
    };

    for (const group of groupByInstall(legs)) {
      await runGroup(group);
      if (all) await deps.teardownRun(runDir, session.teardownDeps);
    }
    return passed ? 0 : 1;
  } finally {
    await session.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2), process.env);
}

// Install, build, deploy, and migrate: the four long steps between a pushed scaffold and a live
// Worker. Every function here takes { dir, log }, runs its command through the exec seam, and
// maps a non-zero exit to the matching catalogue row so a caller never has to interpret a raw
// wrangler or npm failure itself.
//
// Per the T3 spike (https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-10-t3-cloudflare-spike.md): wrangler auto-provisions
// id-less D1 and R2 bindings by name and never writes ids back into wrangler.jsonc, on the first
// deploy or any later one, so this module parses no ids and writes none. Migrations resolve by
// binding name against the same id-less config, so applyMigrations takes no database-name
// fallback either.
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runWrangler, runNpm, accountEnv } from './exec.mjs';
import { cloudflareError, trailingStderr } from './catalogue.mjs';

/**
 * CSI-style ANSI escape sequences (color, cursor movement) the way wrangler emits them even when
 * stdout is a pipe (the T3 spike's section (e)). Narrower than a general-purpose ANSI stripper,
 * but it is exactly the shape wrangler's output uses, and this module has no dependency
 * budget for a stripping library.
 */
const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;]*[A-Za-z]/g;

/**
 * The pattern the T3 spike pinned for the deploy's workers.dev URL line, anchored to a whole
 * trimmed line rather than searched unanchored across the deploy's full stdout: an unanchored
 * `[^\s]+` is greedy, so a line carrying two URLs back to back with no whitespace between them
 * (a redirect target embedded in a query string, say) would match from the first `https://` all
 * the way to the LAST `.workers.dev`, splicing the two together into one string that is neither
 * URL. Anchoring to one line at a time means a line that is not a single, bare URL simply does
 * not match, rather than matching too much.
 */
const WORKERS_DEV_URL_LINE_PATTERN = /^https:\/\/\S+$/;

/**
 * The stderr text wrangler's `deploy` prints when the account has no workers.dev subdomain yet,
 * plus the API error code the spike found alongside it (workers-sdk#9045). Matching on either is
 * tighter than a loose `/subdomain/i`, which would also fire on ordinary deploy chatter.
 */
const SUBDOMAIN_UNREGISTERED_STDERR = 'workers.dev subdomain';
const SUBDOMAIN_UNREGISTERED_CODE = '10063';

/**
 * The sentence wrangler's `whoami` prints once signed in, whether by a prior `wrangler login` or
 * by an ambient `CLOUDFLARE_API_TOKEN` (wrangler honors the env var transparently, so this same
 * check covers both).
 */
const LOGGED_IN_PATTERN = /you are logged in/i;

/**
 * Install the site's dependencies, skipping when they are already on disk (the resume path,
 * and what makes a second run of the chapter cheap).
 * @param {object} args
 * @param {string} args.dir the scaffold root
 * @param {(line: string) => void} args.log receives progress lines
 * @returns {Promise<void>}
 */
export async function ensureInstalled({ dir, log }) {
  try {
    await access(join(dir, 'node_modules'));
    log('Dependencies are already installed; skipping npm install.');
    return;
  } catch {
    // node_modules does not exist yet; fall through to installing it.
  }

  log("Installing your site's dependencies; this can take a few minutes.");
  const result = await runNpm(['install'], { cwd: dir, log });
  if (result.code !== 0) {
    throw cloudflareError('install-failed', { dir, detail: trailingStderr(result.stderr) });
  }
}

/**
 * Build the site for deployment. The build's own output stays quiet on success (one line) and
 * prints in full only when the build fails, so a warning-heavy build does not bury the run.
 * @param {object} args
 * @param {string} args.dir the scaffold root
 * @param {(line: string) => void} args.log receives progress lines
 * @returns {Promise<void>}
 */
export async function buildSite({ dir, log }) {
  log('Building your site; this can take a few minutes.');
  const captured = [];
  const result = await runNpm(['run', 'build'], { cwd: dir, log: (line) => captured.push(line) });
  if (result.code !== 0) {
    for (const line of captured) log(line);
    throw cloudflareError('build-failed', { dir, detail: trailingStderr(result.stderr) });
  }
  log('Built your site.');
}

/**
 * Make sure wrangler has a signed-in Cloudflare account to deploy to, driving wrangler's
 * browser sign-in trip when it does not. The tool never opens a browser itself here; `wrangler
 * login` owns that trip end to end, including its local callback.
 * @param {object} args
 * @param {string} args.dir the scaffold root
 * @param {(line: string) => void} args.log receives progress lines
 * @returns {Promise<void>}
 */
export async function ensureLogin({ dir, log }) {
  const whoami = await runWrangler(['whoami'], { cwd: dir, log });
  if (whoami.code === 0 && LOGGED_IN_PATTERN.test(whoami.stdout)) {
    log('Already signed in to Cloudflare.');
    return;
  }

  log("Your browser will open Cloudflare's sign-in; approve wrangler's access");
  const login = await runWrangler(['login'], { cwd: dir, log });
  if (login.code !== 0) {
    throw cloudflareError('login-abandoned', { dir });
  }
}

/**
 * Find the deploy's workers.dev URL, one already-ANSI-stripped line at a time. Each candidate
 * line is both pattern-matched and parsed with `new URL()`, so a line that merely looks like a
 * bare URL but is not a valid one (or is `https` to some other host) is rejected rather than
 * silently accepted.
 * @param {string} strippedStdout the deploy's stdout, with ANSI escapes already removed
 * @returns {string | null} the workers.dev origin (no path, no query), or null when no line
 *  qualifies
 */
function findWorkersDevOrigin(strippedStdout) {
  for (const rawLine of strippedStdout.split('\n')) {
    const line = rawLine.trim();
    if (!WORKERS_DEV_URL_LINE_PATTERN.test(line)) continue;

    let parsed;
    try {
      parsed = new URL(line);
    } catch {
      continue;
    }
    if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.workers.dev')) {
      return parsed.origin;
    }
  }
  return null;
}

/**
 * Deploy the Worker and parse its workers.dev URL out of wrangler's output.
 * @param {object} args
 * @param {string} args.dir the scaffold root
 * @param {(line: string) => void} args.log receives progress lines
 * @param {string} [args.accountId] the Cloudflare account to deploy to, from `ensureAccountId`;
 *  when given, it is passed to wrangler as `CLOUDFLARE_ACCOUNT_ID` so a multi-account session
 *  never falls back to whatever account wrangler defaults to
 * @returns {Promise<{ url: string }>} the deployed site's workers.dev origin
 */
export async function deployWorker({ dir, log, accountId }) {
  log('Deploying to Cloudflare; this can take a few minutes.');
  const result = await runWrangler(['deploy'], { cwd: dir, log, ...accountEnv(accountId) });

  if (result.code !== 0) {
    if (
      result.stderr.includes(SUBDOMAIN_UNREGISTERED_STDERR) ||
      result.stderr.includes(SUBDOMAIN_UNREGISTERED_CODE)
    ) {
      throw cloudflareError('subdomain-unregistered', { dir });
    }
    throw cloudflareError('deploy-failed', { dir, detail: trailingStderr(result.stderr) });
  }

  const stripped = result.stdout.replace(ANSI_ESCAPE_PATTERN, '');
  const url = findWorkersDevOrigin(stripped);
  if (!url) {
    throw cloudflareError('deploy-failed', {
      dir,
      detail: 'wrangler exited successfully, but its deploy output carried no workers.dev URL.'
    });
  }
  return { url };
}

/**
 * The API codes wrangler 4.158 renders as `[code: N]` in a failed read's stderr (its
 * `renderError` in `wrangler-dist/cli.js`). 10007 is the Worker-not-found code wrangler's own
 * deploy treats as "no Worker yet" (`isWorkerNotFoundError` in deploy-helpers'
 * `worker-not-found-error.ts`, read by `confirm-latest-deployment-overwrite.ts` around the same
 * `/workers/scripts/<name>/deployments` request `deployments list` makes). 10006 is the
 * missing-bucket code wrangler's R2 provisioning checks after the same single-bucket read that
 * `r2 bucket info` makes (`getR2Bucket`).
 */
const WORKER_ABSENT_CODE = '[code: 10007]';
const BUCKET_ABSENT_CODE = '[code: 10006]';

/** The clock skew allowed between this machine and Cloudflare when comparing creation times. */
const SKEW_MS = 5 * 60 * 1000;

/**
 * How many deployments `deployments list` returns at most (its description: "the 10 most recent
 * deployments"). A reply this long may hide the Worker's first deployment, so its creation time
 * is unknown.
 */
const DEPLOYMENTS_LIST_LIMIT = 10;

/**
 * An earlier attempt's resume marker, as the chapter saves it just before its first deploy.
 * @typedef {object} DeployMarker
 * @property {string} name the base name that attempt deployed under
 * @property {string} accountId the account it deployed to
 * @property {string} at ISO time the attempt's deploy step began
 * @property {string} [endedAt] ISO time that deploy step stopped; absent while it runs or when
 *  the process died inside it
 */

/**
 * Whether a resource found under this site's name may be one the marker's own attempt created.
 * The marker must name this site and account, and the resource's creation time must fall
 * inside that attempt's deploy window, widened by the allowed skew. Anything else, including a
 * missing or unparseable time, an old string marker, or a marker with no stop time, is foreign.
 * @param {unknown} marker the record's saved `cloudflare.deployStartedAs`
 * @param {{ workerName: string, accountId?: string }} site this run's name and account
 * @param {unknown} createdAt the resource's creation time as wrangler reported it
 * @returns {boolean} true only when the resource is provably inside the marker's window
 */
function excusedByMarker(marker, { workerName, accountId }, createdAt) {
  if (!marker || typeof marker !== 'object') return false;
  if (marker.name !== workerName || !accountId || marker.accountId !== accountId) return false;
  const at = Date.parse(marker.at);
  const endedAt = Date.parse(marker.endedAt);
  const created = typeof createdAt === 'string' ? Date.parse(createdAt) : NaN;
  if (![at, endedAt, created].every(Number.isFinite)) return false;
  return created >= at - SKEW_MS && created <= endedAt + SKEW_MS;
}

/**
 * Parse a wrangler `--json` reply, slicing from the first `open` character the way
 * account.mjs's `parseWhoamiJson` slices from the first `{`, so a banner line ahead of the JSON
 * does not fail the read.
 * @param {string} stdout the reply
 * @param {'[' | '{'} open the character the JSON value starts with
 * @returns {unknown} the parsed value, or undefined when none parses
 */
function parseJsonReply(stdout, open) {
  const start = stdout.indexOf(open);
  if (start === -1) return undefined;
  try {
    return JSON.parse(stdout.slice(start));
  } catch {
    return undefined;
  }
}

/**
 * Read the names the deploy will use out of the scaffold's wrangler.jsonc. The file carries
 * whole-line `//` comments only (the template's shape), so dropping those lines leaves JSON.
 * @param {string} dir the scaffold root
 * @returns {Promise<{ name: unknown, databases: unknown[], buckets: unknown[] }>} the Worker
 *  name and every D1 `database_name` and R2 `bucket_name`
 */
async function readDeployNames(dir) {
  let parsed;
  try {
    const content = await readFile(join(dir, 'wrangler.jsonc'), 'utf8');
    parsed = JSON.parse(
      content
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n'),
    );
  } catch (cause) {
    throw cloudflareError('resource-names-check-failed', {
      dir,
      resource: `${join(dir, 'wrangler.jsonc')}`,
      detail: cause.message,
    });
  }
  const list = (value) => (Array.isArray(value) ? value : []);
  return {
    name: parsed?.name,
    databases: list(parsed?.d1_databases).map((entry) => entry?.database_name),
    buckets: list(parsed?.r2_buckets).map((entry) => entry?.bucket_name),
  };
}

/**
 * Run one single-resource read. Absent resolves to `null`; present resolves to the reply's
 * stdout. Any other failure throws, because reading a failure as "absent" would let setup deploy
 * over a resource already in use.
 * @param {string[]} args the wrangler read
 * @param {string} absentCode the `[code: N]` that means "no such resource"
 * @param {string} resource names the resource in the error, such as `the Worker alpine`
 * @param {{ dir: string, accountId?: string }} target the scaffold root and the chosen account
 * @returns {Promise<string | null>} the reply's stdout when the resource exists, else null
 */
async function readResource(args, absentCode, resource, { dir, accountId }) {
  const result = await runWrangler(args, { cwd: dir, log: () => {}, ...accountEnv(accountId) });
  if (result.code === 0) return result.stdout;
  if (result.stderr.includes(absentCode)) return null;
  throw cloudflareError('resource-names-check-failed', {
    dir,
    resource,
    detail: trailingStderr(result.stderr) || `wrangler exited with code ${result.code}.`,
  });
}

/**
 * The Worker's creation time from a `deployments list --json` reply: the earliest `created_on`.
 * The handler prints the raw deployments, sorted by `created_on`
 * (`versionsDeploymentsListHandler`, `src/versions/deployments/list.ts` in wrangler 4.158).
 * @param {string} stdout the reply
 * @returns {string | undefined} the earliest deployment's `created_on`, or undefined when the
 *  reply is unreadable, empty, or long enough to hide the first deployment
 */
function workerCreatedAt(stdout) {
  const deployments = parseJsonReply(stdout, '[');
  if (!Array.isArray(deployments) || deployments.length === 0) return undefined;
  if (deployments.length >= DEPLOYMENTS_LIST_LIMIT) return undefined;
  const times = deployments.map((deployment) => Date.parse(deployment?.created_on));
  if (!times.every(Number.isFinite)) return undefined;
  return new Date(Math.min(...times)).toISOString();
}

/**
 * Stop setup when the chosen account already has a Worker, D1 database, or R2 bucket of the
 * names this site deploys under, so a first deploy never replaces a live Worker or migrates and
 * seeds a database that belongs to another site.
 *
 * The names come from the scaffold's wrangler.jsonc, the file the deploy reads, and must match
 * the names derived from the site's saved name. Each read uses wrangler's signed-in session. The
 * Worker read is `deployments list --name <name> --json`, which exits 0 for any existing Worker.
 * The database read is `d1 list --json`, whose handler pages through every database and prints
 * the API's records unchanged, each with the D1 API's `created_at`. The bucket read is `r2
 * bucket info <name> --json`, whose handler prints the bucket's `creation_date` as `created`
 * (`r2BucketInfoCommand` in wrangler 4.158), rather than `r2 bucket list`, whose handler sends
 * one request with no pagination cursor and so cannot prove a bucket absent on an account with
 * many.
 *
 * A found resource is excused only when `marker` is this site's and account's resume marker and
 * the resource was created inside that attempt's deploy window.
 * @param {object} args
 * @param {string} args.dir the scaffold root
 * @param {(line: string) => void} args.log receives progress lines
 * @param {string} [args.accountId] the Cloudflare account to read, from `ensureAccountId`
 * @param {string} args.workerName the base name; the database is `<name>-auth` and the bucket
 *  `<name>-media`, as `nameWranglerResources` writes them
 * @param {unknown} [args.marker] the record's saved `cloudflare.deployStartedAs`, if any
 * @param {boolean} [args.workerOnly] read the Worker alone, for the re-read just before a deploy
 * @returns {Promise<void>} resolves when every name is free or excused; rejects with
 *  `resource-names-mismatch` when wrangler.jsonc names something else, `resource-names-taken`
 *  naming every clash, or `resource-names-check-failed` when a read fails
 */
export async function ensureNamesFree({ dir, log, accountId, workerName, marker, workerOnly = false }) {
  const databaseName = `${workerName}-auth`;
  const bucketName = `${workerName}-media`;

  const configured = await readDeployNames(dir);
  const mismatched = [];
  if (configured.name !== workerName) mismatched.push(`the Worker name ${String(configured.name)}`);
  for (const name of configured.databases) {
    if (name !== databaseName) mismatched.push(`the database name ${String(name)}`);
  }
  for (const name of configured.buckets) {
    if (name !== bucketName) mismatched.push(`the bucket name ${String(name)}`);
  }
  if (mismatched.length > 0) {
    throw cloudflareError('resource-names-mismatch', { dir, workerName, found: mismatched });
  }

  log(`Checking that your Cloudflare account has nothing named ${workerName} yet.`);
  const site = { workerName, accountId };
  const target = { dir, accountId };
  const taken = [];
  /**
   * Record one found resource as taken unless the marker excuses it.
   * @param {string} phrase the resource, as the error names it
   * @param {unknown} createdAt its creation time, as wrangler reported it
   */
  const noteFound = (phrase, createdAt) => {
    if (excusedByMarker(marker, site, createdAt)) {
      log(`Found ${phrase} from this site's earlier deploy; continuing.`);
      return;
    }
    taken.push(phrase);
  };

  const worker = await readResource(
    ['deployments', 'list', '--name', workerName, '--json'],
    WORKER_ABSENT_CODE,
    `the Worker ${workerName}`,
    target,
  );
  if (worker !== null) noteFound(`a Worker named ${workerName}`, workerCreatedAt(worker));

  if (!workerOnly) {
    const list = await runWrangler(['d1', 'list', '--json'], {
      cwd: dir,
      log: () => {},
      ...accountEnv(accountId),
    });
    const databases = list.code === 0 ? parseJsonReply(list.stdout, '[') : undefined;
    if (!Array.isArray(databases)) {
      throw cloudflareError('resource-names-check-failed', {
        dir,
        resource: 'the list of D1 databases',
        detail:
          list.code === 0
            ? 'wrangler d1 list --json printed output that is not a JSON list.'
            : trailingStderr(list.stderr) || `wrangler exited with code ${list.code}.`,
      });
    }
    for (const name of new Set([databaseName, ...configured.databases])) {
      const database = databases.find((entry) => entry?.name === name);
      if (database) noteFound(`a database named ${name}`, database.created_at);
    }

    for (const name of new Set([bucketName, ...configured.buckets])) {
      const bucket = await readResource(
        ['r2', 'bucket', 'info', name, '--json'],
        BUCKET_ABSENT_CODE,
        `the bucket ${name}`,
        target,
      );
      if (bucket !== null) {
        const info = parseJsonReply(bucket, '{');
        noteFound(`a storage bucket named ${name}`, info?.created);
      }
    }
  }

  if (taken.length > 0) {
    throw cloudflareError('resource-names-taken', { dir, taken });
  }
}

/**
 * The bindings, in the order migrations run, matching wrangler.jsonc's binding names. A site
 * scaffolded with a second D1 binding and resumed here gets that database provisioned but never
 * migrated; the window is accepted rather than derived from the site's wrangler.jsonc.
 */
const MIGRATION_DATABASES = ['AUTH_DB'];

/**
 * Apply pending migrations to the D1 database, by binding name. A spike confirmed
 * `wrangler d1 migrations apply <binding> --remote` resolves the binding against an id-less
 * config, so this takes no database-name fallback.
 * @param {object} args
 * @param {string} args.dir the scaffold root
 * @param {(line: string) => void} args.log receives progress lines
 * @param {string} [args.accountId] the Cloudflare account to migrate against, from
 *  `ensureAccountId`; when given, it is passed to wrangler as `CLOUDFLARE_ACCOUNT_ID`
 * @returns {Promise<void>}
 */
export async function applyMigrations({ dir, log, accountId }) {
  for (const database of MIGRATION_DATABASES) {
    log(`Applying database migrations to ${database}.`);
    const result = await runWrangler(['d1', 'migrations', 'apply', database, '--remote'], {
      cwd: dir,
      log,
      ...accountEnv(accountId),
    });
    if (result.code !== 0) {
      throw cloudflareError('migrations-failed', {
        dir,
        database,
        detail: trailingStderr(result.stderr)
      });
    }
  }
}

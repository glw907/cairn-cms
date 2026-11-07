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
import { access } from 'node:fs/promises';
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

/**
 * Run one name read, returning true when the resource exists and false when wrangler reports the
 * absent code. Any other failure throws, because reading a failure as "absent" would let setup
 * deploy over a resource already in use.
 * @param {string[]} args the wrangler read
 * @param {string} absentCode the `[code: N]` that means "no such resource"
 * @param {string} resource names the resource in the error, such as `the Worker alpine`
 * @param {{ dir: string, accountId?: string }} target the scaffold root and the chosen account
 * @returns {Promise<boolean>} whether the resource exists
 */
async function resourceExists(args, absentCode, resource, { dir, accountId }) {
  const result = await runWrangler(args, { cwd: dir, log: () => {}, ...accountEnv(accountId) });
  if (result.code === 0) return true;
  if (result.stderr.includes(absentCode)) return false;
  throw cloudflareError('resource-names-check-failed', {
    dir,
    resource,
    detail: trailingStderr(result.stderr) || `wrangler exited with code ${result.code}.`,
  });
}

/**
 * Stop setup when the chosen account already has a Worker, D1 database, or R2 bucket of the
 * names this site deploys under, so a first deploy never replaces a live Worker or migrates and
 * seeds a database that belongs to another site.
 *
 * Each read uses wrangler's signed-in session. The Worker read is `deployments list --name
 * <name> --json`, which exits 0 for any existing Worker. The database read is `d1 list --json`,
 * whose handler pages through every database and prints the array as JSON. The bucket read is
 * `r2 bucket info <name> --json` rather than `r2 bucket list`, whose handler sends one request
 * with no pagination cursor and so cannot prove a bucket absent on an account with many.
 * @param {object} args
 * @param {string} args.dir the scaffold root
 * @param {(line: string) => void} args.log receives progress lines
 * @param {string} [args.accountId] the Cloudflare account to read, from `ensureAccountId`
 * @param {string} args.workerName the base name; the database is `<name>-auth` and the bucket
 *  `<name>-media`, as `nameWranglerResources` writes them
 * @returns {Promise<void>} resolves when all three names are free; rejects with
 *  `resource-names-taken` naming every clash, or `resource-names-check-failed` when a read fails
 */
export async function ensureNamesFree({ dir, log, accountId, workerName }) {
  const databaseName = `${workerName}-auth`;
  const bucketName = `${workerName}-media`;
  log(`Checking that your Cloudflare account has nothing named ${workerName} yet.`);
  const target = { dir, accountId };
  const taken = [];

  const workerExists = await resourceExists(
    ['deployments', 'list', '--name', workerName, '--json'],
    WORKER_ABSENT_CODE,
    `the Worker ${workerName}`,
    target,
  );
  if (workerExists) taken.push(`a Worker named ${workerName}`);

  const list = await runWrangler(['d1', 'list', '--json'], {
    cwd: dir,
    log: () => {},
    ...accountEnv(accountId),
  });
  let databases;
  try {
    databases = list.code === 0 ? JSON.parse(list.stdout) : null;
  } catch {
    databases = null;
  }
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
  if (databases.some((database) => database?.name === databaseName)) {
    taken.push(`a database named ${databaseName}`);
  }

  const bucketExists = await resourceExists(
    ['r2', 'bucket', 'info', bucketName, '--json'],
    BUCKET_ABSENT_CODE,
    `the bucket ${bucketName}`,
    target,
  );
  if (bucketExists) taken.push(`a storage bucket named ${bucketName}`);

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

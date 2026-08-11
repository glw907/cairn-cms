// Install, build, deploy, and migrate: the four long steps between a pushed scaffold and a live
// Worker. Every function here takes { dir, log }, runs its command through the exec seam, and
// maps a non-zero exit to the matching catalogue row so a caller never has to interpret a raw
// wrangler or npm failure itself.
//
// Per the T3 spike (docs/internal/2026-08-10-t3-cloudflare-spike.md): wrangler auto-provisions
// id-less D1 and R2 bindings by name and never writes ids back into wrangler.jsonc, on the first
// deploy or any later one, so this module parses no ids and writes none. Migrations resolve by
// binding name against the same id-less config, so applyMigrations takes no database-name
// fallback either.
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { runWrangler, runNpm } from './exec.mjs';
import { cloudflareError, trailingStderr } from './catalogue.mjs';

/**
 * CSI-style ANSI escape sequences (color, cursor movement) the way wrangler emits them even when
 * stdout is a pipe (the T3 spike's section (e)). Narrower than a general-purpose ANSI stripper,
 * but it is exactly the shape wrangler's own output uses, and this module has no dependency
 * budget for a stripping library.
 */
const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;]*[A-Za-z]/g;

/** The pattern the T3 spike pinned for the deploy's workers.dev URL line. */
const WORKERS_DEV_URL_PATTERN = /https:\/\/[^\s]+\.workers\.dev/;

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
 * Install the site's own dependencies, skipping when they are already on disk (the resume path,
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
 * Build the site for deployment.
 * @param {object} args
 * @param {string} args.dir the scaffold root
 * @param {(line: string) => void} args.log receives progress lines
 * @returns {Promise<void>}
 */
export async function buildSite({ dir, log }) {
  log('Building your site; this can take a few minutes.');
  const result = await runNpm(['run', 'build'], { cwd: dir, log });
  if (result.code !== 0) {
    throw cloudflareError('build-failed', { dir, detail: trailingStderr(result.stderr) });
  }
}

/**
 * Make sure wrangler has a signed-in Cloudflare account to deploy to, driving wrangler's own
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
 * Deploy the Worker and parse its workers.dev URL out of wrangler's output.
 * @param {object} args
 * @param {string} args.dir the scaffold root
 * @param {(line: string) => void} args.log receives progress lines
 * @returns {Promise<{ url: string }>} the deployed site's workers.dev origin
 */
export async function deployWorker({ dir, log }) {
  log('Deploying to Cloudflare; this can take a few minutes.');
  const result = await runWrangler(['deploy'], { cwd: dir, log });

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
  const match = stripped.match(WORKERS_DEV_URL_PATTERN);
  if (!match) {
    throw cloudflareError('deploy-failed', {
      dir,
      detail: 'wrangler exited successfully, but its deploy output carried no workers.dev URL.'
    });
  }
  return { url: match[0] };
}

/** The bindings, in the order migrations run, matching wrangler.jsonc's binding names. */
const MIGRATION_DATABASES = ['AUTH_DB', 'APP_DB'];

/**
 * Apply pending migrations to both D1 databases, by binding name. The T3 spike confirmed
 * `wrangler d1 migrations apply <binding> --remote` resolves the binding against an id-less
 * config, so this takes no database-name fallback.
 * @param {object} args
 * @param {string} args.dir the scaffold root
 * @param {(line: string) => void} args.log receives progress lines
 * @returns {Promise<void>}
 */
export async function applyMigrations({ dir, log }) {
  for (const database of MIGRATION_DATABASES) {
    log(`Applying database migrations to ${database}.`);
    const result = await runWrangler(['d1', 'migrations', 'apply', database, '--remote'], {
      cwd: dir,
      log
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

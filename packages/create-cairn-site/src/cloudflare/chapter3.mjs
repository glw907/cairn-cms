// Chapter 3's spine: the guided path from chapter 2's finish (or, later, a resumed `--connect`
// entry from any allowlisted state) to a repository connected to Workers Builds, with a trigger
// bound to the site's own Worker, its deploy config reconciled into the repository, and the first
// Builds deploy watched to success. Modelled directly on chapter2.mjs: the same runStep/runActions
// idiom (a title always prints, a detail prints only under --dry-run, execute never runs under
// --dry-run), one state writer, pure step logic over an in-memory record.
//
// TOKEN LIFECYCLE: chapter 2 already deletes its own saved `cloudflare.apiToken` at its own
// terminal steps (email-live, paid-plan-declined), so this chapter always starts with none saved
// and always asks for a fresh one, per the design's "one fresh token paste" framing. Once this
// chapter's own token hop saves one, its presence is what lets a re-run (after a park) skip
// re-asking admission: `record.cloudflare.apiToken` can only be set by THIS chapter, since chapter
// 2 has already cleared its own copy by the time chapter 3 ever runs, so seeing one saved is an
// unambiguous "admission and the token hop already ran" signal that survives a connect or trigger
// park (neither of which advances `step`, so `step` alone cannot carry this signal the way it
// carries "connect and trigger both finished", CHAPTER3_RESUMABLE_STEPS below). The token is
// deleted only at a terminal step (builds-live, builds-connect-declined); a park keeps it, since a
// later re-run needs the same credential.
//
// THE RECONCILE DIFF READ IS UNAUTHENTICATED, DELIBERATELY (a flagged gap, not a fixed one). The
// diff peek below (peekConfigDiffers) calls GitHub with no token, matching the same pattern the
// connect hop's own `GET /repos/{owner}/{repo}` already takes: against the fake, which enforces no
// authorization on a read, this genuinely detects an identical repo and the OAuth trip is skipped
// entirely, satisfying the plan's own "an identical repo skips the OAuth trip entirely" rule.
// Against the real API, a private repo (every repo this tool creates) answers an unauthenticated
// read with 404, which this treats as "missing", the same as reconcileRepo's own missing-file
// rule, so a live run pays one confirmatory OAuth trip on its very first genuinely-identical
// reconcile; reconcileRepo's own authenticated re-check then resolves it with zero writes. This
// mirrors the connect hop's own unproven-but-accepted shape (see the plan's own note on that gap)
// and is called out here rather than silently patched, since fixing it would mean touching
// reconcile.mjs, outside this task's file list.
import { confirm as clackConfirm, select as clackSelect, isCancel } from '@clack/prompts';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { exitOnCancel, promptSecret } from '../prompts.mjs';
import { defineAction, runActions } from '../runner.mjs';
import { updateSite } from '../state.mjs';
import { ensureAccountId } from './account.mjs';
import { ensureApiToken, CHAPTER3_PERMISSION_KEYS } from './prefill.mjs';
import { makeApi } from './api.mjs';
import { cloudflareError, trailingStderr } from './catalogue.mjs';
import { deleteApiToken } from './chapter2.mjs';
import { confirmHostname } from './hostname.mjs';
import { githubRequest } from '../github/api.mjs';
import { openBrowser as defaultOpenBrowser } from '../github/open.mjs';
import { reauthorize } from '../github/oauth.mjs';
import { reconcileRepo } from '../github/reconcile.mjs';

/**
 * The step names this chapter's own success terminal and its declined terminal write, exported
 * for `bin.mjs`'s routing (aliased on import there, since it already imports chapter 2's own
 * `TERMINAL_STEPS`).
 * @type {string[]}
 */
export const CHAPTER3_TERMINAL_STEPS = ['builds-live', 'builds-connect-declined'];

/**
 * The step names a resumed record can still finish this chapter from, past the connect-and-trigger
 * hop: `builds-connected` and `config-reconciled`. Exported for the same `bin.mjs` routing.
 * Membership in this list, checked by plain inclusion rather than a numeric index, is also what
 * this module's own internal resumption is built on: an index-based check like chapter2's own
 * `stepIndex` defaults any unrecognized string to "as if already past `live`", which would wrongly
 * admit a record still mid-chapter-1; a plain membership test against this chapter's own explicit
 * step names carries no such default.
 * @type {string[]}
 */
export const CHAPTER3_RESUMABLE_STEPS = ['builds-connected', 'config-reconciled'];

/** The trigger name every created trigger carries, matching the shape the spike captured live. */
const BUILDS_TRIGGER_NAME = 'Deploy default branch';

/** The build command every created trigger carries: the scaffold's own `npm run build` script. */
const BUILD_COMMAND = 'npm run build';

/** The deploy command every created trigger carries: wrangler's own default deploy invocation. */
const DEPLOY_COMMAND = 'npx wrangler deploy';

/** The name registered against the admin's pasted token when it becomes the build token. */
const BUILD_TOKEN_NAME = 'cairn create-cairn-site build token';

/** Matches the top-level `"name": "..."` line in a scaffold's wrangler.jsonc. */
const WORKER_NAME_PATTERN = /"name":\s*"([^"]+)"/;

/**
 * The two files the reconcile hop owns, duplicated from reconcile.mjs's own private
 * `RECONCILED_FILES` rather than imported: that module exports no such list, and this task's own
 * file list does not include it. A third tool-owned file added there without a matching update
 * here would silently go unnoticed by the diff peek below; there is no structural guard against
 * that drift today.
 */
const RECONCILED_FILE_PATHS = ['wrangler.jsonc', 'src/theme/cairn.config.ts'];

/** The generic, already-verified Cloudflare dashboard entry point (Global Constraints' own
 * fallback for an unproven deep link): no build-specific deep-link shape was captured by the
 * spike, so this is used rather than a guessed URL. */
const BUILDS_DASHBOARD_URL = 'https://dash.cloudflare.com/?to=/:account/workers-and-pages';

/** How often, in poll attempts, the build watch prints a heartbeat. Mirrors install.mjs's own
 * POLL_HEARTBEAT_EVERY idiom. */
const BUILD_POLL_HEARTBEAT_EVERY = 10;

const BUILD_POLL_HEARTBEAT_MESSAGE =
  'Still watching the build; checking every few seconds. Leave this running.';

/** The default interval between build polls, and the default budget (Cloudflare's own build
 * timeout is 20 minutes, per the catalogue's build-running row; this stays comfortably under it). */
const DEFAULT_BUILD_POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_POLL_ATTEMPTS = 180;

/**
 * Sleep for the given duration; the build watch's default pacing, overridden by a test's own
 * `sleepFn`.
 * @param {number} ms milliseconds to wait; a non-positive value resolves on the next tick
 * @returns {Promise<void>} resolves after `ms` milliseconds
 */
function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}

/**
 * Read the Worker's name straight from the local wrangler.jsonc, rather than trusting a saved
 * `cloudflare.workerName` field: an admin who renamed the Worker by hand between deploys has
 * already moved the name Cloudflare actually deployed under, and this chapter's own trigger and
 * watch both need to bind the tag that name resolves to right now, not whatever chapter 1 last
 * wrote to state.
 * @param {string} dir the scaffold root
 * @returns {Promise<string>} the worker name
 */
async function readWorkerName(dir) {
  const content = await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8');
  const match = WORKER_NAME_PATTERN.exec(content);
  if (!match) {
    throw new Error(
      `chapter3: expected to find a "name" entry in wrangler.jsonc under ${dir}, but it is missing`,
    );
  }
  return match[1];
}

/**
 * Run one hop as a single-action batch through runActions, mirroring chapter2.mjs's own
 * `runStep`: the hop's title always prints, its detail prints only under --dry-run, and `execute`
 * never runs under --dry-run.
 * @param {{ dryRun: boolean, log: (line: string) => void }} frame the run's dry-run frame and logger
 * @param {string} title the hop's title, always printed
 * @param {string} detail the hop's detail, printed only under --dry-run
 * @param {() => Promise<void>} execute the hop's real work; skipped under --dry-run
 * @returns {Promise<void>}
 */
async function runStep(frame, title, detail, execute) {
  await runActions([defineAction({ title, detail, execute })], frame);
}

/**
 * A best-effort, unauthenticated check for whether the repository's committed config differs from
 * the local scaffold, used to decide whether the reconcile hop needs the OAuth trip at all (see
 * this module's own header comment for why an unauthenticated read is the deliberate, flagged
 * choice here). Mirrors reconcile.mjs's own read-and-diff logic without a token and without ever
 * writing.
 * @param {{ owner: string, repo: string, defaultBranch: string }} target the repository to read
 * @param {string} dir the scaffold root, holding the local copies to compare against
 * @returns {Promise<boolean>} true when reconcileRepo would need to commit
 */
async function peekConfigDiffers({ owner, repo, defaultBranch }, dir) {
  const refResponse = await githubRequest('GET', `/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`);
  const headSha = refResponse.json?.object?.sha;
  if (!headSha) return true;

  const commitResponse = await githubRequest('GET', `/repos/${owner}/${repo}/git/commits/${headSha}`);
  const headTreeSha = commitResponse.json?.tree?.sha ?? null;
  if (!headTreeSha) return true;

  const treeResponse = await githubRequest('GET', `/repos/${owner}/${repo}/git/trees/${headTreeSha}?recursive=1`);
  const tree = Array.isArray(treeResponse.json?.tree) ? treeResponse.json.tree : [];

  for (const relativePath of RECONCILED_FILE_PATHS) {
    const local = await readFile(path.join(dir, relativePath), 'utf8');
    const entry = tree.find((candidate) => candidate.type === 'blob' && candidate.path === relativePath);
    if (!entry) return true;
    const blobResponse = await githubRequest('GET', `/repos/${owner}/${repo}/git/blobs/${entry.sha}`);
    const remote = Buffer.from(blobResponse.json?.content ?? '', blobResponse.json?.encoding ?? 'base64').toString('utf8');
    if (remote !== local) return true;
  }
  return false;
}

/**
 * @typedef {object} ReconcileAttempt
 * @property {boolean} [changed] whether reconcileRepo committed (present when no park occurred)
 * @property {string} [commitSha] the commit's sha, present only when `changed` is true
 * @property {Error & { catalogue: object }} [parked] set instead of `changed`/`commitSha` when
 *  `--yes` met a real diff and the OAuth trip was parked rather than attempted
 */

/**
 * Run the reconcile diff-then-commit hop: peek unauthenticated, skip the OAuth trip entirely when
 * nothing differs, park under `--yes` when it does, and otherwise run `reauthorize` and the real
 * `reconcileRepo`. Shared by the main flow (always called once connect and trigger have settled)
 * and the `builds-live` re-entry (ruling 4: not a no-op).
 * @param {{ record: object, dir: string, args: { yes: boolean }, log: (line: string) => void,
 *  openBrowser: (url: string, log: (line: string) => void) => Promise<void> }} input
 * @returns {Promise<ReconcileAttempt>} the attempt's outcome
 */
async function performReconcile({ record, dir, args, log, openBrowser }) {
  const target = record?.github?.repo ?? {};
  const differs = await peekConfigDiffers(target, dir);
  if (!differs) return { changed: false };

  if (args.yes) {
    const parked = cloudflareError('builds-reconcile-parked', { dir });
    log(parked.message);
    return { parked };
  }

  const userToken = await reauthorize({
    clientId: record.github.clientId,
    clientSecret: record.github.clientSecret,
    dir,
    openBrowser,
    log,
  });
  const result = await reconcileRepo({ record: record.github, dir, userToken });
  return { changed: result.changed, commitSha: result.commitSha };
}

/**
 * Poll a build until it reaches `stopped`, printing a heartbeat every BUILD_POLL_HEARTBEAT_EVERY
 * attempts, or until `maxPollAttempts` elapses first.
 * @param {{ api: object, buildUuid: string, log: (line: string) => void,
 *  sleepFn: (ms: number) => Promise<void>, pollIntervalMs: number, maxPollAttempts: number }} input
 * @returns {Promise<{ build: object, budgetExceeded: boolean }>} the last-read build record, and
 *  whether the poll gave up before it reached `stopped`
 */
async function pollBuildToStop({ api, buildUuid, log, sleepFn, pollIntervalMs, maxPollAttempts }) {
  let build = await api.getBuild(buildUuid);
  let attempt = 0;
  while (build.status !== 'stopped') {
    attempt += 1;
    if (attempt > maxPollAttempts) return { build, budgetExceeded: true };
    if (attempt % BUILD_POLL_HEARTBEAT_EVERY === 0) log(BUILD_POLL_HEARTBEAT_MESSAGE);
    await sleepFn(pollIntervalMs);
    build = await api.getBuild(buildUuid);
  }
  return { build, budgetExceeded: false };
}

/**
 * Reduce a build's logs to the trailing lines a failed-build row carries, reusing catalogue.mjs's
 * own `trailingStderr` trim rather than reinventing it: the shape (an array of `[epochMillis,
 * text]` pairs) is different, but the "last few non-empty lines" rule is the same one every other
 * failing-child row in this tool already follows.
 * @param {{ lines?: Array<[number, string]> }} logs the build's logs, as `getBuildLogs` returns them
 * @returns {string} the trailing lines, joined back with newlines
 */
function buildLogTail(logs) {
  const lines = Array.isArray(logs?.lines) ? logs.lines.map(([, text]) => text) : [];
  return trailingStderr(lines.join('\n'));
}

/**
 * The chapter's closing copy: what changed (push-to-deploy on the default branch) and where to go
 * from here (the site's own admin), claiming only what this run itself observed. Does not claim
 * the laptop is now disposable, since an engine update still runs through this CLI.
 * @param {{ defaultBranch: string | undefined, domain: string }} input
 * @returns {string} the completion message
 */
function completionMessage({ defaultBranch, domain }) {
  return (
    `Every commit to ${defaultBranch ?? 'your default branch'} now builds and deploys itself ` +
    `through Workers Builds: the first deploy just succeeded, and https://${domain}/ answers ` +
    `with it. From here, sign in at https://${domain}/admin to write and publish. This CLI is ` +
    'not done, though: a cairn-cms engine update still runs through it, on your machine, so ' +
    'keep it around for those.'
  );
}

/**
 * Find (or, on a genuinely first attempt, kick) the build the reconcile hop should have
 * triggered, poll it to a terminal status, and on success re-confirm the site's hostname and
 * record `builds-live`. A push-triggered commit is found by matching its commit sha in the
 * worker's build list; an empty diff falls back to an already-tracked `buildsLastBuildUuid`
 * (resuming a park rather than kicking a second build), then, only once `chapter3Reached` is
 * false (a genuinely first attempt), a manual kick. Once `chapter3Reached` is true, a still-missing
 * build is searched for again (the newest build on this worker) rather than ever kicking a second
 * one, since a `chapter3Reached` record already committed or kicked exactly once and the plan's
 * own invariant is one build, not two.
 * @param {object} input
 * @returns {Promise<{ outcome: string, message?: string }>} a wait-kind park (returned, never
 *  thrown) or the `builds-live` success outcome; an act-kind failure throws a catalogued error
 */
async function watchAndComplete({
  siteId,
  record,
  dir,
  log,
  api,
  sleepFn,
  fetchImpl,
  pollIntervalMs,
  maxPollAttempts,
  triggerUuid,
  defaultBranch,
  chapter3Reached,
  lastBuildUuid,
  lastBuildOutcome,
  reconcileResult,
}) {
  const workerName = await readWorkerName(dir);
  const tag = await api.findWorkerTag(workerName);
  if (!tag) {
    throw new Error(
      `chapter3: no Cloudflare Worker named "${workerName}" was found on this account, so ` +
        'Workers Builds has nothing to watch.\n' +
        `Next: run npx create-cairn-site --dir ${dir} to finish deploying first, then re-run ` +
        `npx create-cairn-site --dir ${dir} --connect.`,
    );
  }

  let buildUuid = lastBuildUuid;
  if (reconcileResult?.changed) {
    const builds = await api.listBuildsForWorker(tag);
    buildUuid = builds.find((build) => build.build_trigger_metadata?.commit_hash === reconcileResult.commitSha)?.build_uuid;
  } else if (!buildUuid) {
    if (lastBuildOutcome === 'success') {
      return { outcome: 'builds-live', message: 'Nothing to reconcile: your site is already live.' };
    }
    if (chapter3Reached) {
      const builds = await api.listBuildsForWorker(tag);
      buildUuid = builds[0]?.build_uuid;
    } else {
      const kicked = await api.kickBuild(triggerUuid, defaultBranch);
      buildUuid = kicked.build_uuid;
      await updateSite(siteId, { cloudflare: { buildsLastBuildUuid: buildUuid } });
    }
  }

  if (!buildUuid) {
    const err = cloudflareError('build-not-started', { dir });
    log(err.message);
    return { outcome: 'build-not-started', message: err.message };
  }

  const { build, budgetExceeded } = await pollBuildToStop({ api, buildUuid, log, sleepFn, pollIntervalMs, maxPollAttempts });
  if (budgetExceeded) {
    await updateSite(siteId, { cloudflare: { buildsLastBuildUuid: buildUuid } });
    const err = cloudflareError('build-running', { dir });
    log(err.message);
    return { outcome: 'build-running', message: err.message };
  }

  await updateSite(siteId, { cloudflare: { buildsLastBuildUuid: buildUuid, buildsLastBuildOutcome: build.build_outcome } });

  if (build.build_outcome === 'fail' || build.build_outcome === 'terminated') {
    const logs = await api.getBuildLogs(buildUuid);
    throw cloudflareError('builds-deploy-failed', { dir, detail: buildLogTail(logs), buildUrl: BUILDS_DASHBOARD_URL });
  }
  if (build.build_outcome === 'skipped' || build.build_outcome === 'cancelled') {
    throw cloudflareError('builds-not-runnable', { dir, outcome: build.build_outcome, buildUrl: BUILDS_DASHBOARD_URL });
  }

  const currentOrigin = record?.cloudflare?.domain ?? new URL(record?.cloudflare?.url).host;
  const hostOutcome = await confirmHostname(currentOrigin, fetchImpl);
  if (hostOutcome === 'hostname-not-serving') {
    throw cloudflareError('hostname-not-serving', { dir, domain: currentOrigin });
  }
  if (hostOutcome !== 'live') {
    const err = cloudflareError(hostOutcome, { dir, domain: currentOrigin });
    log(err.message);
    return { outcome: hostOutcome, message: err.message };
  }

  await updateSite(siteId, { step: 'builds-live' });
  await deleteApiToken(siteId);
  const message = completionMessage({ defaultBranch, domain: currentOrigin });
  log(message);
  return { outcome: 'builds-live', message };
}

/**
 * The admission copy: what this chapter needs (the App authorization, a fresh token paste, one
 * later sign-in click) and what it costs (nothing new). The free-tier figures carry the date they
 * were verified, per the standing cost-copy rule every other admission in this tool follows.
 */
const ADMISSION_DETAIL =
  "Connects this repository to Cloudflare Workers Builds, so every commit to your default " +
  'branch deploys itself, no laptop required. This needs three things: a one-time authorization ' +
  'of Cloudflare\'s "Workers and Pages" GitHub App on your account (if you have not already done ' +
  'this), a fresh Cloudflare API token pasted the same way chapter 2 asked for one, and one ' +
  'sign-in click later in this chapter, when it commits its own config changes back to your ' +
  'repository. This costs nothing: Workers Builds\' free tier includes 3,000 build minutes a ' +
  'month and one build running at a time, as of 2026-08-12 ' +
  '(https://developers.cloudflare.com/workers/platform/pricing/). Your site keeps working ' +
  'exactly as it does now the whole time.';

const RECONCILE_DETAIL =
  "Compares your site's local wrangler.jsonc and cairn.config.ts against what your repository " +
  'has committed, and commits anything that differs. This is a sign-in click, since the commit ' +
  'this writes is attributed to you.';

const WATCH_DETAIL =
  'Finds (or starts) the build your reconcile just triggered, watches it to completion, and ' +
  'confirms your site answers there once it succeeds.';

/**
 * @typedef {object} RunChapter3Input
 * @property {string} siteId the site's state-store id; the only id this module ever writes under
 * @property {object | null} record the site's current in-memory state record, already loaded by
 *  the caller; `null` under --dry-run, chapter 1 and chapter 2's own `dryRun ? null` precedent
 * @property {string} dir the scaffolded directory, used in printed copy and read for the local
 *  Worker name
 * @property {{ yes: boolean }} args the parsed CLI flags this chapter reads: `yes` for an
 *  unattended run
 * @property {(line: string) => void} log receives one printed line per call
 * @property {boolean} dryRun when true, every hop's title and detail print and nothing executes
 * @property {(url: string, log: (line: string) => void) => Promise<void>} [openBrowser] opens the
 *  admin's browser to the create-token page; defaults to open.mjs's own opener
 * @property {typeof clackConfirm} [confirm] the yes/no prompt; a test seam, defaulting to
 *  @clack/prompts' own
 * @property {typeof clackSelect} [select] the account picker prompt `ensureAccountId` uses; the
 *  same kind of test seam as `confirm`
 * @property {(message: string) => Promise<string>} [promptSecretFn] the token paste prompt,
 *  forwarded to `ensureApiToken`; a test seam defaulting to prompts.mjs's own `promptSecret`
 * @property {typeof makeApi} [makeApiFn] builds the Cloudflare API client; a test seam defaulting
 *  to api.mjs's own `makeApi`
 * @property {Record<string, string | undefined>} [env] the environment `ensureApiToken` reads
 *  `CAIRN_CF_API_TOKEN` from under `yes`; defaults to `process.env`, injected in tests
 * @property {string[]} [argv] the argument vector `ensureApiToken` scans for a mistakenly-passed
 *  token; defaults to `process.argv.slice(2)`, injected in tests
 * @property {(ms: number) => Promise<void>} [sleepFn] the build watch's pacing; a test seam
 *  defaulting to a real timer-based sleep
 * @property {typeof fetch} [fetchImpl] the fetch implementation the live-hostname confirm probes
 *  with; defaults to the global `fetch`, overridden in tests
 * @property {number} [pollIntervalMs] the build watch's poll interval; defaults to five seconds
 * @property {number} [maxPollAttempts] the build watch's poll budget, in attempts; defaults to 180
 *  (fifteen minutes at the default interval, comfortably under Cloudflare's own 20-minute timeout)
 */

/**
 * Run chapter 3: admission, the Cloudflare token, connecting the repository to Workers Builds,
 * binding a trigger to the site's own Worker, reconciling its deploy config into the repository,
 * and watching the first Builds deploy to success. Re-entry reads the step already reached on
 * `record`: `builds-connect-declined` short-circuits at the top (the token is cleared again, in
 * case an earlier run somehow left one behind, and the decline is reported back unchanged);
 * `builds-live` is not a no-op (ruling 4) and re-runs only the reconcile diff, reporting "nothing
 * to reconcile" when it is genuinely empty and, when it is not, re-running the token prefill (the
 * saved token was already deleted at that terminal step) to watch the build the fresh commit
 * triggers. A saved `cloudflare.apiToken` or a step already in CHAPTER3_RESUMABLE_STEPS means
 * admission has already run and is not re-asked; a step already in CHAPTER3_RESUMABLE_STEPS
 * additionally skips connect and trigger, both of which are otherwise safe to repeat.
 *
 * A connect-time authorization refusal, a reconcile OAuth denial, and every wait-kind park (an
 * authorization park, `builds-reconcile-parked`, `build-not-started`, `build-running`, a hostname
 * still propagating) are returned, never thrown, and `step` is left untouched wherever no hop
 * completed, so a plain re-run re-attempts from the same point. Only an act-kind failure (a
 * missing repository, a missing Worker, a failed or unrunnable build, a hostname that resolves to
 * something else) throws.
 * @param {RunChapter3Input} input the chapter's inputs
 * @returns {Promise<{ outcome: string, message?: string }>} the outcome reached; see the module's
 *  own catalogue rows and CHAPTER3_TERMINAL_STEPS/CHAPTER3_RESUMABLE_STEPS for the full set
 */
export async function runChapter3({
  siteId,
  record,
  dir,
  args,
  log,
  dryRun,
  openBrowser = defaultOpenBrowser,
  confirm = clackConfirm,
  select = clackSelect,
  promptSecretFn = promptSecret,
  makeApiFn = makeApi,
  env = process.env,
  argv = process.argv.slice(2),
  sleepFn = defaultSleep,
  fetchImpl = fetch,
  pollIntervalMs = DEFAULT_BUILD_POLL_INTERVAL_MS,
  maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
}) {
  const frame = { dryRun, log };

  if (!dryRun && record?.step === 'builds-connect-declined') {
    await deleteApiToken(siteId);
    return { outcome: 'builds-connect-declined' };
  }

  // --- builds-live re-entry: the site is already fully connected and live; only the reconcile
  // diff might still need to run (ruling 4, the stale-origin remedy). Never a no-op.
  if (!dryRun && record?.step === 'builds-live') {
    let reconcileResult;
    await runStep(frame, 'Reconcile your deploy config', RECONCILE_DETAIL, async () => {
      reconcileResult = await performReconcile({ record, dir, args, log, openBrowser });
    });
    if (reconcileResult.parked) {
      return { outcome: reconcileResult.parked.catalogue.code, message: reconcileResult.parked.message };
    }
    if (!reconcileResult.changed) {
      const message = 'Nothing to reconcile: your repository already matches your local deploy config.';
      log(message);
      return { outcome: 'builds-live', message };
    }

    let accountId = record?.cloudflare?.accountId;
    let token;
    let watchOutcome;
    try {
      await runStep(
        frame,
        'Get a fresh Cloudflare API token',
        'This site already went live once, which deleted its saved Cloudflare API token, so ' +
          'watching the build your update just triggered needs a fresh one, prefilled the same ' +
          'way as before.',
        async () => {
          log(
            'Your repository needed an update; re-running the token prefill to watch the build ' +
              'it just triggered.',
          );
          const accountResult = await ensureAccountId({ record, dir, yes: args.yes, prompt: select, log });
          accountId = accountResult.accountId;
          if (accountResult.learned) {
            await updateSite(siteId, { cloudflare: { accountId } });
          }
          token = await ensureApiToken({
            record,
            log,
            openBrowser,
            yes: args.yes,
            promptSecretFn,
            env,
            argv,
            permissionKeys: CHAPTER3_PERMISSION_KEYS,
          });
          await updateSite(siteId, { cloudflare: { apiToken: token } });
        },
      );

      await runStep(frame, 'Watch the build your update triggered', WATCH_DETAIL, async () => {
        const api = makeApiFn({ token, accountId, dir });
        watchOutcome = await watchAndComplete({
          siteId,
          record,
          dir,
          log,
          api,
          sleepFn,
          fetchImpl,
          pollIntervalMs,
          maxPollAttempts,
          triggerUuid: record?.cloudflare?.buildsTriggerUuid,
          defaultBranch: record?.github?.repo?.defaultBranch,
          chapter3Reached: true,
          lastBuildUuid: undefined,
          lastBuildOutcome: record?.cloudflare?.buildsLastBuildOutcome,
          reconcileResult,
        });
      });
    } catch (error) {
      const code = error?.cause?.catalogue?.code;
      if (code === 'token-scope-missing' || code === 'token-invalid') {
        await deleteApiToken(siteId);
      }
      throw error;
    }
    return watchOutcome;
  }

  let accountId = record?.cloudflare?.accountId;
  let token = record?.cloudflare?.apiToken;
  let connectionUuid = record?.cloudflare?.buildsConnectionUuid;
  let triggerUuid = record?.cloudflare?.buildsTriggerUuid;
  const lastBuildUuid = record?.cloudflare?.buildsLastBuildUuid;
  const lastBuildOutcome = record?.cloudflare?.buildsLastBuildOutcome;
  const { defaultBranch } = record?.github?.repo ?? {};

  const chapter3Reached = CHAPTER3_RESUMABLE_STEPS.includes(record?.step);
  const alreadyAdmitted = Boolean(record?.cloudflare?.apiToken) || chapter3Reached;

  // --- Admission: only asked once, per the module doc's token-presence signal above.
  if (!alreadyAdmitted) {
    let consented = false;
    await runStep(frame, 'Connect to Workers Builds', ADMISSION_DETAIL, async () => {
      log(ADMISSION_DETAIL);
      if (args.yes) {
        consented = true;
        return;
      }
      const answer = await confirm({ message: 'Connect this repository to Workers Builds now? (Free.)' });
      if (isCancel(answer)) exitOnCancel();
      consented = Boolean(answer);
    });
    if (!dryRun && !consented) {
      const declineErr = cloudflareError('builds-connect-declined', { dir });
      log(declineErr.message);
      await updateSite(siteId, { step: 'builds-connect-declined' });
      await deleteApiToken(siteId);
      return { outcome: 'builds-connect-declined', message: declineErr.message };
    }
  }

  // --- Account selection: cheap and silent when an earlier chapter already saved an id.
  await runStep(
    frame,
    'Find your Cloudflare account',
    'Confirms the Cloudflare account your site already deployed to.',
    async () => {
      const result = await ensureAccountId({ record, dir, yes: args.yes, prompt: select, log });
      accountId = result.accountId;
      if (result.learned && !dryRun) {
        await updateSite(siteId, { cloudflare: { accountId } });
      }
    },
  );

  // Wrapped in one try/catch from the token hop onward (mirroring chapter2.mjs's own T4b.1
  // half): a token-scope-missing or token-invalid failure anywhere below clears the saved token
  // before the error surfaces, so the re-run the row already tells the admin to do actually
  // re-collects one instead of silently reusing the bad one.
  try {
    await runStep(
      frame,
      'Get a fresh Cloudflare API token',
      "Opens Cloudflare's create-token page with the permissions this chapter needs already " +
        'filled in (the same five chapter 2 already asked for, plus the Workers Builds ones), ' +
        'and asks you to paste the token back.',
      async () => {
        token = await ensureApiToken({
          record,
          log,
          openBrowser,
          yes: args.yes,
          promptSecretFn,
          env,
          argv,
          permissionKeys: CHAPTER3_PERMISSION_KEYS,
        });
        if (!dryRun && token !== record?.cloudflare?.apiToken) {
          await updateSite(siteId, { cloudflare: { apiToken: token } });
        }
      },
    );

    const api = makeApiFn({ token, accountId, dir });

    if (!chapter3Reached) {
      // --- Connect: the repository's numeric id and its owner's numeric id both come from one
      // GET, then the connections PUT (a proven upsert, per the spike).
      const { owner, repo } = record?.github?.repo ?? {};
      let parkError;

      await runStep(
        frame,
        'Connect your repository to Workers Builds',
        "Reads your repository's numeric ids from GitHub, then connects it to Workers Builds.",
        async () => {
          const { status, json } = await githubRequest('GET', `/repos/${owner}/${repo}`);
          if (status !== 200) {
            throw new Error(
              `chapter3: could not read ${owner}/${repo} from GitHub (status ${status}), so ` +
                'Workers Builds has nothing to connect to.\n' +
                `Next: verify the repository still exists, then re-run npx create-cairn-site ` +
                `--dir ${dir} --connect.`,
            );
          }
          try {
            const result = await api.putBuildConnection({
              providerAccountId: String(json.owner.id),
              providerAccountName: json.owner.login,
              repoId: String(json.id),
              repoName: json.name,
            });
            connectionUuid = result.repo_connection_uuid;
          } catch (err) {
            const code = err?.catalogue?.code;
            if (code === 'builds-app-not-authorized' || code === 'builds-repo-not-selected') {
              parkError = err;
              log(err.message);
              return;
            }
            throw err;
          }
        },
      );
      if (!dryRun && parkError) {
        return { outcome: parkError.catalogue.code, message: parkError.message };
      }
      if (!dryRun) {
        await updateSite(siteId, { cloudflare: { buildsConnectionUuid: connectionUuid } });
      }

      // --- Trigger: bind the existing Worker, read before write throughout (the tag lookup, the
      // triggers list, and the build-tokens list all read before this ever writes).
      await runStep(
        frame,
        'Create your Workers Builds trigger',
        'Binds your Worker to the connected repository, so every push to its default branch ' +
          'builds and deploys automatically.',
        async () => {
          const workerName = await readWorkerName(dir);
          const tag = await api.findWorkerTag(workerName);
          if (!tag) {
            throw new Error(
              `chapter3: no Cloudflare Worker named "${workerName}" was found on this account, ` +
                'so Workers Builds has nothing to bind to.\n' +
                `Next: run npx create-cairn-site --dir ${dir} to finish deploying first, then ` +
                `re-run npx create-cairn-site --dir ${dir} --connect.`,
            );
          }

          const triggers = await api.listBuildTriggers(tag);
          const existing = triggers.find(
            (candidate) => candidate.repo_connection?.repo_connection_uuid === connectionUuid,
          );
          if (existing) {
            triggerUuid = existing.trigger_uuid;
            return;
          }

          const verified = await api.verifyToken();
          const existingTokens = await api.getBuildTokens();
          let buildTokenUuid = existingTokens.find(
            (candidate) => candidate.cloudflare_token_id === verified.id,
          )?.build_token_uuid;
          if (!buildTokenUuid) {
            const createdToken = await api.createBuildToken({
              name: BUILD_TOKEN_NAME,
              secret: token,
              cloudflareTokenId: verified.id,
            });
            buildTokenUuid = createdToken.build_token_uuid;
          }

          const createdTrigger = await api.createBuildTrigger({
            workerTag: tag,
            repoConnectionUuid: connectionUuid,
            buildTokenUuid,
            triggerName: BUILDS_TRIGGER_NAME,
            branchIncludes: [defaultBranch],
            buildCommand: BUILD_COMMAND,
            deployCommand: DEPLOY_COMMAND,
          });
          triggerUuid = createdTrigger.trigger_uuid;
        },
      );
      if (!dryRun) {
        await updateSite(siteId, { step: 'builds-connected', cloudflare: { buildsTriggerUuid: triggerUuid } });
      }
    }

    // --- Reconcile: diff-based, idempotent, always attempted once connect and trigger have
    // settled (the diff itself is the idempotence).
    let reconcileResult;
    await runStep(frame, 'Reconcile your deploy config', RECONCILE_DETAIL, async () => {
      reconcileResult = await performReconcile({ record, dir, args, log, openBrowser });
    });
    if (!dryRun && reconcileResult?.parked) {
      return { outcome: reconcileResult.parked.catalogue.code, message: reconcileResult.parked.message };
    }
    if (!dryRun) {
      await updateSite(siteId, { step: 'config-reconciled' });
    }

    // --- Watch: find or kick the build the reconcile hop should have triggered, poll it, and
    // confirm the site's hostname once it succeeds.
    let watchOutcome;
    await runStep(frame, 'Watch your first Workers Builds deploy', WATCH_DETAIL, async () => {
      watchOutcome = await watchAndComplete({
        siteId,
        record,
        dir,
        log,
        api,
        sleepFn,
        fetchImpl,
        pollIntervalMs,
        maxPollAttempts,
        triggerUuid,
        defaultBranch,
        chapter3Reached,
        lastBuildUuid,
        lastBuildOutcome,
        reconcileResult,
      });
    });
    if (!dryRun) {
      return watchOutcome;
    }
  } catch (error) {
    const code = error?.cause?.catalogue?.code;
    if (!dryRun && (code === 'token-scope-missing' || code === 'token-invalid')) {
      await deleteApiToken(siteId);
    }
    throw error;
  }

  return { outcome: 'dry-run' };
}

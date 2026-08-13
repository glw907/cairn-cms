// Chapter 3's spine: the guided path from chapter 2's finish (or, later, a resumed `--connect`
// entry from any allowlisted state) to a repository connected to Workers Builds, with a trigger
// bound to the site's own Worker, its deploy config reconciled into the repository, and the first
// Builds deploy watched to success. Modelled directly on chapter2.mjs: the same runStep/runActions
// idiom (a title always prints, a detail prints only under --dry-run, execute never runs under
// --dry-run), one state writer, pure step logic over an in-memory record.
//
// THIS CHAPTER HOLDS NO GITHUB CREDENTIAL, and needs none until the reconcile commit. Chapter 1
// destroyed the App's private key once it had moved it into the Worker's secrets, and nothing
// persists a GitHub token. Both numeric ids the connections PUT needs are reachable anyway: the
// repository's own id was persisted by chapter 1 (`createRepo`'s result, saved at
// `github.repo.id`), and the owner's id comes from `GET /users/{login}`, which GitHub serves
// anonymously for users and organizations alike. Every repository this tool creates is private, so
// an anonymous `GET /repos/{owner}/{repo}` would answer 404 and connect nothing: do not reach for
// one here.
//
// TOKEN LIFECYCLE. Chapter 3 asks for its own token, prefilled with eight permission keys (the
// five chapter 2 asks for plus the three Workers Builds needs). It never adopts a token it did not
// save itself: chapter 2 writes the same `cloudflare.apiToken` key and only clears it at its own
// terminal steps, so a record parked at `domain-live` or `email-onboarded` still carries a
// five-key chapter-2 token when `--connect` runs, and adopting that one skips the eight-key
// prefill and 403s at the first Builds call. `cloudflare.buildsTokenSavedAt` is the chapter-3-owned
// marker recording that this chapter's own token hop saved the token now on the record. Its
// presence is also what lets a re-run skip admission after a connect or trigger park (neither
// advances `step`, so `step` alone cannot carry that signal the way it carries "connect and
// trigger both finished", CHAPTER3_RESUMABLE_STEPS below), and it can only ever be written after
// admission has been given. The token is deleted at every terminal outcome (builds-live,
// builds-connect-declined) and on the `--yes` reconcile park; the parks that keep it are the ones
// whose own re-run resumes with it, listed where they return.
//
// THE RECONCILE'S SKIP GATE IS LOCAL, NOT REMOTE. Deciding whether the reconcile hop owes an OAuth
// trip cannot be done by reading the repository: it is private, and the only credential that could
// read it is the one the trip mints. So the chapter records `cloudflare.buildsReconciledHash`, a
// hash of the two tool-owned files as they sat on disk at the last reconcile, and compares the
// current disk contents against it. Equal means nothing local has drifted since, and the trip is
// skipped. Absent or different means the trip runs and `reconcileRepo`'s own authenticated diff
// decides, which stays authoritative and still writes nothing when the repository already matches.
// The narrowing this accepts, stated plainly: an admin who edits `wrangler.jsonc` or
// `src/theme/cairn.config.ts` directly in the repository is not noticed until something local
// changes too. Local drift is what ruling 4's stale-origin remedy is about, and that is what the
// hash catches exactly.
import { confirm as clackConfirm, select as clackSelect, isCancel } from '@clack/prompts';
import { createHash } from 'node:crypto';
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
import { reconcileRepo, RECONCILED_FILES } from '../github/reconcile.mjs';

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
 * Resolve the Cloudflare tag of the Worker the local scaffold names, the id every Builds trigger
 * and build list is keyed by, or throw naming what a missing Worker blocks. Shared by the trigger
 * hop and the build watch, which need the identical name-then-tag lookup and differ only in what
 * they were about to do with the tag.
 * @param {object} api the Cloudflare API client
 * @param {string} dir the scaffold root
 * @param {string} blocked what Workers Builds has when no such Worker exists, completing "so
 *  Workers Builds has ..."
 * @returns {Promise<string>} the worker tag
 */
async function resolveWorkerTag(api, dir, blocked) {
  const workerName = await readWorkerName(dir);
  const tag = await api.findWorkerTag(workerName);
  if (!tag) {
    throw new Error(
      `chapter3: no Cloudflare Worker named "${workerName}" was found on this account, so ` +
        `Workers Builds has ${blocked}.\n` +
        `Next: run npx create-cairn-site --dir ${dir} to finish deploying first, then re-run ` +
        `npx create-cairn-site --dir ${dir} --connect.`,
    );
  }
  return tag;
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
 * The same record with any saved `cloudflare.apiToken` withheld, for the calls that must not reuse
 * a token this chapter did not save. Returns the record untouched when there is nothing to
 * withhold, and never writes: the state store still holds whatever it held.
 * @param {object | null | undefined} record the site's in-memory state record
 * @returns {object | null | undefined} the record without a saved token
 */
function withoutSavedToken(record) {
  if (!record?.cloudflare || !('apiToken' in record.cloudflare)) return record;
  const { apiToken: _withheld, ...cloudflare } = record.cloudflare;
  return { ...record, cloudflare };
}

/**
 * Fingerprint the two tool-owned files as they currently sit on disk. The chapter stores this at
 * every reconcile and compares it on the next entry, which is what lets an unchanged scaffold skip
 * the OAuth trip without reading the (private) repository; see this module's header for the
 * narrowing that accepts. A file missing locally hashes as its own distinct state rather than
 * raising, so a directory that is not a scaffold reads as "drifted" and the reconcile hop decides,
 * rather than the hash itself failing the run.
 * @param {string} dir the scaffold root
 * @returns {Promise<string>} a hex sha-256 over each file's path and contents, in a fixed order
 */
export async function reconciledConfigHash(dir) {
  const hash = createHash('sha256');
  for (const relativePath of RECONCILED_FILES) {
    let content;
    try {
      content = await readFile(path.join(dir, relativePath), 'utf8');
    } catch (cause) {
      if (cause.code !== 'ENOENT') throw cause;
      content = null;
    }
    hash.update(`${relativePath}\0${content === null ? 'missing' : content}\0`);
  }
  return hash.digest('hex');
}

/**
 * @typedef {object} ReconcileAttempt
 * @property {boolean} [changed] whether reconcileRepo committed (present when no park occurred)
 * @property {string} [commitSha] the commit's sha, present only when `changed` is true
 * @property {string} [hash] the local config hash this attempt read, for the caller to record
 * @property {Error & { catalogue: object }} [parked] set instead of `changed`/`commitSha` when
 *  `--yes` met a possible diff and the OAuth trip was parked rather than attempted
 */

/**
 * Run the reconcile diff-then-commit hop: skip the OAuth trip entirely when the local config
 * matches the hash recorded at the last reconcile, park under `--yes` when it does not, and
 * otherwise run `reauthorize` and the real `reconcileRepo`, whose authenticated diff is the
 * authority on whether anything is actually committed. Shared by the main flow (always called once
 * connect and trigger have settled) and the `builds-live` re-entry (ruling 4: not a no-op).
 * @param {{ record: object, dir: string, args: { yes: boolean }, log: (line: string) => void,
 *  openBrowser: (url: string, log: (line: string) => void) => Promise<void> }} input
 * @returns {Promise<ReconcileAttempt>} the attempt's outcome
 */
async function performReconcile({ record, dir, args, log, openBrowser }) {
  const hash = await reconciledConfigHash(dir);
  if (hash === record?.cloudflare?.buildsReconciledHash) return { changed: false, hash };

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
  return { changed: result.changed, commitSha: result.commitSha, hash };
}

/**
 * Poll a build until it reaches `stopped` WITH a settled `build_outcome`, printing a heartbeat
 * every BUILD_POLL_HEARTBEAT_EVERY attempts, or until `maxPollAttempts` elapses first. `stopped`
 * with `build_outcome: null` keeps polling rather than returning: the spike's own capture shows
 * `build_outcome` is written after `status` flips to `stopped`, so those two fields are not a
 * guaranteed atomic write, and a caller that stops on `status` alone can read a one-tick-early
 * snapshot and, downstream, treat an unfinished build as a success (T4c review finding B1).
 * @param {{ api: object, buildUuid: string, log: (line: string) => void,
 *  sleepFn: (ms: number) => Promise<void>, pollIntervalMs: number, maxPollAttempts: number }} input
 * @returns {Promise<{ build: object, budgetExceeded: boolean }>} the last-read build record, and
 *  whether the poll gave up before it reached a stopped build with a settled outcome
 */
async function pollBuildToStop({ api, buildUuid, log, sleepFn, pollIntervalMs, maxPollAttempts }) {
  let build = await api.getBuild(buildUuid);
  let attempt = 0;
  while (build.status !== 'stopped' || build.build_outcome == null) {
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
 *
 * THE DISCOVERY HOLD (T4d Task 4b). The commit-hash and newest-build searches above are a queue-lag
 * race: the reconcile's push (or a resumed watch's earlier kick) may not have surfaced on
 * `listBuildsForWorker` yet. Absent an injected `waitForClear` this reads the list exactly once and
 * falls straight through to today's `build-not-started` park when nothing matches, byte-identical to
 * before this hold existed. Given one, the SAME read (same predicate, same tag) is retried by the
 * hold loop until it finds a match or the build budget runs out, so `build-not-started` becomes a
 * held, watchable wait rather than an immediate park. `kickBuild` is never part of this: a fresh
 * manual kick resolves its own `buildUuid` synchronously and so never reaches the discovery hold at
 * all, and a match found by the hold is simply handed to the single existing `pollBuildToStop` pass
 * below, never a second loop over one build.
 * @param {object} input
 * @param {(probe: import('../hold-loop.mjs').HoldProbe) =>
 *  Promise<import('../hold-loop.mjs').HoldObservation>} [input.waitForClear] the injected build
 *  discovery hold. Absent it, discovery behaves exactly as it did before the console existed: one
 *  `listBuildsForWorker` read, then today's park.
 * @returns {Promise<{ outcome: string, message?: string }>} a wait-kind park (returned, never
 *  thrown) or the `builds-live` success outcome; an act-kind failure throws a catalogued error
 */
export async function watchAndComplete({
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
  waitForClear,
}) {
  const tag = await resolveWorkerTag(api, dir, 'nothing to watch');

  let buildUuid = lastBuildUuid;
  // Which predicate discovery must apply once it starts reading the build list: an exact
  // commit-hash match when the reconcile just committed, or the newest build when nothing local
  // changed. `needsDiscovery` stays false when buildUuid is already known or a fresh manual kick
  // (below) is about to mint one directly, so discovery is skipped entirely in both cases.
  let discoveryCommitSha;
  let needsDiscovery = false;

  if (reconcileResult?.changed) {
    needsDiscovery = true;
    discoveryCommitSha = reconcileResult.commitSha;
  } else if (!buildUuid) {
    if (lastBuildOutcome === 'success') {
      // A terminal outcome like any other: the step is recorded and the pasted token deleted, the
      // same as the watched-to-success path below. Reaching builds-live without doing either would
      // leave a live credential on a record nothing ever comes back to clear.
      await updateSite(siteId, { step: 'builds-live' });
      await deleteApiToken(siteId);
      return { outcome: 'builds-live', message: 'Nothing to reconcile: your site is already live.' };
    }
    if (chapter3Reached) {
      // A resumed run with no diff and no tracked buildsLastBuildUuid has nothing to match a
      // commit hash against (this is the manual-kick-not-push-build case, amendment 10), so
      // position is the only signal available: `listBuildsForWorker` was observed newest-first
      // live, captured in docs/internal/2026-08-12-t4c-builds-spike.md ("Two shapes captured
      // after the fact"). That capture is explicitly one observation on one account, not a
      // documented contract, which is why every OTHER build-discovery site in this module still
      // matches on `build_trigger_metadata.commit_hash` (amendment 10) rather than position; do
      // not widen this `builds[0]` shortcut to those sites.
      needsDiscovery = true;
    } else {
      const kicked = await api.kickBuild(triggerUuid, defaultBranch);
      buildUuid = kicked.build_uuid;
      await updateSite(siteId, { cloudflare: { buildsLastBuildUuid: buildUuid } });
    }
  }

  if (needsDiscovery) {
    const discoverBuild = async () => {
      const builds = await api.listBuildsForWorker(tag);
      const matched = discoveryCommitSha
        ? builds.find((build) => build.build_trigger_metadata?.commit_hash === discoveryCommitSha)
        : builds[0];
      return {
        cleared: Boolean(matched),
        detail: {
          buildUuid: matched?.build_uuid ?? null,
          status: matched?.status ?? null,
          outcome: matched?.build_outcome ?? null,
          commitSha: matched?.build_trigger_metadata?.commit_hash ?? discoveryCommitSha ?? null,
        },
        park: matched ? undefined : cloudflareError('build-not-started', { dir }).message,
      };
    };
    const observation = waitForClear ? await waitForClear(discoverBuild) : await discoverBuild();
    buildUuid = observation.detail.buildUuid ?? undefined;
  }

  // The three parks below are the only returns in this chapter that KEEP the saved token, and only
  // when the main flow reaches them: each leaves `step` short of a terminal one, so a plain re-run
  // resumes this same watch and signs its polls with the same credential. Reached from the
  // builds-live re-entry instead, that record's step never leaves a terminal one, and the re-entry's
  // own wrapper deletes the token on every return, including these.
  if (!buildUuid) {
    const err = cloudflareError('build-not-started', { dir });
    log(err.message);
    return { outcome: 'build-not-started', message: err.message };
  }

  const { build, budgetExceeded } = await pollBuildToStop({
    api,
    buildUuid,
    log,
    sleepFn,
    pollIntervalMs,
    maxPollAttempts,
  });
  if (budgetExceeded) {
    await updateSite(siteId, { cloudflare: { buildsLastBuildUuid: buildUuid } });
    const err = cloudflareError('build-running', { dir });
    log(err.message);
    return { outcome: 'build-running', message: err.message };
  }

  await updateSite(siteId, {
    cloudflare: { buildsLastBuildUuid: buildUuid, buildsLastBuildOutcome: build.build_outcome },
  });

  if (build.build_outcome === 'fail' || build.build_outcome === 'terminated') {
    const logs = await api.getBuildLogs(buildUuid);
    throw cloudflareError('builds-deploy-failed', {
      dir,
      detail: buildLogTail(logs),
      buildUrl: BUILDS_DASHBOARD_URL,
      logTruncated: Boolean(logs?.cappedAtPageLimit),
    });
  }
  // `success` is the ONLY outcome the live path proceeds on. This catches `skipped` and
  // `cancelled` (the catalogue's own builds-not-runnable cases) and, deliberately, anything else:
  // the poll above already guarantees `build_outcome` is settled (never null) by this point, so an
  // outcome this code does not recognize is genuinely unexpected, and reading it as success would
  // tell the admin a failed or unrunnable deploy actually succeeded (T4c review finding B1). No
  // outcome value ever falls through to the live path below without matching 'success' exactly.
  if (build.build_outcome !== 'success') {
    throw cloudflareError('builds-not-runnable', {
      dir,
      outcome: build.build_outcome ?? 'unknown',
      buildUrl: BUILDS_DASHBOARD_URL,
    });
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
  'repository. That token becomes your Workers Builds build token, which saves you a second trip ' +
  'to the dashboard and has a consequence worth knowing first: Cloudflare keeps its secret and ' +
  'gives it to every build your repository runs, and the token is scoped across your accounts ' +
  'and zones. Treat anyone who can commit to your default branch as able to read it. It costs no ' +
  "money: Workers Builds' free tier includes 3,000 build minutes a month and one build running " +
  'at a time, as of 2026-08-12 ' +
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
 * @property {{ yes: boolean, connect?: boolean }} args the parsed CLI flags this chapter reads:
 *  `yes` for an unattended run, `connect` for an explicit `--connect` re-entry (the only thing
 *  that admits a `builds-connect-declined` record back into admission; see the module doc below)
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
 * `record`: a plain re-entry (no `--connect`) at `builds-connect-declined` short-circuits at the
 * top (the token is cleared again, in case an earlier run somehow left one behind, and the
 * decline is reported back unchanged), while an explicit `--connect` there is the declining
 * owner's own way back in (the catalogue row's own copy) and falls through into the normal
 * admission below instead, the same as any other `--connect` entry step; `builds-live` is not a
 * no-op (ruling 4) and re-runs only the reconcile check, reporting "nothing
 * to reconcile" when the local config has not drifted since the last one and, when it has,
 * re-running the token prefill (the saved token was already deleted at that terminal step) to watch
 * the build the fresh commit triggers. A saved `cloudflare.buildsTokenSavedAt` or a step already in
 * CHAPTER3_RESUMABLE_STEPS means this chapter's own admission has already run and is not re-asked;
 * a step already in CHAPTER3_RESUMABLE_STEPS additionally skips connect and trigger, both of which
 * are otherwise safe to repeat.
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

  /**
   * Collect this chapter's own eight-key token and record it under `cloudflare.apiToken`
   * alongside `buildsTokenSavedAt`, the chapter-3-owned marker saying this chapter is the one
   * that saved what is now on the record. Both of this chapter's token hops (the main flow's and
   * the builds-live re-entry's) run through here, so neither can drift from the other on which
   * saved token may be reused.
   * @param {boolean} offerSaved whether the record's own saved token may be offered back to
   *  `ensureApiToken`. True only when `buildsTokenSavedAt` proves this chapter saved the token now
   *  on the record; anything else (a five-key chapter-2 token, or a builds-live record still
   *  carrying the marker after its token was deleted at that terminal step) is withheld, so the
   *  eight-key prefill actually opens.
   * @returns {Promise<string>} the token now in hand
   */
  async function collectBuildsToken(offerSaved) {
    const collected = await ensureApiToken({
      record: offerSaved ? record : withoutSavedToken(record),
      log,
      openBrowser,
      yes: args.yes,
      promptSecretFn,
      env,
      argv,
      permissionKeys: CHAPTER3_PERMISSION_KEYS,
    });
    if (!dryRun && (!offerSaved || collected !== record?.cloudflare?.apiToken)) {
      await updateSite(siteId, {
        cloudflare: { apiToken: collected, buildsTokenSavedAt: new Date().toISOString() },
      });
    }
    return collected;
  }

  if (!dryRun && record?.step === 'builds-connect-declined' && !args.connect) {
    await deleteApiToken(siteId);
    return { outcome: 'builds-connect-declined' };
  }

  // --- builds-live re-entry: the site is already fully connected and live; only the reconcile
  // diff might still need to run (ruling 4, the stale-origin remedy). Never a no-op.
  if (!dryRun && record?.step === 'builds-live') {
    // Every return below runs through the `finally`, which deletes the pasted token: this branch
    // leaves `step` at `builds-live` whatever happens, and a terminal step must never carry a live
    // credential. A park here is not resumable the way a mid-chapter park is either, since the next
    // entry re-enters this same branch and re-runs the prefill for itself.
    try {
      let reconcileResult;
      await runStep(frame, 'Reconcile your deploy config', RECONCILE_DETAIL, async () => {
        reconcileResult = await performReconcile({ record, dir, args, log, openBrowser });
      });
      if (reconcileResult.parked) {
        return { outcome: reconcileResult.parked.catalogue.code, message: reconcileResult.parked.message };
      }
      if (reconcileResult.hash !== record?.cloudflare?.buildsReconciledHash) {
        await updateSite(siteId, { cloudflare: { buildsReconciledHash: reconcileResult.hash } });
      }
      if (!reconcileResult.changed) {
        const message = 'Nothing to reconcile: your repository already matches your local deploy config.';
        log(message);
        return { outcome: 'builds-live', message };
      }

      let accountId = record?.cloudflare?.accountId;
      let token;
      let watchOutcome;
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
          // Never the record as saved: reaching builds-live deleted this chapter's own token, so
          // anything still under that key came from somewhere else and is not this chapter's to
          // reuse.
          token = await collectBuildsToken(false);
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
      return watchOutcome;
    } finally {
      await deleteApiToken(siteId);
    }
  }

  let accountId = record?.cloudflare?.accountId;
  let token;
  let connectionUuid = record?.cloudflare?.buildsConnectionUuid;
  let triggerUuid = record?.cloudflare?.buildsTriggerUuid;
  const lastBuildUuid = record?.cloudflare?.buildsLastBuildUuid;
  const lastBuildOutcome = record?.cloudflare?.buildsLastBuildOutcome;
  const { defaultBranch } = record?.github?.repo ?? {};

  const chapter3Reached = CHAPTER3_RESUMABLE_STEPS.includes(record?.step);
  // Both of this chapter's "has it already run?" questions are answered by evidence this chapter
  // itself wrote, never by a saved `cloudflare.apiToken`: chapter 2 writes that same key and clears
  // it only at its own terminal steps, so a record at `domain-live` or `email-onboarded` reaches
  // here still carrying a five-key chapter-2 token. Reading that as "chapter 3 already ran" skipped
  // this chapter's consent, its cost statement, and its eight-key prefill, and then 403'd on the
  // first Builds call with the adopted token.
  const chapter3TokenSaved = Boolean(record?.cloudflare?.buildsTokenSavedAt);
  const alreadyAdmitted = chapter3TokenSaved || chapter3Reached;

  // --- Admission: only asked once, per the chapter-3-owned signals above.
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
        // A saved token is offered back to `ensureApiToken` only when this chapter is the one
        // that saved it; anything else is withheld, so the eight-key prefill actually opens.
        token = await collectBuildsToken(chapter3TokenSaved);
      },
    );

    const api = makeApiFn({ token, accountId, dir });

    if (!chapter3Reached) {
      // --- Connect: the repository's numeric id was persisted by chapter 1, and the owner's comes
      // from GitHub's public user read, so this hop needs no GitHub credential (module header).
      // Then the connections PUT, a proven upsert per the spike.
      const { owner, repo, id: repoId } = record?.github?.repo ?? {};
      let parkError;

      await runStep(
        frame,
        'Connect your repository to Workers Builds',
        "Reads your repository owner's numeric id from GitHub, then connects your repository to " +
          'Workers Builds.',
        async () => {
          if (!repoId) {
            throw new Error(
              `chapter3: this site's saved record carries no numeric id for ${owner}/${repo}, ` +
                'which is what Workers Builds identifies a repository by, so there is nothing to ' +
                'connect it with. Chapter 1 records that id when it creates the repository, so a ' +
                'record without one was written by hand or by a much older version of this tool.\n' +
                `Next: connect ${owner}/${repo} to your Worker yourself at ` +
                `${BUILDS_DASHBOARD_URL}, then re-run npx create-cairn-site --dir ${dir} ` +
                '--connect to finish the rest of this chapter.',
            );
          }
          const { status, json } = await githubRequest('GET', `/users/${owner}`);
          if (status !== 200) {
            throw new Error(
              `chapter3: could not read the GitHub account ${owner} (status ${status}), so ` +
                "Workers Builds cannot be told which account's repository to connect.\n" +
                `Next: check that github.com/${owner} still exists and that you can reach ` +
                `github.com, then re-run npx create-cairn-site --dir ${dir} --connect.`,
            );
          }
          try {
            const result = await api.putBuildConnection({
              providerAccountId: String(json.id),
              providerAccountName: owner,
              repoId: String(repoId),
              repoName: repo,
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
          const tag = await resolveWorkerTag(api, dir, 'nothing to bind to');

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
        await updateSite(siteId, {
          step: 'builds-connected',
          cloudflare: { buildsTriggerUuid: triggerUuid },
        });
      }
    }

    // --- Reconcile: diff-based, idempotent, always attempted once connect and trigger have
    // settled (the diff itself is the idempotence).
    let reconcileResult;
    await runStep(frame, 'Reconcile your deploy config', RECONCILE_DETAIL, async () => {
      reconcileResult = await performReconcile({ record, dir, args, log, openBrowser });
    });
    if (!dryRun && reconcileResult?.parked) {
      // The token goes with this park: it was `--yes` that could not open a browser, so the re-run
      // this row asks for is an interactive one, which collects a token of its own.
      await deleteApiToken(siteId);
      return { outcome: reconcileResult.parked.catalogue.code, message: reconcileResult.parked.message };
    }
    if (!dryRun) {
      await updateSite(siteId, {
        step: 'config-reconciled',
        cloudflare: { buildsReconciledHash: reconcileResult.hash },
      });
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

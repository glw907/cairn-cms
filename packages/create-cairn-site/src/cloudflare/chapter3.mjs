// Chapter 3's spine: the guided path from chapter 2's finish (or, later, a resumed `--connect`
// entry from any allowlisted state) to a repository connected to Workers Builds, with a trigger
// bound to the site's Worker, its deploy config reconciled into the repository, and the first
// Builds deploy watched to success. Modelled directly on chapter2.mjs: the same runStep/runActions
// idiom (a title always prints, a detail prints only under --dry-run, execute never runs under
// --dry-run), one state writer, pure step logic over an in-memory record.
//
// THIS CHAPTER HOLDS NO GITHUB CREDENTIAL, and needs none until the reconcile commit. Chapter 1
// destroyed the App's private key once it had moved it into the Worker's secrets, and nothing
// persists a GitHub token. Both numeric ids the connections PUT needs are reachable anyway: the
// repository's id was persisted by chapter 1 (`createRepo`'s result, saved at
// `github.repo.id`), and the owner's id comes from `GET /users/{login}`, which GitHub serves
// anonymously for users and organizations alike. Every repository this tool creates is private, so
// an anonymous `GET /repos/{owner}/{repo}` would answer 404 and connect nothing: do not reach for
// one here.
//
// TOKEN LIFECYCLE. Chapter 3 works with two tokens. The setup token signs every call this chapter
// makes, prefilled with six permission keys (the five chapter 2 asks for plus `workers_ci`). The
// build token is the narrow one Workers Builds deploys with (Workers Scripts, D1, and R2 only):
// the trigger hop reuses the account's newest `cairn-build` registration, and only when there is
// none does it collect one, verify it, and register it. The build token is held in memory for that
// hop alone and never written to state; Cloudflare keeps its secret, and this tool never deletes
// a registration.
//
// The setup token is never adopted from a save this chapter did not make: chapter 2 writes the
// same `cloudflare.apiToken` key and only clears it at its terminal steps, so a record parked at
// `domain-live` or `email-onboarded` still carries a five-key chapter-2 token when `--connect`
// runs, and adopting that one skips the six-key prefill and 403s at the first Builds call.
// `cloudflare.buildsTokenSavedAt` is the chapter-3-owned
// marker recording that this chapter's token hop saved the token now on the record; chapter 2
// drops it whenever it saves a token of its own over this one. Its
// presence is also what lets a re-run skip admission after a connect or trigger park (neither
// advances `step`, so `step` alone cannot carry that signal the way it carries "connect and
// trigger both finished", CHAPTER3_RESUMABLE_STEPS below), and it can only ever be written after
// admission has been given. The setup token is deleted at every terminal outcome (builds-live,
// builds-connect-declined) and on the `--yes` reconcile park; the parks that keep it are the ones
// whose re-run resumes with it, listed where they return.
//
// THE RECONCILE'S SKIP GATE IS LOCAL, NOT REMOTE. Deciding whether the reconcile hop owes an OAuth
// trip cannot be done by reading the repository: it is private, and the only credential that could
// read it is the one the trip mints. So the chapter records `cloudflare.buildsReconciledHash`, a
// hash of the two tool-owned files as they sat on disk at the last reconcile, and compares the
// current disk contents against it. Equal means nothing local has drifted since, and the trip is
// skipped. Absent or different means the trip runs and `reconcileRepo`'s authenticated diff
// decides, which stays authoritative and still writes nothing when the repository already matches.
// The narrowing this accepts, stated plainly: an admin who edits `wrangler.jsonc` or
// `src/theme/cairn.config.ts` directly in the repository is not noticed until something local
// changes too. Local drift is what ruling 4's stale-origin remedy is about, and that is what the
// hash catches exactly. Chapter 2's commits on a connected site (`deployConfigThroughBuilds`) add
// a guard that refuses to commit over such an edit; this chapter's own reconciles pass none.
import { confirm as clackConfirm, select as clackSelect, isCancel } from '@clack/prompts';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { exitOnCancel, promptSecret } from '../prompts.mjs';
import { defineAction, runActions } from '../runner.mjs';
import { loadSite, updateSite } from '../state.mjs';
import { ensureAccountId } from './account.mjs';
import { ensureApiToken, ensureBuildToken, BUILD_TOKEN_NAME, CHAPTER3_PERMISSION_KEYS } from './prefill.mjs';
import { makeApi } from './api.mjs';
import { cloudflareError, trailingStderr } from './catalogue.mjs';
import { deleteApiToken } from './chapter2.mjs';
import { maskToolOwnedValues, readToolOwnedValues } from './config.mjs';
import { confirmHostname } from './hostname.mjs';
import { defaultResolve } from './dns.mjs';
import { githubRequest } from '../github/api.mjs';
import { openBrowser as defaultOpenBrowser } from '../github/open.mjs';
import { reauthorize } from '../github/oauth.mjs';
import { reconcileRepo, RECONCILED_FILES } from '../github/reconcile.mjs';
import { createWaitForClear, shouldHold, BUILD_HOLD_CLASS } from '../hold-loop.mjs';
import { createConsoleServer } from '../console/server.mjs';
import { renderBuildsView } from '../console/views.mjs';

/**
 * The step names this chapter's success terminal and its declined terminal write, exported
 * for `bin.mjs`'s routing (aliased on import there, since it already imports chapter 2's
 * `TERMINAL_STEPS`).
 * @type {string[]}
 */
export const CHAPTER3_TERMINAL_STEPS = ['builds-live', 'builds-connect-declined'];

/**
 * The step names a resumed record can still finish this chapter from, past the connect-and-trigger
 * hop: `builds-connected` and `config-reconciled`. Exported for the same `bin.mjs` routing.
 * Membership in this list, checked by plain inclusion rather than a numeric index, is also what
 * this module's internal resumption is built on: an index-based check like chapter2's
 * `stepIndex` defaults any unrecognized string to "as if already past `live`", which would wrongly
 * admit a record still mid-chapter-1; a plain membership test against this chapter's explicit
 * step names carries no such default.
 * @type {string[]}
 */
export const CHAPTER3_RESUMABLE_STEPS = ['builds-connected', 'config-reconciled'];

/** The trigger name every created trigger carries, matching the shape the spike captured live. */
const BUILDS_TRIGGER_NAME = 'Deploy default branch';

/** The build command every created trigger carries: the scaffold's `npm run build` script. */
const BUILD_COMMAND = 'npm run build';

/** The deploy command every created trigger carries: wrangler's default deploy invocation. */
const DEPLOY_COMMAND = 'npx wrangler deploy';

/** Matches the top-level `"name": "..."` line in a scaffold's wrangler.jsonc. */
const WORKER_NAME_PATTERN = /"name":\s*"([^"]+)"/;

/** The generic, already-verified Cloudflare dashboard entry point (Global Constraints'
 * fallback for an unproven deep link): no build-specific deep-link shape was captured by the
 * spike, so this is used rather than a guessed URL. */
const BUILDS_DASHBOARD_URL = 'https://dash.cloudflare.com/?to=/:account/workers-and-pages';

/** How often, in poll attempts, the build watch prints a heartbeat. Mirrors install.mjs's
 * POLL_HEARTBEAT_EVERY idiom. */
const BUILD_POLL_HEARTBEAT_EVERY = 10;

const BUILD_POLL_HEARTBEAT_MESSAGE =
  'Still watching the build; checking every few seconds. Leave this running.';

/** The default interval between build polls, and the default budget (Cloudflare's build
 * timeout is 20 minutes, per the catalogue's build-running row; this stays comfortably under it). */
const DEFAULT_BUILD_POLL_INTERVAL_MS = 5000;
const DEFAULT_MAX_POLL_ATTEMPTS = 180;

/** How many reads, `DEFAULT_BUILD_POLL_INTERVAL_MS` apart, chapter 2's Builds hop gives a
 * just-pushed commit to appear in the build list: two minutes for GitHub's push webhook to reach
 * Workers Builds. */
const DEFAULT_MAX_DISCOVERY_ATTEMPTS = 24;

/**
 * Sleep for the given duration; the build watch's default pacing, overridden by a test's
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
 * already moved the name Cloudflare actually deployed under, and this chapter's trigger and
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
 * Run one hop as a single-action batch through runActions, mirroring chapter2.mjs's
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
 * narrowing that accepts. A file missing locally hashes as a distinct state rather than
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
 *  openBrowser: (url: string, log: (line: string) => void) => Promise<void>,
 *  guard?: import('../github/reconcile.mjs').ReconcileRepoInput['guard'] }} input `guard` is
 *  forwarded to `reconcileRepo`; chapter 3's own reconciles pass none
 * @returns {Promise<ReconcileAttempt>} the attempt's outcome
 */
async function performReconcile({ record, dir, args, log, openBrowser, guard }) {
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
  const result = await reconcileRepo({ record: record.github, dir, userToken, guard });
  return { changed: result.changed, commitSha: result.commitSha, hash };
}

/**
 * Whether a build is finished: `stopped` WITH a settled `build_outcome`. `stopped` with
 * `build_outcome: null` is NOT finished, since the spike's capture shows `build_outcome` is
 * written after `status` flips to `stopped`, so those two fields are not a guaranteed atomic write,
 * and a caller that stops on `status` alone can read a one-tick-early snapshot and, downstream,
 * treat an unfinished build as a success (T4c review finding B1). The one predicate both watch
 * paths ask, so the held loop and `pollBuildToStop` can never disagree on what "done" means.
 * @param {{ status?: string, build_outcome?: string | null } | null | undefined} build the build
 *  record as last read, or nothing at all when none has been found yet
 * @returns {boolean} whether the build has reached a terminal status with its outcome settled
 */
function isBuildSettled(build) {
  return Boolean(build) && build.status === 'stopped' && build.build_outcome != null;
}

/**
 * Poll a build until it is settled (`isBuildSettled`), printing a heartbeat every
 * BUILD_POLL_HEARTBEAT_EVERY attempts, or until `maxPollAttempts` elapses first. This is the
 * unheld path's loop; a run holding the console polls the same build through the hold instead, and
 * exactly one of the two ever runs over a given build.
 * @param {{ api: object, buildUuid: string, log: (line: string) => void,
 *  sleepFn: (ms: number) => Promise<void>, pollIntervalMs: number, maxPollAttempts: number }} input
 * @returns {Promise<{ build: object, budgetExceeded: boolean }>} the last-read build record, and
 *  whether the poll gave up before it reached a stopped build with a settled outcome
 */
async function pollBuildToStop({ api, buildUuid, log, sleepFn, pollIntervalMs, maxPollAttempts }) {
  let build = await api.getBuild(buildUuid);
  let attempt = 0;
  while (!isBuildSettled(build)) {
    attempt += 1;
    if (attempt > maxPollAttempts) return { build, budgetExceeded: true };
    if (attempt % BUILD_POLL_HEARTBEAT_EVERY === 0) log(BUILD_POLL_HEARTBEAT_MESSAGE);
    await sleepFn(pollIntervalMs);
    build = await api.getBuild(buildUuid);
  }
  return { build, budgetExceeded: false };
}

/**
 * Matches every C0 and C1 control character except tab and newline, plus DEL. A build log is
 * written by whatever the build ran, and it reaches the admin's terminal, where an escape
 * sequence (an OSC 52 clipboard write, a cursor move) would act rather than print.
 */
const LOG_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

/**
 * Matches the invisible formatting characters (soft hyphen, bidi marks and overrides, zero-width
 * and joiner marks, the BOM) a line could start with to hide a `Next:` from a plain prefix check.
 */
const LOG_INVISIBLE_CHARACTERS = /[\u00ad\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;

/**
 * Reduce a build's logs to the trailing lines a failed-build row carries, reusing catalogue.mjs's
 * `trailingStderr` trim rather than reinventing it: the shape (an array of `[epochMillis,
 * text]` pairs) is different, but the "last few non-empty lines" rule is the same one every other
 * failing-child row in this tool already follows. Control and invisible formatting characters are stripped, and a line
 * starting with `Next:` is dropped, since the row's own next step is read from its first such
 * line and a build could otherwise print one that reads as this tool's instruction.
 * @param {{ lines?: Array<[number, string]> }} logs the build's logs, as `getBuildLogs` returns them
 * @returns {string} the trailing lines, joined back with newlines
 */
function buildLogTail(logs) {
  const lines = Array.isArray(logs?.lines) ? logs.lines.map(([, text]) => String(text)) : [];
  const safe = lines
    .join('\n')
    .replace(LOG_CONTROL_CHARACTERS, '')
    .replace(LOG_INVISIBLE_CHARACTERS, '')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('Next:'));
  return trailingStderr(safe.join('\n'));
}

/**
 * The chapter's closing copy: what changed (push-to-deploy on the default branch) and where to go
 * from here (the site's admin), claiming only what this run itself observed. Does not claim
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
 * Compose the build-watch hold seam for an interactive run, or nothing at all for one the
 * policy refuses (hold-loop.mjs's `shouldHold`: `--yes`, non-TTY, or `CI` never holds;
 * `CAIRN_FORCE_HOLD` is the one override, honored only beside a fake API base). The pacing is
 * chapter 3's `pollIntervalMs`/`maxPollAttempts`, the same pair `pollBuildToStop` already
 * runs on, converted to a duration budget rather than minting a second pair (T4d Task 4a's
 * `createWaitForClear` throws for the `builds` class without one). That one budget now covers the
 * whole watch, discovery and the build together, since they are one wait and one loop.
 *
 * On an interrupt, the loop's `persist` callback saves the build this hold has discovered so
 * far, the one thing a resumed run could not otherwise recover (the observation itself is never
 * saved; the console that rendered it is already gone by the time a later run starts). That path
 * is reached whenever the interrupt lands after discovery, which is most of a real watch: a build
 * is found in seconds and then runs for minutes.
 * @param {object} input
 * @param {{ yes: boolean }} input.runArgs the chapter's parsed flags
 * @param {boolean} input.isTTY whether stdout is a terminal
 * @param {Record<string, string | undefined>} input.env the environment `shouldHold` reads
 * @param {(line: string) => void} input.log receives the console URL line
 * @param {string} input.hop the hop title this hold's console header renders
 * @param {object} input.record the full state record, handed to the console's view as is
 * @param {string} input.siteId the site to persist the discovered build uuid to, on interrupt only
 * @param {string} input.dir the `--dir` value, interpolated into the hold's default park row
 * @param {number} input.pollIntervalMs chapter 3's poll interval, reused verbatim
 * @param {number} input.maxPollAttempts chapter 3's poll budget, converted to a duration
 * @param {typeof createWaitForClear} input.createWaitForClearFn a test seam, defaulting to
 *  hold-loop.mjs's `createWaitForClear`
 * @param {typeof createConsoleServer} input.createConsoleServerFn a test seam, defaulting to the
 *  console module's `createConsoleServer`
 * @returns {((buildUuidKnown: boolean) => (probe: import('../hold-loop.mjs').HoldProbe) =>
 *  Promise<import('../hold-loop.mjs').HoldObservation>) | undefined} a factory `watchAndComplete`
 *  calls once, right at the moment it is about to enter the hold, with whether a build uuid is
 *  already in hand at that instant; `undefined` when this run may not hold. Built as a factory
 *  rather than a plain seam because that instant is not knowable at compose time: a fresh manual
 *  kick (this chapter's `kickBuild` call) can mint a `buildUuid` after this function has
 *  already returned, and the default park printed on an interrupt racing the hold's first probe
 *  must reflect whichever is true right then, not what was true when the run started.
 */
function composeBuildWatchWaitForClear({
  runArgs,
  isTTY,
  env,
  log,
  hop,
  record,
  siteId,
  dir,
  pollIntervalMs,
  maxPollAttempts,
  createWaitForClearFn,
  createConsoleServerFn,
}) {
  if (!shouldHold({ yes: runArgs.yes, isTTY, env })) return undefined;
  const server = createConsoleServerFn({
    chapter: 'Connect to Workers Builds',
    hop,
    record,
    renderView: renderBuildsView,
  });
  return (buildUuidKnown) =>
    createWaitForClearFn({
      holdClass: BUILD_HOLD_CLASS,
      server,
      log,
      pollIntervalMs,
      budgetMs: pollIntervalMs * maxPollAttempts,
      // The row an interrupt lands on before the hold's first probe has returned. With no build
      // uuid in hand yet, that first probe is a discovery read, and the push has happened with no
      // build seen: the same verdict that probe would report itself. With a build uuid already
      // known (a resumed `buildsLastBuildUuid`, or a manual kick that just minted one), that first
      // probe is a `getBuild` instead, and the honest verdict is the catalogue's "still
      // running" row, the exact one a budget-exceeded hold with a build in hand already parks on
      // just below (watchAndComplete's `budgetExceeded` branch); claiming no build exists
      // would contradict the buildUuid this run is about to persist.
      defaultPark: cloudflareError(buildUuidKnown ? 'build-running' : 'build-not-started', { dir }).message,
      persist: (observation) => {
        if (!observation.detail.buildUuid) return undefined;
        return updateSite(siteId, { cloudflare: { buildsLastBuildUuid: observation.detail.buildUuid } });
      },
    });
}

/**
 * Watch one build to a settled outcome: discover it first when its uuid is not yet known, then
 * poll it until `isBuildSettled` holds or the budget runs out. The discovery-and-poll core both
 * chapters share: it writes nothing to the state record and throws nothing on a failed build,
 * so each caller decides which fields to record and which row a settled outcome becomes.
 *
 * THE BUILD-WATCH HOLD (T4d Task 4b). The wait is one wait in two parts: a queue-lag race (a push,
 * or an earlier kick, may not have surfaced on `listBuildsForWorker` yet) followed by the build
 * itself, which is the long part. Absent an injected `waitForClear` this reads the list up to
 * `discoveryAttempts` times (once by default), reports no build when nothing matches, and
 * otherwise polls the build through
 * `pollBuildToStop`. Given one, the hold owns BOTH parts: each probe reads the list while no
 * build is known and `getBuild` once one is, and `cleared` means the build reached a terminal
 * status, never merely that it was found. That is what keeps the console up for the minutes an
 * admin actually has to wait, and what makes the view's queued-to-running-to-outcome cells
 * reachable.
 *
 * ONE LOOP OVER A BUILD, ALWAYS. A held run polls the build through the hold and skips
 * `pollBuildToStop` entirely; an unheld run polls it through `pollBuildToStop` and never enters the
 * hold. Both ask the same `isBuildSettled` predicate, so neither can call a half-written build
 * finished.
 * @param {object} input
 * @param {object} input.api the Cloudflare API client
 * @param {string} input.tag the Worker's tag, which the build list is keyed by
 * @param {string} input.dir the `--dir` value, interpolated into each probe's park row
 * @param {(line: string) => void} input.log receives the heartbeat lines
 * @param {(ms: number) => Promise<void>} input.sleepFn the unheld poll's pacing
 * @param {number} input.pollIntervalMs the unheld poll's interval
 * @param {number} input.maxPollAttempts the unheld poll's budget, in attempts
 * @param {string} [input.buildUuid] the build to watch, when already known; discovery is skipped
 * @param {string} [input.discoveryCommitSha] the commit whose build discovery matches; absent, the
 *  newest build on the Worker is taken
 * @param {boolean} input.needsDiscovery whether to read the build list when no uuid is known
 * @param {(buildUuidKnown: boolean) => (probe: import('../hold-loop.mjs').HoldProbe) =>
 *  Promise<import('../hold-loop.mjs').HoldObservation>} [input.waitForClear] a factory for the
 *  injected hold, called once, right as the hold starts, with whether a build uuid is known then
 * @param {number} [input.discoveryAttempts] how many times an unheld watch reads the build list
 *  before it reports no build; defaults to one read. A caller watching for a push it just made
 *  passes more, since the push reaches Workers Builds through a webhook some seconds later
 * @param {number} [input.discoveryIntervalMs] the pause between those reads; defaults to
 *  `pollIntervalMs`
 * @returns {Promise<{ buildUuid?: string, build?: object, budgetExceeded: boolean }>} the build
 *  found (no `buildUuid` when none was), its settled record, and whether the watch ran out of
 *  budget with that build still unsettled
 */
async function watchBuild({
  api,
  tag,
  dir,
  log,
  sleepFn,
  pollIntervalMs,
  maxPollAttempts,
  buildUuid: knownBuildUuid,
  discoveryCommitSha,
  needsDiscovery,
  waitForClear,
  discoveryAttempts = 1,
  discoveryIntervalMs = pollIntervalMs,
}) {
  let buildUuid = knownBuildUuid;
  // The build as last read, whichever read found it: the discovery list entry carries the same
  // status and outcome fields `getBuild` answers with, so the probe that matches a build does not
  // re-read it, and one probe is always exactly one API read.
  let watched = null;
  let probes = 0;
  const observeBuild = async () => {
    probes += 1;
    if (!buildUuid) {
      const builds = await api.listBuildsForWorker(tag);
      const matched = discoveryCommitSha
        ? builds.find((build) => build.build_trigger_metadata?.commit_hash === discoveryCommitSha)
        : builds[0];
      if (matched) {
        buildUuid = matched.build_uuid;
        watched = matched;
      }
    } else {
      watched = await api.getBuild(buildUuid);
    }
    // The same heartbeat cadence `pollBuildToStop` prints on, so a held run's terminal is no
    // quieter than an unheld one's while the build runs. Discovery itself stays silent: there is
    // no build to say anything about yet.
    if (watched && probes % BUILD_POLL_HEARTBEAT_EVERY === 0) log(BUILD_POLL_HEARTBEAT_MESSAGE);
    return {
      cleared: isBuildSettled(watched),
      detail: {
        buildUuid: buildUuid ?? null,
        status: watched?.status ?? null,
        outcome: watched?.build_outcome ?? null,
        commitSha: watched?.build_trigger_metadata?.commit_hash ?? discoveryCommitSha ?? null,
      },
      // Which park this verdict would be: nothing found yet versus a build still running. The
      // interrupt path prints it, so an interrupted hold reads like the park it interrupted. Both
      // are wait-kind codes with their park page, which is what a console still up renders
      // when the hold ends un-cleared on one of them.
      park: cloudflareError(buildUuid ? 'build-running' : 'build-not-started', { dir }).message,
      parkCode: buildUuid ? 'build-running' : 'build-not-started',
      parkParams: { dir },
    };
  };

  /** The settled build, once either watch path has one. */
  let build;
  let budgetExceeded = false;

  if (waitForClear && (needsDiscovery || buildUuid)) {
    // Built here, not earlier: `buildUuid` may have just been set by a caller's manual kick, which
    // ran after `waitForClear` was composed, so this is the earliest point that instant is known.
    const observation = await waitForClear(Boolean(buildUuid))(observeBuild);
    if (observation.cleared) build = watched;
    // A hold that ran out of budget with a build in hand is the build-running park; one that
    // never found a build at all reports no build.
    else budgetExceeded = Boolean(buildUuid);
  } else if (needsDiscovery) {
    await observeBuild();
    for (let attempt = 1; !buildUuid && attempt < discoveryAttempts; attempt += 1) {
      await sleepFn(discoveryIntervalMs);
      await observeBuild();
    }
  }

  if (!buildUuid) return { budgetExceeded: false };

  if (!build && !budgetExceeded) {
    ({ build, budgetExceeded } = await pollBuildToStop({
      api,
      buildUuid,
      log,
      sleepFn,
      pollIntervalMs,
      maxPollAttempts,
    }));
  }
  return { buildUuid, build, budgetExceeded };
}

/**
 * Throw the row a settled build that did not succeed becomes: `builds-deploy-failed` with its log
 * tail for `fail` or `terminated`, and `builds-not-runnable` for anything else that is not
 * `success`. `success` is the ONLY outcome a caller proceeds on. That catches `skipped` and
 * `cancelled` (the catalogue's builds-not-runnable cases) and, deliberately, anything else: the
 * watch already guarantees `build_outcome` is settled (never null) by this point, so an outcome
 * this code does not recognize is genuinely unexpected, and reading it as success would tell the
 * admin a failed or unrunnable deploy actually succeeded (T4c review finding B1).
 * @param {{ api: object, buildUuid: string, build: { build_outcome?: string | null }, dir: string }} input
 * @returns {Promise<void>} resolves only for a `success` outcome
 */
async function assertBuildSucceeded({ api, buildUuid, build, dir }) {
  if (build.build_outcome === 'fail' || build.build_outcome === 'terminated') {
    const logs = await api.getBuildLogs(buildUuid);
    throw cloudflareError('builds-deploy-failed', {
      dir,
      detail: buildLogTail(logs),
      buildUrl: BUILDS_DASHBOARD_URL,
      logTruncated: Boolean(logs?.cappedAtPageLimit),
    });
  }
  if (build.build_outcome !== 'success') {
    throw cloudflareError('builds-not-runnable', {
      dir,
      outcome: build.build_outcome ?? 'unknown',
      buildUrl: BUILDS_DASHBOARD_URL,
    });
  }
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
 * invariant is one build, not two. The watch itself is `watchBuild`'s; `kickBuild` stays outside
 * it, since a fresh manual kick resolves its `buildUuid` synchronously, which simply means the
 * watch starts at the build rather than at discovery.
 * @param {object} input
 * @param {(buildUuidKnown: boolean) => (probe: import('../hold-loop.mjs').HoldProbe) =>
 *  Promise<import('../hold-loop.mjs').HoldObservation>} [input.waitForClear] a factory for the
 *  injected build watch hold, forwarded to `watchBuild`. Absent it, the watch behaves exactly as
 *  it did before the console existed: one `listBuildsForWorker` read, then today's park or
 *  today's `pollBuildToStop` pass.
 * @param {import('./hostname.mjs').DnsContext} [input.dns] the DNS context forwarded to the
 *  post-success `confirmHostname` re-check; absent-safe (see hostname.mjs's header), so a
 *  caller that passes none gets the conservative `hostname-records-absent` default with no lookup
 *  attempted, never a false claim that a lookup ran and found nothing.
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
  dns = {},
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
      // live, captured in https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-12-t4c-builds-spike.md ("Two shapes captured
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

  const watched = await watchBuild({
    api,
    tag,
    dir,
    log,
    sleepFn,
    pollIntervalMs,
    maxPollAttempts,
    buildUuid,
    discoveryCommitSha,
    needsDiscovery,
    waitForClear,
  });

  // The three parks below are the only returns in this chapter that KEEP the saved token, and only
  // when the main flow reaches them: each leaves `step` short of a terminal one, so a plain re-run
  // resumes this same watch and signs its polls with the same credential. Reached from the
  // builds-live re-entry instead, that record's step never leaves a terminal one, and the re-entry's
  // wrapper deletes the token on every return, including these.
  if (!watched.buildUuid) {
    const err = cloudflareError('build-not-started', { dir });
    log(err.message);
    return { outcome: 'build-not-started', message: err.message };
  }
  buildUuid = watched.buildUuid;
  if (watched.budgetExceeded) {
    await updateSite(siteId, { cloudflare: { buildsLastBuildUuid: buildUuid } });
    const err = cloudflareError('build-running', { dir });
    log(err.message);
    return { outcome: 'build-running', message: err.message };
  }

  const { build } = watched;
  await updateSite(siteId, {
    cloudflare: { buildsLastBuildUuid: buildUuid, buildsLastBuildOutcome: build.build_outcome },
  });
  await assertBuildSucceeded({ api, buildUuid, build, dir });

  const currentOrigin = record?.cloudflare?.domain ?? new URL(record?.cloudflare?.url).host;
  // One confirm on this path, so the resolver line a pinned `live` prints cannot repeat.
  const hostOutcome = await confirmHostname(currentOrigin, fetchImpl, { ...dns, log });
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
 * The guard chapter 2's reconcile passes `reconcileRepo`: refuse the commit when the
 * repository's copy of a tool-owned file differs from this checkout's in anything but the values
 * this tool writes (`maskToolOwnedValues`). `reconcileRepo` uploads each file whole, so on a site
 * Workers Builds has deployed for weeks, committing this checkout's copy could revert an edit made
 * through GitHub. Line endings are compared as `\n`, so a checkout that converts them (git's
 * `core.autocrlf`) does not read as an edit. When the commit proceeds, it prints one line naming
 * each tool-owned value the commit changes in the repository.
 * @param {string} dir the `--dir` value, interpolated into the row
 * @param {(line: string) => void} log receives the line naming the changed values
 * @returns {(files: Array<{ path: string, remote: string | null, local: string }>) => void} the
 *  guard, which throws `builds-config-diverged` naming each diverged file
 */
export function refuseRepositoryEdits(dir, log) {
  /** @param {string} text */
  const comparable = (text) => maskToolOwnedValues(text.replace(/\r\n/g, '\n'));
  return (files) => {
    const diverged = files
      .filter(({ remote, local }) => remote === null || comparable(remote) !== comparable(local))
      .map((file) => file.path);
    if (diverged.length > 0) throw cloudflareError('builds-config-diverged', { dir, files: diverged });

    const changes = [];
    for (const { path: filePath, remote, local } of files) {
      const before = readToolOwnedValues(/** @type {string} */ (remote));
      for (const [name, value] of Object.entries(readToolOwnedValues(local))) {
        if (before[name] !== value) changes.push(`${name} in ${filePath} to ${value}`);
      }
    }
    if (changes.length > 0) log(`This commit changes ${changes.join(', and ')} in your repository.`);
  };
}

/**
 * @typedef {object} BuildsDeployResult
 * @property {Error & { catalogue: object }} [parked] a wait-kind row already printed: the `--yes`
 *  reconcile park (nothing committed), or, once the commit landed, a build not found yet or still
 *  running when the watch's budget ran out
 * @property {boolean} [deployed] true once a watched build of this config succeeded, false when
 *  the repository and the last Builds deploy already carried it and nothing ran
 */

/**
 * Chapter 2's one hop on a site Workers Builds deploys, in place of a local build and deploy:
 * commit the two tool-owned files through the reconcile (guarded by `refuseRepositoryEdits`),
 * record `cloudflare.buildsReconciledHash` and the commit's sha (`buildsPendingCommitSha`) as
 * soon as the commit lands, then find the build for that commit and watch it to a settled
 * outcome. On a watched `success` it records `cloudflare.buildsDeployedHash`, the hash that build
 * deployed, and clears the commit's sha. When the reconcile commits nothing (the hash gate, or a
 * repository that already matches) and `buildsDeployedHash` differs from the current hash, it
 * watches the recorded commit's build or kicks one (`findOrKickBuild`), which is what finishes a
 * run that stopped after its commit landed; when they are equal, nothing deploys. Writes no
 * `step`, deletes no token, checks no host, and records none of chapter 3's build fields.
 * @param {object} input
 * @param {string} input.siteId the site whose record is read fresh and written to
 * @param {string} input.dir the scaffold root
 * @param {{ yes: boolean }} input.args the run's flags; `yes` parks the reconcile's sign-in
 * @param {(line: string) => void} input.log receives each printed line
 * @param {(url: string, log: (line: string) => void) => Promise<void>} input.openBrowser opens the
 *  reconcile's sign-in page
 * @param {object} input.api the Cloudflare API client, signed with a token carrying the Builds keys
 * @param {() => void} [input.onLanded] called once the repository carries this checkout's config
 *  (the commit landed, or nothing needed committing), before any build is kicked or watched
 * @param {(ms: number) => Promise<void>} [input.sleepFn] the watch's pacing
 * @param {number} [input.pollIntervalMs] the watch's poll interval
 * @param {number} [input.maxPollAttempts] the watch's poll budget, in attempts
 * @param {number} [input.maxDiscoveryAttempts] how many times, `pollIntervalMs` apart, the build
 *  list is read for a just-landed commit's push build before the hop parks at `build-not-started`
 * @returns {Promise<BuildsDeployResult>} the hop's result; a failed or unrunnable build throws
 */
export async function deployConfigThroughBuilds({
  siteId,
  dir,
  args,
  log,
  openBrowser,
  api,
  onLanded,
  sleepFn = defaultSleep,
  pollIntervalMs = DEFAULT_BUILD_POLL_INTERVAL_MS,
  maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
  maxDiscoveryAttempts = DEFAULT_MAX_DISCOVERY_ATTEMPTS,
}) {
  // Read fresh: an earlier hop in the same run may already have recorded a reconcile.
  const record = await loadSite(siteId);
  const reconcileResult = await performReconcile({
    record,
    dir,
    args,
    log,
    openBrowser,
    guard: refuseRepositoryEdits(dir, log),
  });
  if (reconcileResult.parked) return { parked: reconcileResult.parked };

  // First, so a failed state write below cannot leave a caller believing nothing landed.
  onLanded?.();
  const { hash } = reconcileResult;
  if (reconcileResult.changed) {
    await updateSite(siteId, {
      cloudflare: {
        buildsReconciledHash: hash,
        buildsPendingCommitSha: reconcileResult.commitSha,
        buildsPendingHash: hash,
      },
    });
  } else if (hash !== record.cloudflare?.buildsReconciledHash) {
    await updateSite(siteId, { cloudflare: { buildsReconciledHash: hash } });
  }

  const tag = await resolveWorkerTag(api, dir, 'nothing to watch');
  let buildUuid;
  if (!reconcileResult.changed) {
    if (record.cloudflare?.buildsDeployedHash === hash) return { deployed: false };
    buildUuid = await findOrKickBuild({ api, tag, record, hash });
  }

  const watched = await watchBuild({
    api,
    tag,
    dir,
    log,
    sleepFn,
    pollIntervalMs,
    maxPollAttempts,
    buildUuid,
    discoveryCommitSha: reconcileResult.changed ? reconcileResult.commitSha : undefined,
    needsDiscovery: Boolean(reconcileResult.changed),
    discoveryAttempts: maxDiscoveryAttempts,
  });
  if (!watched.buildUuid || watched.budgetExceeded) {
    const parked = cloudflareError(watched.buildUuid ? 'build-running' : 'build-not-started', { dir });
    log(parked.message);
    return { parked };
  }
  await assertBuildSucceeded({ api, buildUuid: watched.buildUuid, build: watched.build, dir });
  await updateSite(siteId, {
    cloudflare: { buildsDeployedHash: hash, buildsPendingCommitSha: undefined, buildsPendingHash: undefined },
  });
  return { deployed: true };
}

/**
 * The build a re-run of `deployConfigThroughBuilds` watches when its reconcile committed nothing
 * and the last watched deploy was of other config. When an earlier run's commit of this same
 * config is recorded (`cloudflare.buildsPendingCommitSha`, saved beside the hash it committed,
 * `buildsPendingHash`), its
 * push build is looked up by commit and reused while it is queued, running, or succeeded, so a
 * re-run after a park never starts a second build of one commit. Otherwise (no recorded commit,
 * no build for it, or one that failed or did not run) one build is kicked on the trigger's branch.
 * @param {{ api: object, tag: string, record: object, hash: string }} input `record` is the state
 *  record as this hop read it, and `hash` the current config hash
 * @returns {Promise<string>} the uuid of the build to watch
 */
async function findOrKickBuild({ api, tag, record, hash }) {
  const pendingSha = hash === record.cloudflare?.buildsPendingHash ? record.cloudflare?.buildsPendingCommitSha : undefined;
  const triggerUuid = record.cloudflare?.buildsTriggerUuid;
  if (pendingSha) {
    const builds = await api.listBuildsForWorker(tag);
    const existing = builds.find((build) => {
      const metadata = build.build_trigger_metadata;
      const buildTrigger = metadata?.build_trigger_uuid;
      return metadata?.commit_hash === pendingSha && (!buildTrigger || !triggerUuid || buildTrigger === triggerUuid);
    });
    if (existing && (!isBuildSettled(existing) || existing.build_outcome === 'success')) {
      return existing.build_uuid;
    }
  }

  // A record saved without the repository's default branch still has the branch on its trigger.
  const branch =
    record.github?.repo?.defaultBranch ??
    (await api.listBuildTriggers(tag)).find((trigger) => trigger.trigger_uuid === triggerUuid)?.branch_includes?.[0];
  // A trigger's branch pattern is not a branch a manual kick can build.
  if (typeof branch === 'string' && branch.includes('*')) {
    throw new Error(
      `The build trigger watches the branch pattern ${branch}, so this tool cannot tell which branch to build.`,
    );
  }
  const kicked = await api.kickBuild(triggerUuid, branch);
  return kicked.build_uuid;
}

/**
 * Make one cheap Workers Builds read (the trigger list for this site's Worker) so a token missing
 * the Builds permission fails as `token-scope-missing` before anything is committed, rather than
 * after a commit has landed with no way to watch its build.
 * @param {object} api the Cloudflare API client to check
 * @param {string} dir the scaffold root
 * @returns {Promise<void>} resolves once the read succeeded
 */
export async function assertBuildsReachable(api, dir) {
  await api.listBuildTriggers(await resolveWorkerTag(api, dir, 'nothing to deploy through'));
}

/**
 * The admission copy: what this chapter needs (the App authorization, a fresh token paste, a
 * build token on an account without one, one later sign-in click), who can read the build token,
 * and what it costs (nothing new). The free-tier figures carry the date they were verified, per
 * the standing cost-copy rule every other admission in this tool follows.
 */
const ADMISSION_DETAIL =
  "Connects this repository to Cloudflare Workers Builds, so every commit to your default " +
  'branch deploys itself, no laptop required. This needs a one-time authorization of ' +
  'Cloudflare\'s "Workers and Pages" GitHub App on your account (if you have not already done ' +
  'this), a fresh Cloudflare API token pasted the same way chapter 2 asked for one, and one ' +
  'sign-in click later in this chapter, when it commits its config changes back to your ' +
  'repository. If your Cloudflare account has no Workers Builds build token yet, it also asks ' +
  'for one: a second, narrow token named cairn-build that can only deploy Workers and edit D1 ' +
  'and R2, which later sites on this account reuse. Limit it to this one Cloudflare account ' +
  'under Account Resources, not all accounts. Cloudflare keeps its secret and gives it to ' +
  'every build that deploys with it, so treat anyone who can commit to your default branch as ' +
  "able to read it. It costs no money: Workers Builds' free tier includes 3,000 build minutes a " +
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
 *  the caller; `null` under --dry-run, chapter 1 and chapter 2's `dryRun ? null` precedent
 * @property {string} dir the scaffolded directory, used in printed copy and read for the local
 *  Worker name
 * @property {{ yes: boolean, connect?: boolean }} args the parsed CLI flags this chapter reads:
 *  `yes` for an unattended run, `connect` for an explicit `--connect` re-entry (the only thing
 *  that admits a `builds-connect-declined` record back into admission; see the module doc below)
 * @property {(line: string) => void} log receives one printed line per call
 * @property {boolean} dryRun when true, every hop's title and detail print and nothing executes
 * @property {(url: string, log: (line: string) => void) => Promise<void>} [openBrowser] opens the
 *  admin's browser to either token's create-token page; defaults to open.mjs's opener
 * @property {typeof clackConfirm} [confirm] the yes/no prompt; a test seam, defaulting to
 *  @clack/prompts'
 * @property {typeof clackSelect} [select] the account picker prompt `ensureAccountId` uses; the
 *  same kind of test seam as `confirm`
 * @property {(message: string) => Promise<string>} [promptSecretFn] the token paste prompt,
 *  forwarded to `ensureApiToken` and `ensureBuildToken`; a test seam defaulting to prompts.mjs's
 *  `promptSecret`
 * @property {typeof makeApi} [makeApiFn] builds the Cloudflare API client, for the setup token and
 *  for the build token's verify call; a test seam defaulting to api.mjs's `makeApi`
 * @property {Record<string, string | undefined>} [env] the environment `CAIRN_CF_API_TOKEN` and
 *  `CAIRN_CF_BUILD_TOKEN` are read from under `yes`; defaults to `process.env`, injected in tests
 * @property {string[]} [argv] the argument vector scanned for a mistakenly-passed token; defaults
 *  to `process.argv.slice(2)`, injected in tests
 * @property {(ms: number) => Promise<void>} [sleepFn] the build watch's pacing; a test seam
 *  defaulting to a real timer-based sleep
 * @property {typeof fetch} [fetchImpl] the fetch implementation the live-hostname confirm probes
 *  with; defaults to the global `fetch`, overridden in tests
 * @property {(servers?: string[]) => object} [resolve] the resolver factory forwarded to the
 *  build watch's post-success hostname confirm (`hostname.mjs`'s `diagnoseUnreachable`, the same
 *  unreachable-case diagnosis chapter 2's cutover uses); a test seam, defaulting to `dns.mjs`'s
 *  `defaultResolve`
 * @property {number} [pollIntervalMs] the build watch's poll interval; defaults to five seconds
 * @property {number} [maxPollAttempts] the build watch's poll budget, in attempts; defaults to 180
 *  (fifteen minutes at the default interval, comfortably under Cloudflare's 20-minute timeout)
 * @property {boolean} [isTTY] whether stdout is a terminal, read by `shouldHold` to decide
 *  whether the build-watch hold may hold; defaults to `process.stdout.isTTY`
 * @property {typeof createWaitForClear} [createWaitForClearFn] builds the build-watch hold's seam;
 *  a test seam defaulting to hold-loop.mjs's `createWaitForClear`
 * @property {typeof createConsoleServer} [createConsoleServerFn] builds the console the hold
 *  serves through; a test seam defaulting to the console module's `createConsoleServer`
 */

/**
 * Run chapter 3: admission, the Cloudflare token, connecting the repository to Workers Builds,
 * binding a trigger to the site's Worker, reconciling its deploy config into the repository,
 * and watching the first Builds deploy to success. Re-entry reads the step already reached on
 * `record`: a plain re-entry (no `--connect`) at `builds-connect-declined` short-circuits at the
 * top (the token is cleared again, in case an earlier run somehow left one behind, and the
 * decline is reported back unchanged), while an explicit `--connect` there is the declining
 * owner's way back in (the catalogue row's copy) and falls through into the normal
 * admission below instead, the same as any other `--connect` entry step; `builds-live` is not a
 * no-op (ruling 4) and re-runs only the reconcile check, reporting "nothing
 * to reconcile" when the local config has not drifted since the last one and, when it has,
 * re-running the token prefill (the saved token was already deleted at that terminal step) to watch
 * the build the fresh commit triggers. A saved `cloudflare.buildsTokenSavedAt` or a step already in
 * CHAPTER3_RESUMABLE_STEPS means this chapter's admission has already run and is not re-asked;
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
 *  catalogue rows and CHAPTER3_TERMINAL_STEPS/CHAPTER3_RESUMABLE_STEPS for the full set
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
  resolve = defaultResolve,
  pollIntervalMs = DEFAULT_BUILD_POLL_INTERVAL_MS,
  maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
  isTTY = Boolean(process.stdout.isTTY),
  createWaitForClearFn = createWaitForClear,
  createConsoleServerFn = createConsoleServer,
}) {
  const frame = { dryRun, log };

  // The zone's nameservers, saved by chapter 2, let the post-success hostname confirm's
  // unreachable-case diagnosis skip a fresh NS discovery lookup (dns.mjs's
  // `selectAuthoritativeResolver`). Both watch call sites below hand `watchAndComplete` this same
  // context.
  const dns = { resolve, nameServers: record?.cloudflare?.nameServers };

  /**
   * Compose the build-watch hold for one hop, with this run's shape and seams filled in. Both
   * watch call sites below go through here, so neither can drift from the other on what the hold
   * is given; only the hop title differs between them.
   * @param {string} hop the hop title this hold's console header renders
   * @returns {((buildUuidKnown: boolean) => (probe: import('../hold-loop.mjs').HoldProbe) =>
   *  Promise<import('../hold-loop.mjs').HoldObservation>) | undefined} the factory
   *  `watchAndComplete` calls, or `undefined` when this run may not hold
   */
  function buildWatchHold(hop) {
    return composeBuildWatchWaitForClear({
      runArgs: args,
      isTTY,
      env,
      log,
      hop,
      record,
      siteId,
      dir,
      pollIntervalMs,
      maxPollAttempts,
      createWaitForClearFn,
      createConsoleServerFn,
    });
  }

  /**
   * Collect this chapter's six-key setup token and record it under `cloudflare.apiToken`
   * alongside `buildsTokenSavedAt`, the chapter-3-owned marker saying this chapter is the one
   * that saved what is now on the record. Both of this chapter's token hops (the main flow's and
   * the builds-live re-entry's) run through here, so neither can drift from the other on which
   * saved token may be reused.
   * @param {boolean} offerSaved whether the record's saved token may be offered back to
   *  `ensureApiToken`. True only when `buildsTokenSavedAt` proves this chapter saved the token now
   *  on the record; anything else (a five-key chapter-2 token, or a builds-live record still
   *  carrying the marker after its token was deleted at that terminal step) is withheld, so the
   *  six-key prefill actually opens.
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
        await updateSite(siteId, {
          cloudflare: {
            buildsReconciledHash: reconcileResult.hash,
            buildsPendingCommitSha: undefined,
            buildsPendingHash: undefined,
          },
        });
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
          // Never the record as saved: reaching builds-live deleted this chapter's token, so
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
          dns,
          waitForClear: buildWatchHold('Watch the build your update triggered'),
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
  // it only at its terminal steps, so a record at `domain-live` or `email-onboarded` reaches
  // here still carrying a five-key chapter-2 token. Reading that as "chapter 3 already ran" skipped
  // this chapter's consent, its cost statement, and its six-key prefill, and then 403'd on the
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

  // Wrapped in one try/catch from the token hop onward (mirroring chapter2.mjs's T4b.1
  // half): a token-scope-missing or token-invalid failure anywhere below clears the saved token
  // before the error surfaces, so the re-run the row already tells the admin to do actually
  // re-collects one instead of silently reusing the bad one. A refused build token is
  // build-token-invalid instead, which keeps the saved token: that one was fine.
  try {
    await runStep(
      frame,
      'Get a fresh Cloudflare API token',
      'Uses the token this chapter saved on an earlier run, if there is one. Otherwise it opens ' +
        "Cloudflare's create-token page with the permissions this chapter needs already " +
        'filled in (the same five chapter 2 already asked for, plus Workers Builds), and asks ' +
        'you to paste the token back.',
      async () => {
        // A saved token is offered back to `ensureApiToken` only when this chapter is the one
        // that saved it; anything else is withheld, so the six-key prefill actually opens.
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
          "builds and deploys automatically. Reuses your account's cairn-build token, or asks " +
          'you for one when there is none.',
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

          // Reuse matches by name alone. Builds accepts two registrations under one name and
          // reports no creation time, so the newest is the last in list order. A registration
          // whose token was deleted lists unchanged, so reuse cannot tell it is dead: that
          // trigger's first build fails inside the watch below. Nothing here ever deletes a
          // registration.
          // WATCH: register an account-owned token instead once Workers Builds accepts one; its
          // API reference says "Account-scoped tokens are not supported". The release gate reuses
          // its account's cairn-build registration once one exists, so it meets the collect path
          // below live only on a run against an account without one; the unit tests carry it.
          const registrations = await api.getBuildTokens();
          let buildTokenUuid = registrations.findLast(
            (candidate) => candidate.build_token_name === BUILD_TOKEN_NAME,
          )?.build_token_uuid;
          if (!buildTokenUuid) {
            const buildToken = await ensureBuildToken({
              dir,
              accountId,
              log,
              openBrowser,
              yes: args.yes,
              promptSecretFn,
              env,
              argv,
              makeApiFn,
            });
            // The setup token verifies as active too, but registering it would hand every build
            // its zone, DNS, and email reach, which the narrow token exists to keep out of builds.
            if (buildToken.token === token) {
              throw cloudflareError('build-token-invalid', { dir, yes: args.yes, setupToken: true });
            }
            const createdToken = await api.createBuildToken({
              name: BUILD_TOKEN_NAME,
              secret: buildToken.token,
              cloudflareTokenId: buildToken.id,
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
      // this row asks for is an interactive one, which collects a token.
      await deleteApiToken(siteId);
      return { outcome: reconcileResult.parked.catalogue.code, message: reconcileResult.parked.message };
    }
    if (!dryRun) {
      await updateSite(siteId, {
        step: 'config-reconciled',
        cloudflare: {
          buildsReconciledHash: reconcileResult.hash,
          buildsPendingCommitSha: undefined,
          buildsPendingHash: undefined,
        },
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
        dns,
        waitForClear: buildWatchHold('Watch your first Workers Builds deploy'),
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

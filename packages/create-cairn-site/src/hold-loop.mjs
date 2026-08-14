// The hold loop: the one place a wait is HELD in process rather than parked. Two wait classes
// qualify, both measured on a live run: hostname propagation (a resolver negative cache that
// cleared on its own, 27 minutes, while the zone's own nameservers had served the record the
// whole time) and the Builds watch (queue lag plus build). Every other wait, the registrar
// delegation wait above all, stays a true park; a wait measured in hours is not a wait a laptop
// should sit on.
//
// HOLDING IS A CONTRACT CHANGE AT TWO NAMED SEAMS, NOT A WRAPPER. A caller opts in by passing an
// injected `waitForClear(probe)` into `cutOverHostname` (this module's `createWaitForClear` is
// what builds one) or into chapter 3's build watch. Absent that injection, both callers behave
// exactly as they did before this module existed: one probe, then today's park. That default is
// what keeps every other caller and test untouched.
//
// THE GATE LIVES IN THE CALLER, NOT HERE. A chapter composes a `waitForClear` only for an
// interactive run, which is what `shouldHold` decides; this module holds whenever it is called.
// Keeping the policy separate from the loop is deliberate: the loop is an orchestration
// primitive, and a Go port of it should be able to take the same three inputs (probe, budget,
// console handle) without inheriting a terminal's notion of interactivity.
//
// ONE PROBE OWNER. This loop polls; the console renders the loop's last observation and never
// issues an API or DNS call of its own. The observation is the whole handoff between them, which
// is why its shape is a stated contract (`HoldObservation`) with an exported factory rather than
// an object literal built at each site.

/** The propagation hold's class name, the key both the observation and the display cadence use. */
export const PROPAGATION_HOLD_CLASS = 'propagation';

/** The Builds hold's class name. */
export const BUILD_HOLD_CLASS = 'builds';

/**
 * How long the propagation hold may run before it falls back to today's park. Chosen against the
 * 27-minute resolver lag a live run measured, with room over it.
 */
export const PROPAGATION_BUDGET_MS = 40 * 60 * 1000;

/** How long the propagation hold waits between marker probes. */
export const PROPAGATION_POLL_INTERVAL_MS = 30 * 1000;

/**
 * How often each class's console view refreshes itself, in seconds. This is a DISPLAY cadence and
 * is deliberately decoupled from the poll interval above: the console renders whatever the loop
 * last observed, so how often a browser re-reads that observation is a reading-comfort decision,
 * not a rate limit on the platform. Two numbers that happen to coincide today must not be
 * collapsed into one constant.
 */
export const DISPLAY_REFRESH_SECONDS = Object.freeze({
  [PROPAGATION_HOLD_CLASS]: 30,
  [BUILD_HOLD_CLASS]: 5,
});

/**
 * The timestamp `makeObservation` fills in when a caller supplies none. A fixed instant, so a
 * fixture built from this factory renders the same bytes on every run.
 */
export const SAMPLE_OBSERVED_AT = Date.parse('2026-08-13T18:00:00.000Z');

/** The environment variables whose presence marks a run pointed at fakes rather than a platform. */
const FAKE_API_BASE_VARS = ['CAIRN_CLOUDFLARE_API_BASE', 'CAIRN_GITHUB_API_BASE'];

/**
 * Per-class detail defaults. A field a probe has not learned yet reads `null` rather than being
 * absent, so a console view can render "not read yet" without asking whether the key exists.
 */
const DETAIL_DEFAULTS = {
  [PROPAGATION_HOLD_CLASS]: {
    authoritative: null,
    recursive: null,
    lowConfidence: false,
    markerOutcome: null,
  },
  [BUILD_HOLD_CLASS]: { buildUuid: null, status: null, outcome: null, commitSha: null },
};

/** Each class's own pacing. `null` means the class has no default and its caller must supply one. */
const CLASS_DEFAULTS = {
  [PROPAGATION_HOLD_CLASS]: {
    pollIntervalMs: PROPAGATION_POLL_INTERVAL_MS,
    budgetMs: PROPAGATION_BUDGET_MS,
  },
  // The Builds class reuses chapter 3's own poll interval and budget rather than minting a second
  // pair that could drift from the ones its `pollBuildToStop` already runs on.
  [BUILD_HOLD_CLASS]: { pollIntervalMs: null, budgetMs: null },
};

/**
 * @typedef {object} PropagationDetail
 * @property {unknown[] | null} authoritative the apex answer read against the zone's own
 *  nameservers, or `null` when no DNS lookup was attempted at all
 * @property {unknown[] | null} recursive the same answer read through the ordinary recursive
 *  resolver, or `null` when no DNS lookup was attempted at all
 * @property {boolean} lowConfidence whether the authoritative read fell back to the recursive
 *  resolver, so its answer is not authoritative evidence
 * @property {string | null} markerOutcome the catalogue code the marker probe concluded, or
 *  `'live'`; the marker pair stays the sole authority for `live`, whatever DNS shows
 */

/**
 * @typedef {object} BuildsDetail
 * @property {string | null} buildUuid the build this hold discovered, once it exists
 * @property {string | null} status the build's own status field, as the platform reports it
 * @property {string | null} outcome the build's settled outcome, once it has one
 * @property {string | null} commitSha the commit the discovered build matched
 */

/**
 * @typedef {object} HoldObservation
 * @property {string} class which hold class produced this observation
 * @property {number} at when the observation was taken, epoch milliseconds
 * @property {boolean} cleared whether this observation is the one that ends the hold
 * @property {number} attempt the 1-based probe number this observation came from
 * @property {PropagationDetail | BuildsDetail} detail the class-specific reading
 */

/**
 * @callback HoldProbe
 * @returns {Promise<{ cleared: boolean, detail: object, park?: string, parkCode?: string,
 *  parkParams?: Record<string, string | string[] | boolean> }>} `cleared` ends the hold; `detail`
 *  is merged over the class defaults; `park` is the exact printed row this verdict would park
 *  with, which the interrupt path prints so an interrupted hold reads like today's park;
 *  `parkCode`/`parkParams` are the same verdict's catalogue code and params, present only when the
 *  code has its own park page (a wait-kind code, never one a caller is about to throw), and are
 *  what a console still up when the hold ends un-cleared renders through its own grace window
 */

/**
 * @typedef {object} ConsoleServerHandle
 * @property {(observation: HoldObservation) => Promise<{ url?: string } | void>} start bring the
 *  console up; the returned `url` is what the loop prints. Called at most once per hold, and only
 *  once a probe has failed to clear, since a wait that is already over is not a wait to watch.
 *  A rejection degrades the hold to running without a console rather than failing the wait
 * @property {(observation: HoldObservation) => void} [update] hand the console each later
 *  observation; the console never probes for itself
 * @property {(park?: { code: string, params: Record<string, string | string[] | boolean> }) =>
 *  Promise<void>} stop shut the console down. The exit render and the park page, and both of
 *  their grace windows, belong to the handle, not to this loop; this loop only forwards the last
 *  probe's `parkCode`/`parkParams`, when it had any, as `park`
 */

/**
 * Build an observation, filling the envelope and the class's own detail defaults. The loop builds
 * its real observations through this same factory, so a console fixture and a live observation
 * can never drift apart in shape.
 * @param {string} holdClass which hold class the observation belongs to
 * @param {{ at?: number, cleared?: boolean, attempt?: number, detail?: object }} [overrides] the
 *  fields to set; `detail` is merged over the class defaults, never replacing them
 * @returns {HoldObservation} the frozen observation
 */
export function makeObservation(holdClass, overrides = {}) {
  const defaults = DETAIL_DEFAULTS[holdClass];
  if (!defaults) {
    throw new Error(`makeObservation: unknown hold class ${JSON.stringify(holdClass)}`);
  }
  const { at = SAMPLE_OBSERVED_AT, cleared = false, attempt = 0, detail = {} } = overrides;
  return Object.freeze({
    class: holdClass,
    at,
    cleared,
    attempt,
    detail: Object.freeze({ ...defaults, ...detail }),
  });
}

/**
 * The one line a hold prints to the terminal. Exported so the console's own tests, the child
 * process test's line reader, and the chapters all name the same line rather than three
 * near-copies of it.
 * @param {string} url the console's base URL, secret prefix included
 * @returns {string} the printed line
 */
export function consoleUrlLine(url) {
  return `Watch progress at ${url} (this page is served only while this run is going).`;
}

/**
 * Decide whether this run may hold. The gate is the caller's, and this is the caller's rule: hold
 * only when an admin is actually watching a terminal. `CAIRN_FORCE_HOLD` exists for the two
 * integration proofs, which run as spawned children and so are non-TTY by construction; it is
 * honored only beside a fake API base, so setting it against the real platform changes nothing.
 * @param {{ yes: boolean, isTTY: boolean, env: Record<string, string | undefined> }} run the
 *  run's own shape: its `--yes` flag, whether stdout is a TTY, and the environment
 * @returns {boolean} whether the caller should compose a `waitForClear`
 */
export function shouldHold({ yes, isTTY, env = {} }) {
  const forced = env.CAIRN_FORCE_HOLD === '1';
  const againstFakes = FAKE_API_BASE_VARS.some((name) => Boolean(env[name]));
  if (forced && againstFakes) return true;
  return !yes && Boolean(isTTY) && !env.CI;
}

/**
 * Sleep for the given duration; the hold's default pacing, overridden by a test's own `sleepFn`.
 * @param {number} ms milliseconds to wait
 * @returns {Promise<void>} resolves after `ms` milliseconds
 */
function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}

/**
 * Run one hold to its end: clear, budget expiry, or interrupt.
 * @param {object} config the resolved hold configuration (see `createWaitForClear`)
 * @returns {Promise<HoldObservation | null>} the last observation taken, or `null` when an
 *  interrupt ended the hold before the first probe returned. No caller reads that `null` in
 *  production, since the interrupt path exits the process before this resolves; it exists for a
 *  test that injects its own `exit`
 */
async function runHold(config) {
  const { holdClass, probe, server, log, persist, pollIntervalMs, budgetMs } = config;
  const { sleepFn, now, signals, exit, defaultPark } = config;

  const startedAt = now();
  let attempt = 0;
  let observation = null;
  // The park row an interrupt prints, replaced by each probe's own verdict as one arrives. It
  // starts at the class default because the interrupt is raced against the probe itself: a signal
  // landing during the FIRST probe (the widest window in practice, since that probe is the one
  // that waits on a domain that does not resolve yet) has no verdict of its own to print, and an
  // admin who pressed Ctrl-C is owed the same row an expired hold would have left them.
  let park = defaultPark;
  // The last probe's park page, forwarded to `server.stop` so a console still up when the hold
  // ends un-cleared (expiry, interrupt, or a park-class outcome surfacing mid-hold) renders that
  // page through its grace window rather than closing at once. `server.stop` itself decides
  // priority between this and a cleared observation's exit render, so this loop never checks
  // `observation.cleared` before forwarding it.
  let parkPage;
  let serverStarted = false;
  let serverStopped = false;
  // Set once a console bind fails, so the loop never retries a listener that is not going to
  // come up (a port collision or a sandboxed environment forbidding a listen socket does not
  // resolve itself between polls) and logs the degradation exactly once.
  let serverDisabled = false;

  const stopServer = async () => {
    if (!serverStarted || serverStopped) return;
    serverStopped = true;
    await server.stop(parkPage);
  };

  // The interrupt is raced against both the sleep AND the probe itself, rather than polled for,
  // so a signal ends the hold at once instead of at the next poll boundary. A probe (a DNS lookup,
  // an API read) can run for many seconds; without racing it too, the handler installed below
  // would only be acted on once that in-flight probe finally settled, which is worse than no
  // handler at all, since installing it also suppresses Node's own terminate-on-Ctrl-C. Handlers
  // are added with `on`, not by clearing the signal's listeners: any listener already installed
  // keeps running, and removing exactly the handler added here restores the disposition the
  // process had before the hold.
  let markInterrupted;
  let interrupted = false;
  const interruptArrived = new Promise((resolve) => {
    markInterrupted = resolve;
  });
  const onSignal = () => {
    interrupted = true;
    markInterrupted();
  };
  signals.on('SIGINT', onSignal);
  signals.on('SIGTERM', onSignal);

  // Nothing else runs after this: the caller never regains control, so the loop itself does what
  // the caller's park path would have done, in that order.
  const handleInterrupt = async () => {
    await stopServer();
    // No completed probe means nothing was learned, so there is nothing to save; a persist reads
    // the observation's own detail (chapter 3's saves the discovered build uuid from it), and an
    // absent observation is not a shape every caller's persist should have to defend against.
    if (persist && observation) await persist(observation);
    if (park) log(park);
    exit(0);
  };

  try {
    for (;;) {
      attempt += 1;
      // Two settlement shapes rather than a bare rejection: a probe that throws must still
      // propagate today (rethrown below), but a probe still pending when the interrupt wins the
      // race is abandoned, and its eventual settlement (including a rejection) must never surface
      // as an unhandled rejection once the loop has already moved on.
      const raced = probe().then(
        (result) => ({ result }),
        (error) => ({ error }),
      );
      const probeOutcome = await Promise.race([
        raced,
        interruptArrived.then(() => ({ interrupted: true })),
      ]);
      if (probeOutcome.interrupted) {
        await handleInterrupt();
        return observation;
      }
      if (probeOutcome.error) throw probeOutcome.error;
      const result = probeOutcome.result;

      observation = makeObservation(holdClass, {
        at: now(),
        cleared: Boolean(result.cleared),
        attempt,
        detail: result.detail,
      });
      park = result.park;
      parkPage = result.parkCode ? { code: result.parkCode, params: result.parkParams } : undefined;
      if (serverStarted) server.update?.(observation);

      if (observation.cleared) return observation;
      // Expiry hands the last observation straight back, so the caller reports the same park row
      // it would have reported without any hold at all.
      if (now() - startedAt >= budgetMs) return observation;

      if (server && !serverStarted && !serverDisabled) {
        try {
          const started = await server.start(observation);
          serverStarted = true;
          if (started?.url) log(consoleUrlLine(started.url));
        } catch (error) {
          // The console is an enhancement layered onto a wait that worked fine without it; a
          // bind failure must degrade to today's behavior rather than crash a run that would
          // otherwise have succeeded.
          serverDisabled = true;
          log(`Console unavailable, continuing without it: ${error.message}`);
        }
      }

      await Promise.race([sleepFn(pollIntervalMs), interruptArrived]);
      if (interrupted) {
        await handleInterrupt();
        return observation;
      }
    }
  } finally {
    signals.off('SIGINT', onSignal);
    signals.off('SIGTERM', onSignal);
    await stopServer();
  }
}

/**
 * Build the `waitForClear(probe)` a seam takes. The returned function holds until the probe
 * clears, the class budget runs out, or an interrupt arrives, and answers with the last
 * observation either way; a caller reads `detail` to decide what to do next and never has to know
 * which of the three ended the hold.
 * @param {object} options
 * @param {string} options.holdClass which hold class this seam is
 * @param {ConsoleServerHandle} [options.server] the console server handle; without one the hold
 *  still polls, it is simply not watchable
 * @param {(line: string) => void} [options.log] receives the console URL line, and the park row on
 *  an interrupt
 * @param {(observation: HoldObservation) => Promise<void>} [options.persist] save what the loop
 *  learned; called on the interrupt path only, since every other path returns to a caller that
 *  does its own saving, and never before a probe has produced an observation to save
 * @param {string} [options.defaultPark] this class's own default park row, printed when an
 *  interrupt arrives before any probe has returned a verdict of its own. It belongs to the caller
 *  composing the seam, the one place that knows both the class's earliest honest verdict and the
 *  run's own catalogue params; this module holds no catalogue knowledge. It carries no park PAGE,
 *  since the console starts only after a probe has already failed to clear
 * @param {number} [options.pollIntervalMs] the wait between probes; required for the Builds class
 * @param {number} [options.budgetMs] how long the hold may run; required for the Builds class
 * @param {(ms: number) => Promise<void>} [options.sleepFn] the sleep, overridden in tests
 * @param {() => number} [options.now] the clock, overridden in tests
 * @param {{ on: Function, off: Function }} [options.signals] the signal source, `process` in
 *  production and an emitter in tests
 * @param {(code: number) => void} [options.exit] how the interrupt path ends the run
 * @returns {(probe: HoldProbe) => Promise<HoldObservation>} the seam's `waitForClear`
 */
export function createWaitForClear({
  holdClass,
  server,
  log = () => {},
  persist,
  defaultPark,
  pollIntervalMs,
  budgetMs,
  sleepFn = defaultSleep,
  now = Date.now,
  signals = process,
  exit = (code) => process.exit(code),
}) {
  const defaults = CLASS_DEFAULTS[holdClass];
  if (!defaults) {
    throw new Error(`createWaitForClear: unknown hold class ${JSON.stringify(holdClass)}`);
  }
  const resolvedPoll = pollIntervalMs ?? defaults.pollIntervalMs;
  const resolvedBudget = budgetMs ?? defaults.budgetMs;
  if (!(resolvedPoll > 0) || !(resolvedBudget > 0)) {
    throw new Error(
      `createWaitForClear: the ${holdClass} hold has no pacing of its own. Pass chapter 3's own ` +
        'poll interval and budget as pollIntervalMs and budgetMs rather than minting a second ' +
        'pair here.',
    );
  }

  return (probe) =>
    runHold({
      holdClass,
      probe,
      server,
      log,
      persist,
      defaultPark,
      pollIntervalMs: resolvedPoll,
      budgetMs: resolvedBudget,
      sleepFn,
      now,
      signals,
      exit,
    });
}

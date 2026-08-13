import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import {
  BUILD_HOLD_CLASS,
  DISPLAY_REFRESH_SECONDS,
  PROPAGATION_BUDGET_MS,
  PROPAGATION_HOLD_CLASS,
  PROPAGATION_POLL_INTERVAL_MS,
  SAMPLE_OBSERVED_AT,
  consoleUrlLine,
  createWaitForClear,
  makeObservation,
  shouldHold,
} from './hold-loop.mjs';

/** A console server handle recording every call the loop makes on it. */
function fakeServer(url = 'http://127.0.0.1:49152/Zm9vYmFyLXNlY3JldA') {
  const calls = { start: [], update: [], stop: 0 };
  return {
    calls,
    url,
    handle: {
      async start(observation) {
        calls.start.push(observation);
        return { url };
      },
      update(observation) {
        calls.update.push(observation);
      },
      async stop() {
        calls.stop += 1;
      },
    },
  };
}

/** A clock the injected sleep advances, so a budget is spent without any real waiting. */
function fakeClock() {
  let clock = 0;
  return {
    now: () => clock,
    sleepFn: async (ms) => {
      clock += ms;
    },
  };
}

/**
 * A probe returning the scripted results in order, repeating the last one forever, and counting
 * its own invocations.
 */
function scriptedProbe(results) {
  const state = { calls: 0 };
  const probe = async () => {
    const result = results[Math.min(state.calls, results.length - 1)];
    state.calls += 1;
    return result;
  };
  return { probe, state };
}

const NOT_CLEARED = {
  cleared: false,
  detail: { markerOutcome: 'hostname-records-absent' },
  park: 'PARK ROW\nNext: re-run the tool.',
};
const CLEARED = { cleared: true, detail: { markerOutcome: 'live' } };

test('the named constants carry the values the pass locked, display cadence exported apart from the poll interval', () => {
  assert.equal(PROPAGATION_BUDGET_MS, 40 * 60 * 1000);
  assert.equal(PROPAGATION_POLL_INTERVAL_MS, 30 * 1000);
  assert.deepEqual({ ...DISPLAY_REFRESH_SECONDS }, { propagation: 30, builds: 5 });
  assert.equal(PROPAGATION_HOLD_CLASS, 'propagation');
  assert.equal(BUILD_HOLD_CLASS, 'builds');
});

test('the observation factory fills the envelope and each class detail, and refuses an unknown class', () => {
  const propagation = makeObservation(PROPAGATION_HOLD_CLASS);
  assert.deepEqual(propagation, {
    class: 'propagation',
    at: SAMPLE_OBSERVED_AT,
    cleared: false,
    attempt: 0,
    detail: { authoritative: null, recursive: null, lowConfidence: false, markerOutcome: null },
  });

  const builds = makeObservation(BUILD_HOLD_CLASS, {
    cleared: true,
    attempt: 3,
    detail: { buildUuid: 'b-1', status: 'stopped' },
  });
  assert.deepEqual(builds, {
    class: 'builds',
    at: SAMPLE_OBSERVED_AT,
    cleared: true,
    attempt: 3,
    detail: { buildUuid: 'b-1', status: 'stopped', outcome: null, commitSha: null },
  });

  assert.throws(() => makeObservation('nonsense'), /nonsense/);
});

test('a probe that clears on the third poll resumes after exactly three probes, with the server started once', async () => {
  const server = fakeServer();
  const { now, sleepFn } = fakeClock();
  const { probe, state } = scriptedProbe([NOT_CLEARED, NOT_CLEARED, CLEARED]);
  const lines = [];
  const signals = new EventEmitter();

  const waitForClear = createWaitForClear({
    holdClass: PROPAGATION_HOLD_CLASS,
    server: server.handle,
    log: (line) => lines.push(line),
    now,
    sleepFn,
    signals,
  });
  const observation = await waitForClear(probe);

  assert.equal(state.calls, 3);
  assert.equal(server.calls.start.length, 1);
  assert.equal(server.calls.stop, 1);
  assert.deepEqual(
    server.calls.update.map((o) => o.attempt),
    [2, 3],
  );
  assert.equal(observation.cleared, true);
  assert.equal(observation.attempt, 3);
  assert.equal(observation.detail.markerOutcome, 'live');
  assert.deepEqual(lines, [consoleUrlLine(server.url)]);
  assert.equal(signals.listenerCount('SIGINT'), 0);
  assert.equal(signals.listenerCount('SIGTERM'), 0);
});

test('a probe that clears on the first poll never starts the console at all', async () => {
  const server = fakeServer();
  const { now, sleepFn } = fakeClock();
  const { probe, state } = scriptedProbe([CLEARED]);
  const lines = [];

  const waitForClear = createWaitForClear({
    holdClass: PROPAGATION_HOLD_CLASS,
    server: server.handle,
    log: (line) => lines.push(line),
    now,
    sleepFn,
    signals: new EventEmitter(),
  });
  const observation = await waitForClear(probe);

  assert.equal(state.calls, 1);
  assert.equal(server.calls.start.length, 0);
  assert.equal(server.calls.stop, 0);
  assert.deepEqual(lines, []);
  assert.equal(observation.cleared, true);
});

test('the propagation budget expires on the injected clock after exactly its own poll count, with the loop printing no park row of its own', async () => {
  const server = fakeServer();
  const { now, sleepFn } = fakeClock();
  const { probe, state } = scriptedProbe([NOT_CLEARED]);
  const lines = [];

  const waitForClear = createWaitForClear({
    holdClass: PROPAGATION_HOLD_CLASS,
    server: server.handle,
    log: (line) => lines.push(line),
    now,
    sleepFn,
    signals: new EventEmitter(),
  });
  const observation = await waitForClear(probe);

  // The last probe is the one taken at the budget itself, so the count is the budget divided by
  // the poll interval plus the probe at zero.
  assert.equal(state.calls, PROPAGATION_BUDGET_MS / PROPAGATION_POLL_INTERVAL_MS + 1);
  assert.equal(observation.cleared, false);
  assert.equal(observation.detail.markerOutcome, 'hostname-records-absent');
  assert.equal(server.calls.stop, 1);
  // The park row belongs to the caller on the expiry path, exactly as today; the only line this
  // loop prints is the console URL.
  assert.deepEqual(lines, [consoleUrlLine(server.url)]);
});

test('the builds class refuses to invent its own poll and budget, naming chapter 3 as their owner', () => {
  assert.throws(
    () => createWaitForClear({ holdClass: BUILD_HOLD_CLASS, server: fakeServer().handle }),
    /chapter 3/,
  );

  // Given chapter 3's own constants it builds fine.
  const waitForClear = createWaitForClear({
    holdClass: BUILD_HOLD_CLASS,
    server: fakeServer().handle,
    pollIntervalMs: 5000,
    budgetMs: 5000 * 180,
  });
  assert.equal(typeof waitForClear, 'function');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(`${signal} during a hold stops the server, persists the findings, prints the park row, and exits 0`, async () => {
    const server = fakeServer();
    const { now } = fakeClock();
    const { probe, state } = scriptedProbe([NOT_CLEARED]);
    const lines = [];
    const signals = new EventEmitter();
    const priorListener = () => {};
    signals.on(signal, priorListener);
    const persisted = [];
    const exits = [];

    // The signal arrives while the loop is sleeping between polls; the sleep itself never
    // resolves, so only the interrupt can end the hold.
    const sleepFn = () => {
      signals.emit(signal);
      return new Promise(() => {});
    };

    const waitForClear = createWaitForClear({
      holdClass: PROPAGATION_HOLD_CLASS,
      server: server.handle,
      log: (line) => lines.push(line),
      persist: async (observation) => persisted.push(observation),
      now,
      sleepFn,
      signals,
      exit: (code) => exits.push(code),
    });
    const observation = await waitForClear(probe);

    assert.equal(state.calls, 1);
    assert.equal(server.calls.stop, 1);
    assert.deepEqual(
      persisted.map((o) => o.attempt),
      [1],
    );
    assert.equal(persisted[0].detail.markerOutcome, 'hostname-records-absent');
    assert.deepEqual(lines, [consoleUrlLine(server.url), NOT_CLEARED.park]);
    assert.deepEqual(exits, [0]);
    assert.equal(observation.cleared, false);

    // The hold's handlers live for the hold only; the prior disposition is what is left behind.
    assert.deepEqual(signals.listeners(signal), [priorListener]);
    assert.equal(signals.listenerCount(signal === 'SIGINT' ? 'SIGTERM' : 'SIGINT'), 0);
  });
}

test('a probe that throws stops the server and rethrows, leaving no handler behind', async () => {
  const server = fakeServer();
  const { now, sleepFn } = fakeClock();
  const signals = new EventEmitter();
  let calls = 0;
  const probe = async () => {
    calls += 1;
    if (calls === 1) return NOT_CLEARED;
    throw new Error('the API refused');
  };

  const waitForClear = createWaitForClear({
    holdClass: PROPAGATION_HOLD_CLASS,
    server: server.handle,
    log: () => {},
    now,
    sleepFn,
    signals,
  });

  await assert.rejects(() => waitForClear(probe), /the API refused/);
  assert.equal(server.calls.stop, 1);
  assert.equal(signals.listenerCount('SIGINT'), 0);
});

test('the hold policy holds only for an interactive run', () => {
  const interactive = { yes: false, isTTY: true, env: {} };
  assert.equal(shouldHold(interactive), true);
  assert.equal(shouldHold({ ...interactive, yes: true }), false);
  assert.equal(shouldHold({ ...interactive, isTTY: false }), false);
  assert.equal(shouldHold({ ...interactive, env: { CI: 'true' } }), false);
  assert.equal(shouldHold({ ...interactive, env: { CI: '' } }), true);
});

test('CAIRN_FORCE_HOLD is honored only beside a fake API base', () => {
  const nonInteractive = { yes: true, isTTY: false, env: { CI: 'true' } };

  assert.equal(
    shouldHold({
      ...nonInteractive,
      env: { ...nonInteractive.env, CAIRN_FORCE_HOLD: '1' },
    }),
    false,
    'the force seam alone must never make a real run hold',
  );
  assert.equal(
    shouldHold({
      ...nonInteractive,
      env: {
        ...nonInteractive.env,
        CAIRN_FORCE_HOLD: '1',
        CAIRN_CLOUDFLARE_API_BASE: 'http://127.0.0.1:9999',
      },
    }),
    true,
  );
  assert.equal(
    shouldHold({
      ...nonInteractive,
      env: {
        ...nonInteractive.env,
        CAIRN_FORCE_HOLD: '1',
        CAIRN_GITHUB_API_BASE: 'http://127.0.0.1:9999',
      },
    }),
    true,
  );
  assert.equal(
    shouldHold({
      ...nonInteractive,
      env: { ...nonInteractive.env, CAIRN_CLOUDFLARE_API_BASE: 'http://127.0.0.1:9999' },
    }),
    false,
    'a fake base alone is not a force seam',
  );
});

test('the console URL line names the URL and says the page serves during this run only', () => {
  const line = consoleUrlLine('http://127.0.0.1:49152/abc');
  assert.ok(line.includes('http://127.0.0.1:49152/abc'));
  assert.match(line, /only while this run/i);
});

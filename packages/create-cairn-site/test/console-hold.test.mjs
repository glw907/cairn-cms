// The child-process console proof (T4d Task 6): the only integration test that spawns the real
// bin.mjs entry and talks HTTP to the console it prints a URL for. Every other console test
// (src/console/*.test.mjs) drives the module in-process; this file is what proves the whole
// wiring actually arrives when a real process runs, which is exactly what an in-process test
// cannot show.
//
// BOTH CASES TARGET THE BUILDS HOLD, the one wait class a spawned child can drive: the
// propagation probe's inputs (the marker fetch, DNS) have no env seam (hold-loop.mjs's own
// header), so that class stays proven at the unit level. The fixture below seeds a record at
// chapter 3's own watch step (`config-reconciled`, one of CHAPTER3_RESUMABLE_STEPS) with its
// `buildsReconciledHash` already matching the local scaffold, so `performReconcile` sees no diff
// and `watchAndComplete` falls straight into the discovery hold (`needsDiscovery` on the
// resumed, no-diff path: the newest-build predicate, chapter3.mjs's own header).
//
// THE HOLD-FORCE SEAM. A spawned child is non-TTY and this suite's own env may carry `CI`, so the
// never-holds default would make the hold unreachable; `CAIRN_FORCE_HOLD=1`, honored only beside
// a fake API base (hold-loop.mjs's `shouldHold`), is the documented override that exists for
// exactly this file's two cases.
//
// WHAT THE SECOND FETCH SEES. The hold spans discovery AND the build poll (chapter3.mjs's
// `observeBuild`), so finding a build does not end it: an unfinished build is an ordinary
// not-cleared observation, and the console re-renders into the populated Build/Status/Outcome
// cells and keeps serving while the build runs. That is the transition the first case asserts (a
// real page change driven by a real state flip, on a route that otherwise never varies), and it is
// what makes the six minutes between discovery and a settled outcome watchable at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { createInterface } from 'node:readline';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { startFakeCloudflare } from './fake-cloudflare.mjs';
import { saveSite, loadSite } from '../src/state.mjs';
import { reconciledConfigHash } from '../src/cloudflare/chapter3.mjs';
import { consoleUrlLine } from '../src/hold-loop.mjs';
import { SERVES_DURING_RUN_SENTENCE } from '../src/console/render.mjs';
import { EXIT_TEXT } from '../src/console/exit-render.mjs';
import { renderParkPage } from '../src/console/park-pages.mjs';

const BIN_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin.mjs');
const WORKER_NAME = 'console-hold-worker';
const WORKER_TAG = 'tag-console-hold';
const WRANGLER_CONTENT = `${JSON.stringify({ name: WORKER_NAME }, null, 2)}\n`;
const CAIRN_CONFIG_CONTENT = "export const from = 'cms@example.test';\n";
/** The build-not-started catalogue row's own opening sentence, the park text an interrupted
 * discovery hold prints (catalogue.mjs's own `build-not-started` build()). */
const BUILD_NOT_STARTED_TEXT = 'no matching build has appeared yet';
/** The build-running catalogue row's own opening sentence, the park text an interrupt taken while
 * the hold is watching a discovered build prints. */
const BUILD_RUNNING_TEXT = 'The build is still running';

/** Point CAIRN_STATE_DIR at a fresh temporary directory for the duration of one test. */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-console-hold-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
    return rm(dir, { recursive: true, force: true });
  });
  return dir;
}

/** Build a local scaffold dir carrying both reconcile-owned files, matched by the fixture's own
 * `buildsReconciledHash` so `performReconcile` reads no diff and never needs GitHub at all. */
async function scaffoldDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-console-hold-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'wrangler.jsonc'), WRANGLER_CONTENT);
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  await writeFile(path.join(dir, 'src/theme/cairn.config.ts'), CAIRN_CONFIG_CONTENT);
  return dir;
}

/** Start a fake Cloudflare, seeded with the deployed Worker's script/tag so `resolveWorkerTag`
 * (chapter3.mjs) finds it. */
async function setupCloudflare(t) {
  const cloudflare = await startFakeCloudflare();
  cloudflare.state.workerScripts.push({ id: WORKER_NAME, tag: WORKER_TAG });
  t.after(() => cloudflare.close());
  return cloudflare;
}

/**
 * Build a state-store id whose trailing dash-segment is exactly six characters, matching
 * state.mjs's own SITE_ID_SHAPE (see the fake-github-and-flakes memory: a record failing that
 * shape is silently invisible to findSiteByDir).
 * @param {string} label
 * @returns {string}
 */
function makeSiteId(label) {
  const suffix = label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .padEnd(6, '0')
    .slice(0, 6);
  return `console-hold-${suffix}`;
}

/** Seed a record at chapter 3's own watch step, its local reconcile hash already matching `dir`
 * so `--connect` falls straight into the discovery hold with no GitHub call at all. */
async function seedHoldSite(siteId, dir) {
  const hash = await reconciledConfigHash(dir);
  await saveSite(siteId, {
    name: 'Console Hold Site',
    dir,
    step: 'config-reconciled',
    ownerEmail: 'owner@example.com',
    github: {
      clientId: 'fake-client-1',
      clientSecret: 'fake-secret',
      installationId: 1,
      repo: { owner: 'console-hold-owner', repo: 'console-hold-site', defaultBranch: 'main' },
    },
    cloudflare: {
      accountId: 'acct-1',
      url: `https://${WORKER_NAME}.example.workers.dev`,
      workerName: WORKER_NAME,
      buildsReconciledHash: hash,
    },
  });
}

/**
 * Spawn the real CLI entry, line-buffering its stdout so a caller can await a specific line
 * without the resume tests' await-exit idiom (which cannot observe anything mid-run). Every line
 * seen (before or after a `waitForLine` call) is kept in `stdoutLines`, for a park-row assertion
 * after the process has already exited.
 * @param {string[]} args
 * @param {Record<string, string | undefined>} env
 * @returns {{ child: import('node:child_process').ChildProcess, stdoutLines: string[],
 *  waitForLine: (matcher: (line: string) => RegExpMatchArray | null, timeoutMs?: number) =>
 *  Promise<RegExpMatchArray> }}
 */
function spawnCli(args, env) {
  const child = spawn(process.execPath, [BIN_PATH, ...args], { env });
  const stdoutLines = [];
  const waiters = [];
  createInterface({ input: child.stdout }).on('line', (line) => {
    stdoutLines.push(line);
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      const match = waiters[i].matcher(line);
      if (match) {
        const [{ resolve }] = waiters.splice(i, 1);
        resolve(match);
      }
    }
  });

  function waitForLine(matcher, timeoutMs = 20000) {
    const already = stdoutLines.map(matcher).find(Boolean);
    if (already) return Promise.resolve(already);
    return new Promise((resolve, reject) => {
      const entry = {
        matcher,
        resolve: (match) => {
          clearTimeout(timer);
          resolve(match);
        },
      };
      const timer = setTimeout(() => {
        const index = waiters.indexOf(entry);
        if (index !== -1) waiters.splice(index, 1);
        reject(new Error(`timed out waiting for a matching stdout line; got:\n${stdoutLines.join('\n')}`));
      }, timeoutMs);
      waiters.push(entry);
    });
  }

  return { child, stdoutLines, waitForLine };
}

/** Match the console URL line and capture the URL, without duplicating hold-loop.mjs's own exact
 * punctuation: the caller re-derives the expected line through consoleUrlLine and asserts equality. */
function matchConsoleUrlLine(line) {
  return /^Watch progress at (\S+) /.exec(line);
}

/**
 * A GET request that closes its own socket once the response ends, mirroring server.test.mjs's
 * own `rawRequest` (a bare `http.get`, not global `fetch`). `loopback-core.mjs`'s `close()` is
 * the ordinary `http.Server#close`, which waits for every open connection to end before its
 * promise resolves; global `fetch` (undici) pools a keep-alive connection per origin by default,
 * which a request landing during the console's own grace window could leave open past its own
 * reuse, holding `close()` (and so the child's own `exit(0)`) pending. This sidesteps that risk
 * rather than proving it either way.
 * @param {string} url the console URL to request
 * @returns {Promise<{ status: number, body: string }>}
 */
function getNoKeepAlive(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { agent: false }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
  });
}

test('a spawned run holds the Builds discovery wait, serves state-derived console content, and re-renders once the build is found', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const siteId = makeSiteId('changed-cell');
  await seedHoldSite(siteId, dir);

  const { child, stdoutLines, waitForLine } = spawnCli(['--dir', dir, '--yes', '--connect'], {
    ...process.env,
    CAIRN_STATE_DIR: stateDir,
    CAIRN_CLOUDFLARE_API_BASE: cloudflare.apiBase,
    CAIRN_CF_API_TOKEN: 'console-hold-env-token',
    CAIRN_FORCE_HOLD: '1',
  });
  t.after(() => child.kill('SIGKILL'));

  const [, url] = await waitForLine(matchConsoleUrlLine);
  assert.ok(
    stdoutLines.includes(consoleUrlLine(url)),
    "the printed line must match hold-loop.mjs's own consoleUrlLine template exactly",
  );

  const firstResponse = await fetch(url);
  assert.equal(firstResponse.status, 200);
  const firstBody = await firstResponse.text();
  assert.ok(firstBody.includes(WORKER_NAME), `expected the worker name (state-derived), got: ${firstBody}`);
  assert.ok(
    firstBody.includes('Still discovering the build that matches your push.'),
    `expected the pre-discovery view, got: ${firstBody}`,
  );
  assert.ok(firstBody.includes(SERVES_DURING_RUN_SENTENCE), 'expected the serves-during-a-run-only sentence');
  assert.equal(firstBody.includes(EXIT_TEXT), false, 'must not already show the cleared page');

  // Flip the fake's build state: any build now answers `listBuildsForWorker` for this tag, which
  // is exactly what the resumed, no-diff discovery predicate (chapter3.mjs's own header) matches
  // on position alone. `status: 'running'` with no settled outcome is a build the hold has found
  // and is still watching, which is the state this case exists to see rendered.
  const buildUuid = randomUUID();
  cloudflare.state.builds.set(buildUuid, {
    build_uuid: buildUuid,
    status: 'running',
    build_outcome: null,
    created_on: new Date().toISOString(),
    trigger: { external_script_id: WORKER_TAG },
    build_trigger_source: 'push_event',
    build_trigger_metadata: { commit_hash: 'deadbeef', commit_message: 'x', author: 'admin', branch: 'main' },
  });

  // Poll-fetch until the body changes: the next probe fires on chapter3's own poll interval (5s).
  const deadline = Date.now() + 20000;
  let changedBody = firstBody;
  while (changedBody === firstBody && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    changedBody = await (await fetch(url)).text();
  }
  assert.notEqual(changedBody, firstBody, 'expected a real re-render once the build was discovered');
  assert.ok(changedBody.includes(buildUuid), `expected the discovered build's own id, got: ${changedBody}`);
  assert.ok(changedBody.includes('Status: running'), `expected the build's live status, got: ${changedBody}`);
  assert.equal(
    changedBody.includes(EXIT_TEXT),
    false,
    'the hold must not end at discovery: an unfinished build is still a wait to watch',
  );

  // Still serving after another poll interval, which is the whole point: the console stays up for
  // the minutes between discovery and a settled outcome, not for the seconds before discovery.
  await new Promise((resolve) => setTimeout(resolve, 6000));
  const stillUp = await fetch(url);
  assert.equal(stillUp.status, 200, 'the console must still be up while the build runs');
  assert.ok((await stillUp.text()).includes('Status: running'));
});

test('SIGINT while the hold is watching a running build persists the discovered build uuid and parks on build-running', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const siteId = makeSiteId('midbuild');
  await seedHoldSite(siteId, dir);

  // The build is already there when the run starts, so the very first probe discovers it and the
  // hold settles into watching it: an interrupt from here is an interrupt MID-BUILD, the only
  // moment at which there is a discovered build uuid worth saving.
  const buildUuid = randomUUID();
  cloudflare.state.builds.set(buildUuid, {
    build_uuid: buildUuid,
    status: 'running',
    build_outcome: null,
    created_on: new Date().toISOString(),
    trigger: { external_script_id: WORKER_TAG },
    build_trigger_source: 'push_event',
    build_trigger_metadata: { commit_hash: 'deadbeef', commit_message: 'x', author: 'admin', branch: 'main' },
  });

  const { child, stdoutLines, waitForLine } = spawnCli(['--dir', dir, '--yes', '--connect'], {
    ...process.env,
    CAIRN_STATE_DIR: stateDir,
    CAIRN_CLOUDFLARE_API_BASE: cloudflare.apiBase,
    CAIRN_CF_API_TOKEN: 'console-hold-env-token',
    CAIRN_FORCE_HOLD: '1',
  });
  t.after(() => child.kill('SIGKILL'));

  const [, url] = await waitForLine(matchConsoleUrlLine);
  const body = await (await fetch(url)).text();
  assert.ok(body.includes(buildUuid), `expected the running build to be on the page before the interrupt, got: ${body}`);

  child.kill('SIGINT');
  const [code, signal] = await new Promise((resolve) => {
    child.on('exit', (exitCode, exitSignal) => resolve([exitCode, exitSignal]));
  });
  assert.equal(code, 0, `expected exit 0, got ${code} (signal ${signal}). stdout:\n${stdoutLines.join('\n')}`);
  assert.ok(
    stdoutLines.some((line) => line.includes(BUILD_RUNNING_TEXT)),
    `expected the build-running park row, got:\n${stdoutLines.join('\n')}`,
  );

  const state = await loadSite(siteId);
  assert.equal(state.step, 'config-reconciled', 'an interrupted hold must never advance the saved step');
  assert.equal(
    state.cloudflare.buildsLastBuildUuid,
    buildUuid,
    'the interrupt must save the build it had discovered, the one thing a resumed run cannot recover',
  );
});

test('SIGINT during a held Builds discovery wait closes the console, prints the park row, exits 0, and leaves the saved state intact', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const siteId = makeSiteId('sigint');
  await seedHoldSite(siteId, dir);

  const { child, stdoutLines, waitForLine } = spawnCli(['--dir', dir, '--yes', '--connect'], {
    ...process.env,
    CAIRN_STATE_DIR: stateDir,
    CAIRN_CLOUDFLARE_API_BASE: cloudflare.apiBase,
    CAIRN_CF_API_TOKEN: 'console-hold-env-token',
    CAIRN_FORCE_HOLD: '1',
  });
  t.after(() => child.kill('SIGKILL'));

  await waitForLine(matchConsoleUrlLine);
  child.kill('SIGINT');

  const [code, signal] = await new Promise((resolve) => {
    child.on('exit', (exitCode, exitSignal) => resolve([exitCode, exitSignal]));
  });
  assert.equal(code, 0, `expected exit 0, got ${code} (signal ${signal}). stdout:\n${stdoutLines.join('\n')}`);
  assert.equal(signal, null, 'the interrupt handler must call process.exit(0) itself, not die BY the signal');
  assert.ok(
    stdoutLines.some((line) => line.includes(BUILD_NOT_STARTED_TEXT)),
    `expected the build-not-started park row, got:\n${stdoutLines.join('\n')}`,
  );

  const state = await loadSite(siteId);
  assert.equal(state.step, 'config-reconciled', 'an interrupted hold must never advance the saved step');
  assert.equal(
    state.cloudflare.buildsLastBuildUuid,
    undefined,
    'no build was ever discovered, so the interrupt persist must write nothing',
  );
});

test('SIGINT during a held Builds discovery wait serves the park page over the real console route before the process exits (View 3)', async (t) => {
  const stateDir = await freshStateDir(t);
  const dir = await scaffoldDir(t);
  const cloudflare = await setupCloudflare(t);
  const siteId = makeSiteId('parkpage');
  await seedHoldSite(siteId, dir);

  const { child, stdoutLines, waitForLine } = spawnCli(['--dir', dir, '--yes', '--connect'], {
    ...process.env,
    CAIRN_STATE_DIR: stateDir,
    CAIRN_CLOUDFLARE_API_BASE: cloudflare.apiBase,
    CAIRN_CF_API_TOKEN: 'console-hold-env-token',
    CAIRN_FORCE_HOLD: '1',
  });
  t.after(() => child.kill('SIGKILL'));

  const [, url] = await waitForLine(matchConsoleUrlLine);
  // Attached before the interrupt, not after the fetches below: the first fetch to land during
  // the grace window ends it early (onRequestDuringGrace), so the child can exit within
  // milliseconds of that request. A listener attached only after this point would miss the
  // 'exit' event entirely, since Node never replays it to a late listener.
  const exited = new Promise((resolve) => {
    child.on('exit', (exitCode, exitSignal) => resolve([exitCode, exitSignal]));
  });
  child.kill('SIGINT');

  // The interrupt's `stop` now serves the park page through the same grace window the exit
  // render already used (server.mjs's own header), so a request landing before the process
  // exits must see it: this is the wiring FIX 3 adds, deleting it (leaving only renderParkPage
  // as a function nothing calls) would make this test time out with no matching park body.
  const expectedPage = renderParkPage({
    chapter: 'Connect to Workers Builds',
    hop: 'Watch your first Workers Builds deploy',
    code: 'build-not-started',
    params: { dir },
  });

  const deadline = Date.now() + 5000;
  let parkBody = null;
  while (!parkBody && Date.now() < deadline) {
    try {
      const response = await getNoKeepAlive(url);
      if (response.status === 200 && response.body.includes(BUILD_NOT_STARTED_TEXT)) {
        parkBody = response.body;
      }
    } catch {
      // The grace window may have already closed the socket on a late poll; keep retrying up to
      // the deadline, since the assertion below is what actually proves the page was served.
    }
    if (!parkBody) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(parkBody, 'expected the console to serve the build-not-started park page before it closed');
  assert.equal(parkBody, expectedPage, 'the served page must be exactly what renderParkPage produces');
  assert.ok(parkBody.includes(SERVES_DURING_RUN_SENTENCE));
  assert.doesNotMatch(parkBody, /http-equiv="refresh"/, 'a park is a terminal state for the console');

  // The console must actually close once the grace window ends, not linger after the park page.
  await new Promise((resolve) => setTimeout(resolve, 4000));
  await assert.rejects(() => getNoKeepAlive(url), 'the console must be closed well after its grace window');

  const [code, signal] = await exited;
  assert.equal(code, 0, `expected exit 0, got ${code} (signal ${signal}). stdout:\n${stdoutLines.join('\n')}`);
  assert.ok(
    stdoutLines.some((line) => line.includes(BUILD_NOT_STARTED_TEXT)),
    `expected the build-not-started park row printed to the terminal too, got:\n${stdoutLines.join('\n')}`,
  );
});

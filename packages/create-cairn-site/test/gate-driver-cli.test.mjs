// The gate driver against the real CLI: bin.mjs, run on a pty from a seeded `live` record, with the
// release gate's xdg-open shim first on PATH and the leg B1 prompt table. It proves the table's
// domain and Builds keys match the prompts the CLI really prints. The fakes answer every request,
// so nothing here reaches api.cloudflare.com, GitHub, or a browser.
//
// The run ends where chapter 3's token hop does: the fake accepts any bearer, so the test arms
// a 403 on the zone list for each paste (the first, and the one retry ensureApiToken allows), and
// the second refusal throws the token-scope-missing row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, chmod, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDriver, HOLD_IDLE_MS } from '../../../scripts/gate/driver.mjs';
import { PROPAGATION_BUDGET_MS } from '../src/hold-loop.mjs';
import { makeFakeBin } from './fake-bin.mjs';
import { startFakeCloudflare } from './fake-cloudflare.mjs';
import { saveSite } from '../src/state.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BIN_PATH = path.join(HERE, '..', 'bin.mjs');
const SHIM = path.join(HERE, '..', '..', '..', 'scripts', 'gate', 'xdg-open');
const TOKEN = 'cfut_IntegrationGateTokenNeverEchoed0123456789';
const REFUSED = { success: false, errors: [{ code: 9109, message: 'Unauthorized to access requested resource' }] };

test('the driver walks bin.mjs from a live record to chapter 3\'s token refusal on the leg B1 table', async (t) => {
  const stateDir = await mkdtemp(path.join(tmpdir(), 'gate-cli-state-'));
  const siteDir = await mkdtemp(path.join(tmpdir(), 'gate-cli-site-'));
  // The directory name carries "stub" so a stray look at PATH reads it as a stand-in opener.
  const shimDir = await mkdtemp(path.join(tmpdir(), 'xdg-stub-gate-'));
  t.after(() => Promise.all([stateDir, siteDir, shimDir].map((dir) => rm(dir, { recursive: true, force: true }))));
  await copyFile(SHIM, path.join(shimDir, 'xdg-open'));
  await chmod(path.join(shimDir, 'xdg-open'), 0o755);
  const urlLog = path.join(stateDir, 'urls.log');

  const fake = await makeFakeBin('gate-driver-cli');
  t.after(() => fake.close());
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  process.env.CAIRN_STATE_DIR = stateDir;
  t.after(() => delete process.env.CAIRN_STATE_DIR);
  await saveSite('gate-driver-live00', {
    name: 'Gate Driver Site',
    dir: siteDir,
    step: 'live',
    ownerEmail: 'owner@example.com',
    github: {
      appId: 1,
      appSlug: 'gate-driver',
      repo: { owner: 'gate-owner', repo: 'gate-driver-site', defaultBranch: 'main' },
      installationId: 1,
      clientId: 'fake-client-1',
      clientSecret: 'fake-secret',
    },
    cloudflare: {
      url: 'https://gate-driver-site.glw907.workers.dev',
      workerName: 'gate-driver-site',
      accountId: 'acct-1',
    },
  });

  // Each paste is armed as it is typed, so the fake refuses the check that follows it.
  const paste = () => {
    cloudflare.failNext('zone_list', 403, REFUSED);
    return TOKEN;
  };
  const logPath = path.join(stateDir, 'driver.log');
  const capturePath = path.join(stateDir, 'capture.bin');
  const result = await runDriver({
    command: process.execPath,
    args: [BIN_PATH, '--dir', siteDir],
    env: {
      PATH: `${shimDir}${path.delimiter}${process.env.PATH ?? ''}`,
      HOME: stateDir,
      TERM: 'xterm-256color',
      LANG: 'C.UTF-8',
      CAIRN_STATE_DIR: stateDir,
      CAIRN_WRANGLER_BIN: fake.binPath,
      CAIRN_CLOUDFLARE_API_BASE: cloudflare.apiBase,
      GATE_URL_LOG: urlLog,
    },
    table: [
      { match: 'Connect a domain you own to this site now?', kind: 'confirm', answer: false },
      { match: 'Connect this repository to Workers Builds now?', kind: 'confirm', answer: true },
      { match: 'Paste your Cloudflare API token', kind: 'password', value: paste },
    ],
    logPath,
    capturePath,
    idleMs: 20_000,
  });

  assert.equal(result.failure, undefined, `the driver failed the run: ${result.failure}`);
  assert.notEqual(result.code, 0, `the refused token must end the run non-zero, got:\n${result.screen}`);
  assert.match(result.screen, /Paste your Cloudflare API token/);
  assert.match(result.screen, /works, but it is missing/, `expected the token refusal row, got:\n${result.screen}`);

  const log = await readFile(logPath, 'utf8');
  const answers = log.split('\n').filter((line) => line.includes(' answered '));
  assert.deepEqual(
    answers.map((line) => line.slice(line.indexOf('answered'))),
    [
      'answered "Connect a domain you own to this site now?" (confirm)',
      'answered "Connect this repository to Workers Builds now?" (confirm)',
      'answered "Paste your Cloudflare API token" (password)',
      'answered "Paste your Cloudflare API token" (password)',
    ],
  );
  assert.equal(cloudflare.requests.filter((request) => request.path.startsWith('/client/v4/zones')).length, 2);

  // The shim took the prefill page; nothing opened a browser.
  assert.match(await readFile(urlLog, 'utf8'), /dash\.cloudflare\.com\/profile\/api-tokens/);
  for (const text of [result.screen, log, await readFile(capturePath, 'utf8')]) {
    assert.equal(text.includes(TOKEN), false, 'the token must not appear in the screen, the log, or the capture');
  }
});

test('the driver\'s held-page idle limit is the CLI\'s propagation budget plus five minutes', () => {
  assert.equal(HOLD_IDLE_MS, PROPAGATION_BUDGET_MS + 5 * 60_000);
});

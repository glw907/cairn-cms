// Coverage for the closing block bin.mjs prints after a settled run, driven as a real child
// process the way test/resume-chapter2.test.mjs does. A park's own closing block cannot be reached
// here (no DNS or HTTPS seam), so the records below are the shape a park leaves on disk: a
// saved domain at a step whose plain re-run prints the live block.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFakeBin } from '../test/fake-bin.mjs';
import { startFakeCloudflare } from '../test/fake-cloudflare.mjs';
import { saveSite } from './state.mjs';

const execFileAsync = promisify(execFile);
const BIN_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin.mjs');
const DOMAIN_HINT = 'Connect your domain any time';

/**
 * Seed a `live` site record and run bin.mjs against it with a fake wrangler and Cloudflare.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {string} siteId the site id to seed
 * @param {object} cloudflareOverrides fields merged over the record's `cloudflare` object
 * @param {string[]} args the CLI arguments after `--dir <dir>`
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>} the run's outcome
 */
async function runLive(t, siteId, cloudflareOverrides, args) {
  const stateDir = await mkdtemp(path.join(tmpdir(), 'cairn-closing-state-'));
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-closing-scaffold-'));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const fake = await makeFakeBin(siteId);
  t.after(() => fake.close());
  await fake.respond('d1 execute', {
    code: 0,
    stdout: JSON.stringify([
      { results: [], success: true, meta: { changes: 1 } },
      { results: [], success: true, meta: { changes: 0 } },
      { results: [], success: true, meta: { changes: 1 } },
    ]),
  });
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  process.env.CAIRN_STATE_DIR = stateDir;
  t.after(() => {
    delete process.env.CAIRN_STATE_DIR;
  });
  await saveSite(siteId, {
    name: 'Closing Block Site',
    dir,
    step: 'live',
    ownerEmail: 'owner@example.com',
    github: {
      appId: 99,
      appSlug: 'cairn-closing-block',
      repo: { owner: 'closing-owner', repo: 'closing-site' },
      installationId: 11,
    },
    cloudflare: {
      url: 'https://closing-site.glw907.workers.dev',
      workerName: 'closing-site',
      accountId: 'acct-1',
      ...cloudflareOverrides,
    },
  });

  const env = {
    ...process.env,
    CAIRN_STATE_DIR: stateDir,
    CAIRN_WRANGLER_BIN: fake.binPath,
    CAIRN_CLOUDFLARE_API_BASE: cloudflare.apiBase,
  };
  delete env.CAIRN_CF_API_TOKEN;
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [BIN_PATH, '--dir', dir, ...args], {
      env,
      input: '',
      timeout: 60000,
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    return { code: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

test('the live block offers to connect a domain when none is saved', async (t) => {
  const result = await runLive(t, 'closing-nodomn', {}, ['--yes']);
  assert.equal(result.code, 0, `stderr: ${result.stderr}`);
  assert.ok(result.stdout.includes(DOMAIN_HINT), `expected the offer, got: ${result.stdout}`);
});

test('the live block does not offer to connect a domain a park already saved', async (t) => {
  const parked = { domain: 'parked.example', zoneId: 'zone-1', nameServers: ['a.ns.example', 'b.ns.example'] };
  const result = await runLive(t, 'closing-parkd2', parked, ['--yes']);
  assert.equal(result.code, 0, `stderr: ${result.stderr}`);
  assert.equal(result.stdout.includes(DOMAIN_HINT), false, `got: ${result.stdout}`);
  assert.ok(result.stdout.includes('Your site is live at:'), `expected the live block, got: ${result.stdout}`);
});

test('the live block after --sign-in does not offer a domain the record already holds', async (t) => {
  const withEmail = { domain: 'mailed.example', emailFrom: 'no-reply@mailed.example' };
  const result = await runLive(t, 'closing-mailed', withEmail, ['--sign-in']);
  assert.equal(result.code, 0, `stderr: ${result.stderr}`);
  assert.equal(result.stdout.includes(DOMAIN_HINT), false, `got: ${result.stdout}`);
});

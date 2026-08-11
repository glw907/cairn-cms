import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, stat, writeFile, readFile, chmod, rm, utimes, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Point CAIRN_STATE_DIR at an empty temporary directory for the duration of one test. state.mjs
 * reads the variable on every call, so setting it here is enough; the directory is removed when
 * the test finishes.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the state directory's absolute path
 */
async function freshStateDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('saves under the state dir with 0600 and round-trips', async (t) => {
  await freshStateDir(t);
  const { saveSite, loadSite, newSiteId } = await import('./state.mjs');
  const id = newSiteId('Alpine Club');
  assert.match(id, /^alpine-club-[a-z0-9]{6}$/);
  await saveSite(id, { name: 'Alpine Club', step: 'scaffolded' });
  const mode = (await stat(path.join(process.env.CAIRN_STATE_DIR, `${id}.json`))).mode & 0o777;
  assert.equal(mode, 0o600);
  assert.deepEqual(await loadSite(id), { name: 'Alpine Club', step: 'scaffolded' });
  assert.equal(await loadSite('missing-000000'), null);
});

test('saveSite tightens permissions back to 0600 on overwrite, even if loosened behind its back', async (t) => {
  const dir = await freshStateDir(t);
  const { saveSite } = await import('./state.mjs');
  const id = 'overwrite-target';
  await saveSite(id, { step: 'one' });
  const file = path.join(dir, `${id}.json`);
  await chmod(file, 0o644);
  await saveSite(id, { step: 'two' });
  const mode = (await stat(file)).mode & 0o777;
  assert.equal(mode, 0o600);
});

test('the state dir itself is 0700 after saveSite', async (t) => {
  const dir = await freshStateDir(t);
  const { saveSite } = await import('./state.mjs');
  await saveSite('some-id', { step: 'one' });
  const mode = (await stat(dir)).mode & 0o777;
  assert.equal(mode, 0o700);
});

test('newSiteId falls back to "site" for a name that slugs to empty, never a leading dash', async (t) => {
  await freshStateDir(t);
  const { newSiteId } = await import('./state.mjs');
  assert.match(newSiteId('!!!'), /^site-[a-z0-9]{6}$/);
});

test('newSiteId returns different ids on two calls with the same name', async (t) => {
  await freshStateDir(t);
  const { newSiteId } = await import('./state.mjs');
  assert.notEqual(newSiteId('Alpine Club'), newSiteId('Alpine Club'));
});

test('loadSite throws on malformed JSON rather than returning null', async (t) => {
  const dir = await freshStateDir(t);
  const { loadSite } = await import('./state.mjs');
  await writeFile(path.join(dir, 'broken.json'), '{ not valid json');
  await assert.rejects(() => loadSite('broken'));
});

test('updateSite creates a record when none exists yet', async (t) => {
  await freshStateDir(t);
  const { updateSite, loadSite } = await import('./state.mjs');
  const next = await updateSite('new-site', { name: 'Alpine Club', step: 'scaffolded' });
  assert.deepEqual(next, { name: 'Alpine Club', step: 'scaffolded', github: {}, cloudflare: {} });
  assert.deepEqual(await loadSite('new-site'), {
    name: 'Alpine Club',
    step: 'scaffolded',
    github: {},
    cloudflare: {},
  });
});

test('updateSite deep-merges github so credentials written at the first hop survive every later hop', async (t) => {
  await freshStateDir(t);
  const { updateSite, loadSite } = await import('./state.mjs');
  await updateSite('alpine-site', { name: 'Alpine Club', step: 'scaffolded' });
  await updateSite('alpine-site', { step: 'app-created', github: { appId: 1, pem: 'PEM-DATA' } });
  await updateSite('alpine-site', { step: 'installed', github: { installationId: 42 } });
  const final = await updateSite('alpine-site', { step: 'repo-created', github: { repo: { repo: 'alpine-club' } } });

  assert.equal(final.step, 'repo-created');
  assert.equal(final.github.appId, 1, 'the App id from the first hop must survive');
  assert.equal(final.github.pem, 'PEM-DATA', 'the pem from the first hop must survive');
  assert.equal(final.github.installationId, 42, 'the installation id from the second hop must survive');
  assert.deepEqual(final.github.repo, { repo: 'alpine-club' });
  assert.deepEqual(await loadSite('alpine-site'), final);
});

test('updateSite deep-merges cloudflare so a field written at one hop survives the next hop, alongside pre-existing url and workerName', async (t) => {
  await freshStateDir(t);
  const { saveSite, updateSite, loadSite } = await import('./state.mjs');
  await saveSite('alpine-site', {
    name: 'Alpine Club',
    step: 'deployed',
    cloudflare: { url: 'https://alpine-club.pages.dev', workerName: 'alpine-club' },
  });

  await updateSite('alpine-site', { step: 'domain-account', cloudflare: { accountId: 'a1' } });
  const final = await updateSite('alpine-site', { step: 'domain-zone', cloudflare: { zoneId: 'z1' } });

  assert.deepEqual(final.cloudflare, {
    url: 'https://alpine-club.pages.dev',
    workerName: 'alpine-club',
    accountId: 'a1',
    zoneId: 'z1',
  });
  assert.deepEqual(await loadSite('alpine-site'), final);
});

test('saveSite removes a key a merge could never express: rebuilding without cloudflare.apiToken and saving', async (t) => {
  const dir = await freshStateDir(t);
  const { saveSite, loadSite } = await import('./state.mjs');
  const id = 'alpine-site';
  await saveSite(id, {
    name: 'Alpine Club',
    cloudflare: { accountId: 'a1', apiToken: 'planted-token-value' },
  });

  const current = await loadSite(id);
  const { apiToken, ...cloudflareWithoutToken } = current.cloudflare;
  await saveSite(id, { ...current, cloudflare: cloudflareWithoutToken });

  const reread = await loadSite(id);
  assert.deepEqual(reread.cloudflare, { accountId: 'a1' });
  assert.equal('apiToken' in reread.cloudflare, false);

  const file = path.join(dir, `${id}.json`);
  const raw = await readFile(file, 'utf8');
  assert.equal(raw.includes('planted-token-value'), false);

  const mode = (await stat(file)).mode & 0o777;
  assert.equal(mode, 0o600);
});

test('retireSite scrubs a saved cloudflare.apiToken from the retired file', async (t) => {
  const dir = await freshStateDir(t);
  const { saveSite, retireSite } = await import('./state.mjs');
  const id = 'alpine-site';
  await saveSite(id, {
    name: 'Alpine Club',
    dir: '/tmp/alpine-club',
    cloudflare: { accountId: 'a1', apiToken: 'planted-token-value' },
  });

  await retireSite(id);

  const entries = await readdir(dir);
  assert.ok(!entries.includes(`${id}.json`), 'the original filename must be gone');
  const retiredName = entries.find((name) => name.startsWith(`${id}.retired-`));
  assert.ok(retiredName, 'expected a renamed retired-*.json file');

  const retiredPath = path.join(dir, retiredName);
  const mode = (await stat(retiredPath)).mode & 0o777;
  assert.equal(mode, 0o600);

  const raw = await readFile(retiredPath, 'utf8');
  assert.equal(raw.includes('planted-token-value'), false);

  const data = JSON.parse(raw);
  assert.equal(data.name, 'Alpine Club');
  assert.equal(data.dir, '/tmp/alpine-club');
  assert.equal(data.cloudflare.accountId, 'a1');
  assert.equal('apiToken' in data.cloudflare, false);
});

test('retireSite on a record with no token: other fields survive unchanged and the file is still renamed', async (t) => {
  const dir = await freshStateDir(t);
  const { saveSite, retireSite } = await import('./state.mjs');
  const id = 'alpine-site';
  await saveSite(id, { name: 'Alpine Club', dir: '/tmp/alpine-club', step: 'deployed' });

  await retireSite(id);

  const entries = await readdir(dir);
  assert.ok(!entries.includes(`${id}.json`));
  const retiredName = entries.find((name) => name.startsWith(`${id}.retired-`));
  assert.ok(retiredName);
  const data = JSON.parse(await readFile(path.join(dir, retiredName), 'utf8'));
  assert.deepEqual(data, { name: 'Alpine Club', dir: '/tmp/alpine-club', step: 'deployed' });
});

test('retireSite falls back to a plain rename when the record cannot be parsed', async (t) => {
  const dir = await freshStateDir(t);
  const { retireSite } = await import('./state.mjs');
  const id = 'broken-record';
  await writeFile(path.join(dir, `${id}.json`), '{ not valid json', { mode: 0o600 });

  await retireSite(id);

  const entries = await readdir(dir);
  assert.ok(!entries.includes(`${id}.json`), 'the original filename must be gone');
  const retiredName = entries.find((name) => name.startsWith(`${id}.retired-`));
  assert.ok(retiredName, 'expected the unparseable file to still be renamed aside');
  assert.equal(await readFile(path.join(dir, retiredName), 'utf8'), '{ not valid json');
});

test('retireSite scrubbing still keeps findSiteByDir from returning the retired record', async (t) => {
  await freshStateDir(t);
  const { saveSite, retireSite, findSiteByDir } = await import('./state.mjs');
  await saveSite('alpine-club-abc123', {
    name: 'Alpine Club',
    dir: '/tmp/alpine-club',
    cloudflare: { apiToken: 'planted-token-value' },
  });

  await retireSite('alpine-club-abc123');

  assert.equal(await findSiteByDir('/tmp/alpine-club'), null);
});

test('updateSite leaves the saved file at 0600', async (t) => {
  const dir = await freshStateDir(t);
  const { updateSite } = await import('./state.mjs');
  await updateSite('mode-check', { step: 'scaffolded' });
  const mode = (await stat(path.join(dir, 'mode-check.json'))).mode & 0o777;
  assert.equal(mode, 0o600);
});

test('findSiteByDir returns the record whose saved dir matches, and null when none does', async (t) => {
  await freshStateDir(t);
  const { saveSite, findSiteByDir } = await import('./state.mjs');
  await saveSite('alpine-club-abc123', { name: 'Alpine Club', dir: '/tmp/alpine-club', step: 'scaffolded' });

  const found = await findSiteByDir('/tmp/alpine-club');
  assert.deepEqual(found, {
    id: 'alpine-club-abc123',
    data: { name: 'Alpine Club', dir: '/tmp/alpine-club', step: 'scaffolded' },
  });

  assert.equal(await findSiteByDir('/tmp/no-such-site'), null);
});

test('findSiteByDir returns null against an empty (never-written) state dir', async (t) => {
  await freshStateDir(t);
  const { findSiteByDir } = await import('./state.mjs');
  assert.equal(await findSiteByDir('/tmp/anything'), null);
});

test('findSiteByDir tolerates a malformed record, skipping it rather than throwing', async (t) => {
  const dir = await freshStateDir(t);
  const { saveSite, findSiteByDir } = await import('./state.mjs');
  await writeFile(path.join(dir, 'broken-record-000000.json'), '{ not valid json');
  await saveSite('alpine-club-abc123', { name: 'Alpine Club', dir: '/tmp/alpine-club', step: 'scaffolded' });

  const found = await findSiteByDir('/tmp/alpine-club');
  assert.equal(found.id, 'alpine-club-abc123');
});

test('findSiteByDir never returns a retired record', async (t) => {
  await freshStateDir(t);
  const { saveSite, retireSite, findSiteByDir } = await import('./state.mjs');
  await saveSite('alpine-club-abc123', { name: 'Alpine Club', dir: '/tmp/alpine-club', step: 'scaffolded' });
  await retireSite('alpine-club-abc123');

  assert.equal(await findSiteByDir('/tmp/alpine-club'), null);
});

test('findSiteByDir picks the newest-mtime record when two share the same dir', async (t) => {
  const dir = await freshStateDir(t);
  const { saveSite, findSiteByDir } = await import('./state.mjs');
  await saveSite('alpine-club-aaaaaa', { name: 'Older Attempt', dir: '/tmp/alpine-club', step: 'scaffolded' });
  await saveSite('alpine-club-bbbbbb', { name: 'Newer Attempt', dir: '/tmp/alpine-club', step: 'app-created' });

  const older = new Date(Date.now() - 60_000);
  const newer = new Date();
  await utimes(path.join(dir, 'alpine-club-aaaaaa.json'), older, older);
  await utimes(path.join(dir, 'alpine-club-bbbbbb.json'), newer, newer);

  const found = await findSiteByDir('/tmp/alpine-club');
  assert.equal(found.id, 'alpine-club-bbbbbb');
});

test('retireSite renames the record rather than deleting it', async (t) => {
  const dir = await freshStateDir(t);
  const { saveSite, retireSite } = await import('./state.mjs');
  await saveSite('alpine-club-abc123', { name: 'Alpine Club', dir: '/tmp/alpine-club', step: 'scaffolded' });

  await retireSite('alpine-club-abc123');

  const entries = await readdir(dir);
  assert.ok(!entries.includes('alpine-club-abc123.json'), 'the original filename must be gone');
  const retired = entries.find((name) => name.startsWith('alpine-club-abc123.retired-'));
  assert.ok(retired, 'expected a renamed retired-*.json file');
});

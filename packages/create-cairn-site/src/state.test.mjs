import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, stat, writeFile, chmod, rm } from 'node:fs/promises';
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
  assert.deepEqual(next, { name: 'Alpine Club', step: 'scaffolded', github: {} });
  assert.deepEqual(await loadSite('new-site'), { name: 'Alpine Club', step: 'scaffolded', github: {} });
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

test('updateSite leaves the saved file at 0600', async (t) => {
  const dir = await freshStateDir(t);
  const { updateSite } = await import('./state.mjs');
  await updateSite('mode-check', { step: 'scaffolded' });
  const mode = (await stat(path.join(dir, 'mode-check.json'))).mode & 0o777;
  assert.equal(mode, 0o600);
});

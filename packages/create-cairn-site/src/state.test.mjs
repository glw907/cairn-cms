import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, stat, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

async function freshStateDir() {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-state-'));
  process.env.CAIRN_STATE_DIR = dir;
  return dir;
}

test('saves under the state dir with 0600 and round-trips', async () => {
  await freshStateDir();
  const { saveSite, loadSite, newSiteId } = await import('./state.mjs');
  const id = newSiteId('Alpine Club');
  assert.match(id, /^alpine-club-[a-z0-9]{6}$/);
  await saveSite(id, { name: 'Alpine Club', step: 'scaffolded' });
  const mode = (await stat(path.join(process.env.CAIRN_STATE_DIR, `${id}.json`))).mode & 0o777;
  assert.equal(mode, 0o600);
  assert.deepEqual(await loadSite(id), { name: 'Alpine Club', step: 'scaffolded' });
  assert.equal(await loadSite('missing-000000'), null);
});

test('saveSite tightens permissions back to 0600 on overwrite, even if loosened behind its back', async () => {
  const dir = await freshStateDir();
  const { saveSite } = await import('./state.mjs');
  const id = 'overwrite-target';
  await saveSite(id, { step: 'one' });
  const file = path.join(dir, `${id}.json`);
  await chmod(file, 0o644);
  await saveSite(id, { step: 'two' });
  const mode = (await stat(file)).mode & 0o777;
  assert.equal(mode, 0o600);
});

test('the state dir itself is 0700 after saveSite', async () => {
  const dir = await freshStateDir();
  const { saveSite } = await import('./state.mjs');
  await saveSite('some-id', { step: 'one' });
  const mode = (await stat(dir)).mode & 0o777;
  assert.equal(mode, 0o700);
});

test('newSiteId falls back to "site" for a name that slugs to empty, never a leading dash', async () => {
  await freshStateDir();
  const { newSiteId } = await import('./state.mjs');
  assert.match(newSiteId('!!!'), /^site-[a-z0-9]{6}$/);
});

test('newSiteId returns different ids on two calls with the same name', async () => {
  await freshStateDir();
  const { newSiteId } = await import('./state.mjs');
  assert.notEqual(newSiteId('Alpine Club'), newSiteId('Alpine Club'));
});

test('loadSite throws on malformed JSON rather than returning null', async () => {
  const dir = await freshStateDir();
  const { loadSite } = await import('./state.mjs');
  await writeFile(path.join(dir, 'broken.json'), '{ not valid json');
  await assert.rejects(() => loadSite('broken'));
});

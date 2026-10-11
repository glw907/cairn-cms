// The dev backend's 'repository' content mode: each branch is an in-memory overlay over the site's
// working tree, so the dev admin lists the developer's real entries and a save never reaches disk.
// Every case runs against a throwaway tree under the scratch root, with `process.cwd()` pointed at
// it, so the root the handle resolves is the one these assertions read back.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Handle } from '@sveltejs/kit/hooks';
import type { Backend } from '@glw907/cairn-cms';
import { devBackendHandle } from './handle.js';
import { SEED_FRAGMENTS, SEED_VOCABULARY } from './fake-github.js';

const SCRATCH = join(homedir(), '.cache', 'cairn-dev-tests');
const AUTHOR = { name: 'Ed Editor', email: 'ed@t' };
const MANIFEST = 'src/content/.cairn/index.json';
const MEDIA = 'src/content/.cairn/media.json';
const CONFIG = 'src/theme/site.config.yaml';

const DISK: Record<string, string> = {
  'src/content/posts/2026-01-01-alpha.md': '---\ntitle: Alpha\n---\nAlpha body.\n',
  'src/content/posts/2026-01-02-beta.md': '---\ntitle: Beta\n---\nBeta body.\n',
  'src/content/pages/about.md': '---\ntitle: About\n---\nAbout body.\n',
  [MANIFEST]: '{"version":1,"entries":[{"id":"2026-01-01-alpha","concept":"posts"}]}\n',
  [MEDIA]: '{}\n',
  [CONFIG]: 'siteName: Real Site\n',
};

let root = '';

beforeEach(() => {
  mkdirSync(SCRATCH, { recursive: true });
  root = mkdtempSync(join(SCRATCH, 'repo-'));
  for (const [path, content] of Object.entries(DISK)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  vi.spyOn(process, 'cwd').mockReturnValue(root);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  rmSync(root, { recursive: true, force: true });
});

/** The backend the handle puts on `locals.cairnBackend` for one admin request. */
async function backendFor(content?: 'repository' | 'fixtures'): Promise<Backend> {
  const handle: Handle = devBackendHandle({ runtime: {}, ...(content ? { content } : {}) });
  const event = { url: new URL('http://localhost/admin'), locals: {} as Record<string, unknown> };
  await handle({ event: event as unknown as Parameters<Handle>[0]['event'], resolve: async () => new Response('ok') });
  return event.locals.cairnBackend as Backend;
}

/** Every file under `dir` with its bytes' hash and mtime, keyed by relative path. */
function snapshot(dir: string, base = dir): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, snapshot(full, base));
    else {
      const digest = createHash('sha256').update(readFileSync(full)).digest('hex');
      out[full.slice(base.length + 1)] = `${digest}:${statSync(full).mtimeMs}`;
    }
  }
  return out;
}

test('the list is the disk set exactly, with no fixture entry, read through the manifest', async () => {
  const backend = await backendFor('repository');
  expect((await backend.readEntries('src/content/posts', 'main')).map((e) => e.id)).toEqual([
    '2026-01-02-beta',
    '2026-01-01-alpha',
  ]);
  expect(await backend.readFile(MANIFEST, 'main')).toBe(DISK[MANIFEST]);
  expect(await backend.readEntries('src/content/fragments', 'main')).toEqual([]);
  expect(await backend.readFile(`src/content/fragments/${SEED_FRAGMENTS.trailSafety.id}.md`, 'main')).toBeNull();
});

test('at construction the site config and media manifest read as disk bytes, and no pending branch exists', async () => {
  const backend = await backendFor('repository');
  expect(await backend.readFile(CONFIG, 'main')).toBe(DISK[CONFIG]);
  expect(await backend.readFile(MEDIA, 'main')).toBe(DISK[MEDIA]);
  expect(await backend.listBranches('cairn/')).toEqual([]);
  expect(await backend.readFile(CONFIG, 'main')).not.toContain(SEED_VOCABULARY.inUse.value);
});

test('a save shows in the next read, a disk edit to an unwritten file shows, and a disk edit to a written file waits for a restart', async () => {
  const backend = await backendFor('repository');
  const alpha = 'src/content/posts/2026-01-01-alpha.md';
  const beta = 'src/content/posts/2026-01-02-beta.md';
  await backend.commit('main', [{ path: alpha, content: 'saved in memory' }], AUTHOR, 'save');
  expect(await backend.readFile(alpha, 'main')).toBe('saved in memory');
  writeFileSync(join(root, beta), 'edited on disk');
  expect(await backend.readFile(beta, 'main')).toBe('edited on disk');
  writeFileSync(join(root, alpha), 'edited on disk after the save');
  expect(await backend.readFile(alpha, 'main')).toBe('saved in memory');
});

test('a deleted or renamed on-disk entry stays gone, and a branch read of an untouched disk file returns its content', async () => {
  const backend = await backendFor('repository');
  const alpha = 'src/content/posts/2026-01-01-alpha.md';
  const beta = 'src/content/posts/2026-01-02-beta.md';
  await backend.commit('main', [{ path: alpha, content: null }], AUTHOR, 'delete');
  expect(await backend.readFile(alpha, 'main')).toBeNull();
  expect((await backend.readEntries('src/content/posts', 'main')).map((e) => e.id)).toEqual(['2026-01-02-beta']);
  await backend.commit(
    'main',
    [
      { path: beta, content: null },
      { path: 'src/content/posts/2026-01-02-gamma.md', content: '---\ntitle: Gamma\n---\n' },
    ],
    AUTHOR,
    'rename',
  );
  expect(await backend.readFile(beta, 'main')).toBeNull();
  expect((await backend.readEntries('src/content/posts', 'main')).map((e) => e.id)).toEqual(['2026-01-02-gamma']);
  const sha = await backend.createBranch('cairn/pages/about', 'main');
  expect(await backend.branchHead('cairn/pages/about')).toBe(sha);
  expect(await backend.readFile('src/content/pages/about.md', 'cairn/pages/about')).toBe(DISK['src/content/pages/about.md']);
  expect(await backend.readFile(alpha, 'cairn/pages/about')).toBeNull();
});

test('the working tree is byte and mtime identical after save, delete, rename, branch, publish, settings, nav, and media writes', async () => {
  const before = snapshot(root);
  const backend = await backendFor('repository');
  const alpha = 'src/content/posts/2026-01-01-alpha.md';
  const beta = 'src/content/posts/2026-01-02-beta.md';

  const branch = 'cairn/posts/2026-01-01-alpha';
  await backend.createBranch(branch, 'main');
  await backend.commit(branch, [{ path: alpha, content: 'branch save' }], AUTHOR, 'save');
  expect(await backend.readFile(alpha, branch)).toBe('branch save');
  expect(await backend.readFile(alpha, 'main')).toBe(DISK[alpha]);

  await backend.commit(branch, [{ path: beta, content: null }], AUTHOR, 'delete');
  expect(await backend.readFile(beta, branch)).toBeNull();

  await backend.commit(
    branch,
    [
      { path: 'src/content/pages/about.md', content: null },
      { path: 'src/content/pages/about-us.md', content: 'renamed' },
    ],
    AUTHOR,
    'rename',
  );
  expect(await backend.readFile('src/content/pages/about-us.md', branch)).toBe('renamed');

  await backend.commit('main', [{ path: alpha, content: 'published' }], AUTHOR, 'publish');
  expect(await backend.readFile(alpha, 'main')).toBe('published');
  await backend.deleteBranch(branch);
  expect(await backend.branchHead(branch)).toBeNull();

  await backend.commit('main', [{ path: CONFIG, content: 'siteName: Real Site\ntidy:\n  enabled: true\n' }], AUTHOR, 'settings');
  expect(await backend.readFile(CONFIG, 'main')).toContain('tidy:');
  await backend.commit('main', [{ path: CONFIG, content: 'siteName: Real Site\nmenus: {}\n' }], AUTHOR, 'nav');
  expect(await backend.readFile(CONFIG, 'main')).toContain('menus:');
  await backend.commit('main', [{ path: MEDIA, content: '{"abc":{}}\n' }], AUTHOR, 'media upload');
  expect(await backend.readFile(MEDIA, 'main')).toBe('{"abc":{}}\n');

  expect(snapshot(root)).toEqual(before);
});

test('the manifest list is the disk manifest until a publish commits an overlay copy', async () => {
  const backend = await backendFor('repository');
  expect(await backend.readFile(MANIFEST, 'main')).toBe(DISK[MANIFEST]);
  await backend.commit('main', [{ path: MANIFEST, content: '{"version":1,"entries":[]}\n' }], AUTHOR, 'publish');
  expect(await backend.readFile(MANIFEST, 'main')).toBe('{"version":1,"entries":[]}\n');
  expect(readFileSync(join(root, MANIFEST), 'utf8')).toBe(DISK[MANIFEST]);
});

test('a repo path that escapes the working tree is refused, never read', async () => {
  const backend = await backendFor('repository');
  await expect(backend.readFile('../outside.md', 'main')).rejects.toThrow(/outside the working tree/);
  await expect(backend.readFile('/etc/passwd', 'main')).rejects.toThrow(/outside the working tree/);
});

test('a head-guarded commit on a moved head throws, and an empty change set is refused', async () => {
  const backend = await backendFor('repository');
  const head = (await backend.branchHead('main'))!;
  await backend.commit('main', [{ path: CONFIG, content: 'a' }], AUTHOR, 'one');
  await expect(backend.commit('main', [{ path: CONFIG, content: 'b' }], AUTHOR, 'two', head)).rejects.toThrow(/head moved/);
  await expect(backend.commit('main', [], AUTHOR, 'none')).rejects.toThrow(/no changes/);
});

test('only the repository backend is ephemeral, never the fixtures backend', async () => {
  expect((await backendFor('repository')).ephemeral).toBe(true);
  expect((await backendFor('fixtures')).ephemeral).toBeUndefined();
  expect((await backendFor()).ephemeral).toBe(true);
});

test("under workerd the repository mode throws, naming content: 'fixtures', and node does not", () => {
  expect(() => devBackendHandle({ runtime: {} })).not.toThrow();
  vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' });
  expect(() => devBackendHandle({ runtime: {} })).toThrow(/content: 'fixtures'/);
  expect(() => devBackendHandle({ runtime: {}, content: 'repository' })).toThrow(/content: 'fixtures'/);
  expect(() => devBackendHandle({ runtime: {}, content: 'fixtures' })).not.toThrow();
});

import { expect, test } from 'vitest';
import { CommitConflictError } from '@glw907/cairn-cms';
import {
  createDevBackend,
  committedFile,
  lastRecordedCommit,
  seedMediaLibrary,
  seedVocabulary,
  SEED_VOCABULARY,
} from './fake-github.js';

// createDevBackend is a conforming Backend over the module-level in-memory store: it mutates no
// global, so each test drives the seven methods directly. Every backend instance shares the one
// process singleton store, which is what lets the recorder route read a prior request's commit.

test('a commit round-trips a file through the named branch tree', async () => {
  const backend = createDevBackend();
  const path = 'src/content/posts/2026-06-roundtrip.md';
  const markdown = '---\ntitle: Round trip\ndate: 2026-06-20\n---\nWritten through the backend.\n';

  await backend.commit(
    'main',
    [{ path, content: markdown }],
    { name: 'Demo Editor', email: 'editor@showcase.test' },
    'add a post',
  );

  // The same store reads it back, through both the Backend and the committedFile fixture accessor.
  expect(await backend.readFile(path, 'main')).toBe(markdown);
  expect(committedFile('main', path)).toBe(markdown);
});

test('a commit records the last commit for the recorder route', async () => {
  const backend = createDevBackend();
  const path = 'src/content/posts/2026-06-recorded.md';
  const author = { name: 'Recorder Editor', email: 'recorder@showcase.test' };

  await backend.commit('main', [{ path, content: 'body\n' }], author, 'record me');

  const recorded = lastRecordedCommit();
  expect(recorded).toMatchObject({ path, branch: 'main', author, committer: null });
});

test('the publish workflow snapshots a pending branch, commits to it, and deletes it', async () => {
  const backend = createDevBackend();
  const pending = 'cairn/posts/2026-06-pending';
  const path = 'src/content/posts/2026-06-pending.md';

  // createBranch snapshots main's tree, so the seeded post is visible on the pending branch.
  await backend.createBranch(pending, 'main');
  expect(await backend.readFile('src/content/posts/2026-06-hello.md', pending)).not.toBeNull();
  expect(await backend.branchHead(pending)).not.toBeNull();
  expect(await backend.listBranches('cairn/')).toContain(pending);

  // A commit lands only on the named pending branch, leaving main untouched (publish-what-you-see).
  await backend.commit(pending, [{ path, content: 'pending body\n' }], { name: 'E', email: 'e@t' }, 'save');
  expect(await backend.readFile(path, pending)).toBe('pending body\n');
  expect(await backend.readFile(path, 'main')).toBeNull();

  // deleteBranch drops the ref; a missing branch then reads as no head and lists out.
  await backend.deleteBranch(pending);
  expect(await backend.branchHead(pending)).toBeNull();
  expect(await backend.listBranches('cairn/')).not.toContain(pending);
});

test('createBranch from an absent source rejects with a conflict-named error', async () => {
  const backend = createDevBackend();
  await expect(backend.createBranch('cairn/posts/x', 'no-such-branch')).rejects.toBeInstanceOf(
    CommitConflictError,
  );
});

test('an empty change set rejects, mirroring the real commitFiles', async () => {
  const backend = createDevBackend();
  await expect(
    backend.commit('main', [], { name: 'E', email: 'e@t' }, 'nothing'),
  ).rejects.toThrow('commitFiles: no changes to commit');
});

test('seedVocabulary writes a committed config, tags two main entries, and seeds an unlisted branch tag', async () => {
  // The vocabulary seed depends on the media seed's content manifest (it patches tags onto it), so
  // seed both. Both are idempotent process singletons, so seeding here is safe alongside the other
  // tests that share the module-level store.
  seedMediaLibrary();
  seedVocabulary();
  const backend = createDevBackend();
  const v = SEED_VOCABULARY;

  // The committed site config reads back on main carrying the vocabulary block: the two in-use
  // listed tags and the unused listed tag, none of them the unlisted candidate.
  const config = await backend.readFile('src/theme/site.config.yaml', 'main');
  expect(config).not.toBeNull();
  expect(config).toContain(`value: ${v.inUse.value}`);
  expect(config).toContain(`label: ${v.inUse.label}`);
  expect(config).toContain(`value: ${v.unused.value}`);
  expect(config).not.toContain(v.unlisted.value);

  // The content manifest on main carries tags on the seed post (the in-use listed tag) and on a
  // Pass B entry (the in-use listed tag plus the second), so the usage index reports them in use.
  const manifestRaw = await backend.readFile('src/content/.cairn/index.json', 'main');
  expect(manifestRaw).not.toBeNull();
  const manifest = JSON.parse(manifestRaw!) as { entries: { id: string; tags?: string[] }[] };
  const seedPost = manifest.entries.find((e) => e.id === '2026-06-hello');
  expect(seedPost?.tags).toContain(v.inUse.value);
  const tagged = manifest.entries.filter((e) => e.tags?.includes(v.inUseGear.value));
  expect(tagged.length).toBeGreaterThan(0);

  // The open branch's tagged markdown carries the unlisted-but-in-use value through the posts
  // concept's `topics:` field, the source the branch arm reads for the seed-section candidate.
  const branchEntry = await backend.readFile(
    'src/content/posts/2026-05-vocab-seed.md',
    'cairn/posts/2026-05-vocab-seed',
  );
  expect(branchEntry).not.toBeNull();
  expect(branchEntry).toContain(`- ${v.unlisted.value}`);
  // The branch lists under the cairn/ prefix, so the cross-branch usage builder reads it.
  expect(await backend.listBranches('cairn/')).toContain('cairn/posts/2026-05-vocab-seed');
});

test('expectedHead is a fail-closed guard: a matching head commits, a moved head conflicts', async () => {
  const backend = createDevBackend();
  const path = 'src/content/.cairn/settings.yml';

  // A matching head commits and advances it.
  const head = await backend.branchHead('main');
  expect(head).not.toBeNull();
  await backend.commit('main', [{ path, content: 'a\n' }], { name: 'E', email: 'e@t' }, 'first', head!);

  // The stale head no longer matches, so a second fail-closed commit throws a conflict the engine
  // detects through isConflict (name match).
  await expect(
    backend.commit('main', [{ path, content: 'b\n' }], { name: 'E', email: 'e@t' }, 'stale', head!),
  ).rejects.toMatchObject({ name: 'CommitConflictError' });
});

import { expect, test } from 'vitest';
import { BranchExistsError, CommitConflictError } from '@glw907/cairn-cms';
import {
  createDevBackend,
  committedFile,
  lastRecordedCommit,
  seedMediaLibrary,
  seedVocabulary,
  seedFragments,
  SEED_VOCABULARY,
  SEED_FRAGMENTS,
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

test('createBranch of an already-existing branch throws BranchExistsError rather than overwriting', async () => {
  const backend = createDevBackend();
  const branch = 'cairn/posts/2026-06-collision';
  await backend.createBranch(branch, 'main');

  // A second create of the same name must refuse, never silently replace the first draft's tree.
  const path = 'src/content/posts/2026-06-collision.md';
  await backend.commit(branch, [{ path, content: 'first draft\n' }], { name: 'E', email: 'e@t' }, 'save');

  await expect(backend.createBranch(branch, 'main')).rejects.toBeInstanceOf(BranchExistsError);
  expect(await backend.readFile(path, branch)).toBe('first draft\n');
});

test('listCommits answers newest first, bounded at limit + 1, empty for a never-published path', async () => {
  const backend = createDevBackend();
  const path = 'src/content/posts/2026-06-history.md';
  const author = { name: 'History Editor', email: 'history@showcase.test' };

  // A never-published path has no commit log yet.
  expect(await backend.listCommits(path, 'main', 25)).toEqual([]);

  const shas: string[] = [];
  for (let i = 0; i < 4; i++) {
    const sha = await backend.commit('main', [{ path, content: `body ${i}\n` }], author, `save ${i}`);
    shas.push(sha);
  }

  // Newest first: the most recent commit's sha leads.
  const full = await backend.listCommits(path, 'main', 25);
  expect(full.map((c) => c.ref)).toEqual([...shas].reverse());
  expect(full[0].author).toEqual(author);
  full.forEach((c) => expect(c.date).toMatch(/^\d{4}-\d{2}-\d{2}T/));

  // Bounded at limit + 1: 4 commits exist, so a limit of 2 truncates to 3 (the caller's own signal).
  const bounded = await backend.listCommits(path, 'main', 2);
  expect(bounded).toHaveLength(3);
  expect(bounded.map((c) => c.ref)).toEqual([shas[3], shas[2], shas[1]]);

  // A different path on the same branch has no history rows.
  expect(await backend.listCommits('src/content/posts/2026-06-unrelated.md', 'main', 25)).toEqual([]);
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

test('seedFragments writes published fragment manifest rows and matching body files on main', async () => {
  // The fragments seed depends on the media seed's content manifest (it appends rows to it), like
  // the vocabulary seed above. Both are idempotent process singletons, so seeding here is safe
  // alongside the other tests that share the module-level store.
  seedMediaLibrary();
  seedFragments();
  const backend = createDevBackend();
  const rows = Object.values(SEED_FRAGMENTS);

  const manifestRaw = await backend.readFile('src/content/.cairn/index.json', 'main');
  expect(manifestRaw).not.toBeNull();
  const manifest = JSON.parse(manifestRaw!) as { entries: { id: string; concept: string; title: string }[] };

  for (const row of rows) {
    const entry = manifest.entries.find((e) => e.id === row.id && e.concept === 'fragments');
    expect(entry).toBeDefined();
    expect(entry?.title).toBe(row.title);

    const body = await backend.readFile(`src/content/fragments/${row.id}.md`, 'main');
    expect(body).not.toBeNull();
    expect(body).toContain(`title: ${row.title}`);
    expect(body).toContain(row.body);
  }
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

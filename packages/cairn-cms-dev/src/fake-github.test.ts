import { expect, test } from 'vitest';
import { CommitConflictError } from '@glw907/cairn-cms';
import { createDevBackend, committedFile, lastRecordedCommit } from './fake-github.js';

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

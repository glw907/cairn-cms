# Content Graph Plan 1: the atomic multi-file commit primitive

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `commitFiles` primitive to the GitHub backend that commits several path changes (writes and deletes) in one commit over the Git Data API, with a non-fast-forward retry, so a later pass can write a content file and the content manifest together atomically.

**Architecture:** A new `commitFiles(repo, changes, opts, token)` in `src/lib/github/repo.ts` beside the existing single-file `commitFile`. It reads the branch head, builds a new tree on the head's tree (so paths it does not name are preserved, including a concurrent commit's on a retry), creates one commit parented on the head, and fast-forwards the ref. A non-fast-forward ref update means the branch moved, so the whole sequence retries on the new head, and exhausting the retries throws the existing `CommitConflictError` so the caller fails safe.

**Tech Stack:** TypeScript, the GitHub Git Data API over `fetch`, vitest (the `unit` project, node).

**Design reference:** `docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md` (approved). This is Plan 1 of the five-plan content-graph initiative.

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. This pass is additive and internal (it adds one unexported-from-the-package function and its tests), and a cairn-cms push deploys no site, so it runs on `main` directly.
- Test-first (TDD): write or change the failing test, run it and watch it fail for the right reason, implement the minimal code, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`).
- Targeted unit test: `npx vitest run --project unit src/tests/unit/github-atomic-commit.test.ts`.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies or code comments; plain voice.
- No dependency changes in this plan, so no relock. Do not run `npm install`.
- This plan adds no package export and changes no export condition, so it does **not** bump the version. The version bumps later in the initiative when a consumable surface lands.
- Known flake: `src/tests/component/MarkdownEditor.test.ts` can fail once on a CodeMirror mount-timeout under parallel load. If `npm test` exits non-zero solely on that, re-run once to confirm green before committing.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` (it imports `@sveltejs/adapter-node`) unless the showcase deps are installed. The svelte-check scan itself is 0 errors 0 warnings either way. If the showcase config import is the only failure, the 0/0 scan result is the gate.

## Reference values (verified against the live tree, 2026-06-02)

- `src/lib/github/repo.ts` is the GitHub backend, built on raw `fetch` (not octokit). It already exports `treeUrl`, `markdownFilesIn`, `listMarkdown`, `contentsUrl`, `readRaw`, `fileSha`, and `commitFile`, and has module-private `ghHeaders(accept, token?)`, `basename`, and `toBase64`. The constant `API = 'https://api.github.com'` is at the top. `commitFiles` is added to this file and reuses `ghHeaders` and `API`.
- `ghHeaders(accept, token?)` returns `{ Accept, 'User-Agent': 'cairn-cms', 'X-GitHub-Api-Version': '2022-11-28', Authorization?: 'Bearer <token>' }`. Use `ghHeaders('application/vnd.github+json', token)` for every Git Data API call, and add `'Content-Type': 'application/json'` on the POST and PATCH bodies, exactly as `commitFile` does.
- `src/lib/github/types.ts` exports `RepoRef` (`{ owner, repo, branch }`), `CommitAuthor` (`{ name, email }`), and `class CommitConflictError extends Error` whose constructor takes one `path: string`. Import these with `import { CommitConflictError } from './types.js';` and `import type { CommitAuthor, RepoRef } from './types.js';` (these imports already exist at the top of `repo.ts`).
- The committer is always omitted, so GitHub attributes the commit to the App (`cairn-cms[bot]`), matching `commitFile`. The author is the editor.
- The GitHub backend is tested in the **unit** project by stubbing `globalThis.fetch` per call with `vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(...)`, asserting the captured request URLs and bodies. See `src/tests/unit/github-commit.test.ts` for the exact pattern this plan mirrors. There is **no** GitHub double in the `integration` project, so this primitive is unit-tested, which corrects the design doc's testing note (the doc said integration; the established pattern is unit fetch-stubbing).
- The Git Data API endpoints this plan uses, all under `${API}/repos/{owner}/{repo}/git/`:
  - `GET ref/heads/{branch}` returns `{ object: { sha } }`, the head commit sha.
  - `GET commits/{commitSha}` returns `{ tree: { sha } }`, the commit's base tree sha.
  - `POST trees` with `{ base_tree, tree: TreeChange[] }` returns `{ sha }`, the new tree sha. A `TreeChange` writes a file with `{ path, mode: '100644', type: 'blob', content }` (raw UTF-8 text, not base64, since the trees API creates the blob), and deletes a path with `{ path, mode: '100644', type: 'blob', sha: null }`.
  - `POST commits` with `{ message, tree, parents: [parentSha], author }` returns `{ sha }`, the new commit sha.
  - `PATCH refs/heads/{branch}` with `{ sha, force: false }` fast-forwards the branch. Note the GET uses singular `ref/`, the PATCH uses plural `refs/`. A non-fast-forward returns status `422`.
- Current version: `package.json` `"version": "0.17.0"`. This plan does not change it.

---

## Task 1: the write-only happy path

**Files:**
- Modify: `src/lib/github/repo.ts`
- Create: `src/tests/unit/github-atomic-commit.test.ts`

Add the `FileChange` type (writes only for now) and a single-pass `commitFiles` that runs the five-call Git Data API sequence for one or more file writes and returns the new commit sha.

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/github-atomic-commit.test.ts`:

```ts
// src/tests/unit/github-atomic-commit.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { commitFiles } from '../../lib/github/repo.js';
import { type RepoRef } from '../../lib/github/types.js';

const REPO: RepoRef = { owner: 'glw907', repo: 'ecnordic-ski', branch: 'main' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('commitFiles', () => {
  it('commits multiple writes in one commit on the current head', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } })) // GET ref
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree' } })) // GET commit
      .mockResolvedValueOnce(json({ sha: 'newtree' })) // POST trees
      .mockResolvedValueOnce(json({ sha: 'commit1' })) // POST commits
      .mockResolvedValueOnce(json({ ref: 'refs/heads/main' })); // PATCH ref

    const sha = await commitFiles(
      REPO,
      [
        { path: 'src/content/posts/a.md', content: '# A' },
        { path: 'src/content/.cairn/index.json', content: '[]' },
      ],
      { message: 'Update posts: a', author: { name: 'Geoff', email: 'g@907.life' } },
      'tok',
    );

    expect(sha).toBe('commit1');
    expect(fetchMock).toHaveBeenCalledTimes(5);

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/git/ref/heads/main');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/git/commits/head1');

    const treeReq = fetchMock.mock.calls[2];
    expect(treeReq[0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/git/trees');
    expect((treeReq[1] as RequestInit).method).toBe('POST');
    const treeBody = JSON.parse((treeReq[1] as RequestInit).body as string);
    expect(treeBody.base_tree).toBe('basetree');
    expect(treeBody.tree).toEqual([
      { path: 'src/content/posts/a.md', mode: '100644', type: 'blob', content: '# A' },
      { path: 'src/content/.cairn/index.json', mode: '100644', type: 'blob', content: '[]' },
    ]);

    const commitReq = fetchMock.mock.calls[3];
    expect(commitReq[0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/git/commits');
    const commitBody = JSON.parse((commitReq[1] as RequestInit).body as string);
    expect(commitBody.tree).toBe('newtree');
    expect(commitBody.parents).toEqual(['head1']);
    expect(commitBody.author).toEqual({ name: 'Geoff', email: 'g@907.life' });
    expect(commitBody.committer).toBeUndefined();
    expect(commitBody.message).toBe('Update posts: a');

    const refReq = fetchMock.mock.calls[4];
    expect(refReq[0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/git/refs/heads/main');
    expect((refReq[1] as RequestInit).method).toBe('PATCH');
    const refBody = JSON.parse((refReq[1] as RequestInit).body as string);
    expect(refBody.sha).toBe('commit1');
    expect(refBody.force).toBe(false);
  });

  it('throws with the status when tree creation fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } }))
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree' } }))
      .mockResolvedValueOnce(new Response('boom', { status: 500 }));
    await expect(
      commitFiles(REPO, [{ path: 'a.md', content: 'x' }], { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toThrow(/500/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/github-atomic-commit.test.ts`
Expected: FAIL. `commitFiles` is not exported from `repo.ts` yet, so the import errors.

- [ ] **Step 3: Implement the write-only single pass**

In `src/lib/github/repo.ts`, append after `commitFile` (the last function in the file):

```ts
/** A path change for an atomic commit: write `content`, or (added in a later task) delete it. */
export interface FileChange {
  path: string;
  content: string;
}

/** A Git Trees API change entry: a blob written from raw content. */
interface TreeChange {
  path: string;
  mode: '100644';
  type: 'blob';
  content: string;
}

/** A Git Data API URL under the repo's `git/` namespace. */
function gitUrl(repo: RepoRef, suffix: string): string {
  return `${API}/repos/${repo.owner}/${repo.repo}/git/${suffix}`;
}

/** The branch head commit sha, through the Git Data API single-ref read. */
async function headCommitSha(repo: RepoRef, token: string): Promise<string> {
  const res = await fetch(gitUrl(repo, `ref/heads/${encodeURIComponent(repo.branch)}`), {
    headers: ghHeaders('application/vnd.github+json', token),
  });
  if (!res.ok) throw new Error(`GitHub ref ${repo.branch} failed: ${res.status}`);
  return ((await res.json()) as { object: { sha: string } }).object.sha;
}

/** The base tree sha of a commit. */
async function commitTreeSha(repo: RepoRef, commitSha: string, token: string): Promise<string> {
  const res = await fetch(gitUrl(repo, `commits/${commitSha}`), {
    headers: ghHeaders('application/vnd.github+json', token),
  });
  if (!res.ok) throw new Error(`GitHub commit ${commitSha} failed: ${res.status}`);
  return ((await res.json()) as { tree: { sha: string } }).tree.sha;
}

/** Map file changes to Git Trees API entries. */
function treeChanges(changes: FileChange[]): TreeChange[] {
  return changes.map((c) => ({ path: c.path, mode: '100644', type: 'blob', content: c.content }));
}

/**
 * Commit several path changes in one commit over the Git Data API. The author is the editor; the
 * committer is omitted, so GitHub attributes the commit to the App. Returns the new commit sha.
 * Builds the new tree on the current head's tree, so paths not named here are preserved.
 *
 * Caller preconditions this layer cannot enforce (the save and lifecycle paths must): every
 * `path` is confined to the site's content directories (the App token can write anywhere in the
 * repo), and `author` is derived from the verified server-side session, never request input.
 */
export async function commitFiles(
  repo: RepoRef,
  changes: FileChange[],
  opts: { message: string; author: CommitAuthor },
  token: string,
): Promise<string> {
  const tree = treeChanges(changes);
  const parent = await headCommitSha(repo, token);
  const baseTree = await commitTreeSha(repo, parent, token);

  const treeRes = await fetch(gitUrl(repo, 'trees'), {
    method: 'POST',
    headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: baseTree, tree }),
  });
  if (!treeRes.ok) throw new Error(`GitHub tree create failed: ${treeRes.status} ${await treeRes.text()}`);
  const newTree = ((await treeRes.json()) as { sha: string }).sha;

  const commitRes = await fetch(gitUrl(repo, 'commits'), {
    method: 'POST',
    headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: opts.message, tree: newTree, parents: [parent], author: opts.author }),
  });
  if (!commitRes.ok) throw new Error(`GitHub commit create failed: ${commitRes.status} ${await commitRes.text()}`);
  const newCommit = ((await commitRes.json()) as { sha: string }).sha;

  const refRes = await fetch(gitUrl(repo, `refs/heads/${encodeURIComponent(repo.branch)}`), {
    method: 'PATCH',
    headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: newCommit, force: false }),
  });
  if (!refRes.ok) throw new Error(`GitHub ref update failed: ${refRes.status} ${await refRes.text()}`);
  return newCommit;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/github-atomic-commit.test.ts`
Expected: PASS, both tests green.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/github/repo.ts src/tests/unit/github-atomic-commit.test.ts
git commit -m "feat(github): atomic multi-file write over the Git Data API

Add commitFiles, which writes one or more files in a single commit by reading
the branch head, building a new tree on the head's tree, creating one commit
parented on the head, and fast-forwarding the ref. The author is the editor and
the committer is omitted, matching commitFile. Building on base_tree means a
path the commit does not name is preserved. Deletes and the non-fast-forward
retry land in the next tasks.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: deletes

**Files:**
- Modify: `src/lib/github/repo.ts`
- Modify: `src/tests/unit/github-atomic-commit.test.ts`

Widen `FileChange.content` to allow `null`, which encodes a delete as a `sha: null` tree entry, and support a commit that mixes a write and a delete.

- [ ] **Step 1: Write the failing test**

In `src/tests/unit/github-atomic-commit.test.ts`, add this test inside the `describe('commitFiles', ...)` block:

```ts
  it('encodes a delete as a null-sha tree entry and supports a mixed write and delete', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } }))
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree' } }))
      .mockResolvedValueOnce(json({ sha: 'newtree' }))
      .mockResolvedValueOnce(json({ sha: 'commit1' }))
      .mockResolvedValueOnce(json({ ref: 'refs/heads/main' }));

    await commitFiles(
      REPO,
      [
        { path: 'src/content/posts/old.md', content: null },
        { path: 'src/content/.cairn/index.json', content: '[]' },
      ],
      { message: 'Delete posts: old', author: { name: 'n', email: 'e' } },
      'tok',
    );

    const treeBody = JSON.parse((fetchMock.mock.calls[2][1] as RequestInit).body as string);
    expect(treeBody.tree).toEqual([
      { path: 'src/content/posts/old.md', mode: '100644', type: 'blob', sha: null },
      { path: 'src/content/.cairn/index.json', mode: '100644', type: 'blob', content: '[]' },
    ]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/github-atomic-commit.test.ts`
Expected: FAIL. `FileChange.content` is `string`, so `content: null` is a type error, and once that is set aside `treeChanges` has no delete branch.

- [ ] **Step 3: Implement deletes**

In `src/lib/github/repo.ts`, change the `FileChange` and `TreeChange` types and `treeChanges`:

```ts
/** A path change for an atomic commit: write `content`, or delete the path when `content` is null. */
export interface FileChange {
  path: string;
  content: string | null;
}

/** A Git Trees API change entry: a blob written from raw content, or a `sha: null` delete. */
interface TreeChange {
  path: string;
  mode: '100644';
  type: 'blob';
  content?: string;
  sha?: null;
}

/** Map file changes to Git Trees API entries, encoding a null content as a delete. */
function treeChanges(changes: FileChange[]): TreeChange[] {
  return changes.map((c) =>
    c.content === null
      ? { path: c.path, mode: '100644', type: 'blob', sha: null }
      : { path: c.path, mode: '100644', type: 'blob', content: c.content },
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/github-atomic-commit.test.ts`
Expected: PASS, all three tests green.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/github/repo.ts src/tests/unit/github-atomic-commit.test.ts
git commit -m "feat(github): encode a delete in the atomic commit

Widen FileChange.content to allow null, which the tree builder encodes as a
sha: null Git Trees entry, so one commit can mix writes and deletes. This is
what lets a rename remove the old path and add the new one in a single commit.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: the non-fast-forward retry and the conflict backstop

**Files:**
- Modify: `src/lib/github/repo.ts`
- Modify: `src/tests/unit/github-atomic-commit.test.ts`

A `force: false` ref update returns `422` when the branch moved under us. Wrap the sequence in a retry loop that re-reads the head and rebuilds on the new base, so a concurrent commit's changes are preserved, and throw `CommitConflictError` after exhausting the retries. A non-422 ref failure still throws immediately.

- [ ] **Step 1: Write the failing tests**

In `src/tests/unit/github-atomic-commit.test.ts`, add the `CommitConflictError` import to the existing types import so the line reads:

```ts
import { CommitConflictError, type RepoRef } from '../../lib/github/types.js';
```

Then add these three tests inside the `describe('commitFiles', ...)` block:

```ts
  it('retries the whole sequence on a non-fast-forward ref update, then succeeds', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      // attempt 1: the ref update is rejected as non-fast-forward
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } }))
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree1' } }))
      .mockResolvedValueOnce(json({ sha: 'newtree1' }))
      .mockResolvedValueOnce(json({ sha: 'commit1' }))
      .mockResolvedValueOnce(new Response('{"message":"Update is not a fast forward"}', { status: 422 }))
      // attempt 2: rebuilt on the new head, succeeds
      .mockResolvedValueOnce(json({ object: { sha: 'head2' } }))
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree2' } }))
      .mockResolvedValueOnce(json({ sha: 'newtree2' }))
      .mockResolvedValueOnce(json({ sha: 'commit2' }))
      .mockResolvedValueOnce(json({ ref: 'refs/heads/main' }));

    const sha = await commitFiles(
      REPO,
      [{ path: 'a.md', content: 'x' }],
      { message: 'm', author: { name: 'n', email: 'e' } },
      'tok',
    );

    expect(sha).toBe('commit2');
    expect(fetchMock).toHaveBeenCalledTimes(10);
    // attempt 2's commit parents the new head, so the intervening commit is preserved
    const commit2Body = JSON.parse((fetchMock.mock.calls[8][1] as RequestInit).body as string);
    expect(commit2Body.parents).toEqual(['head2']);
  });

  it('throws CommitConflictError after exhausting retries on repeated non-fast-forward', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    // 4 attempts (the initial try plus 3 retries), each ending in a 422 ref update
    for (let i = 0; i < 4; i++) {
      fetchMock
        .mockResolvedValueOnce(json({ object: { sha: `head${i}` } }))
        .mockResolvedValueOnce(json({ tree: { sha: `basetree${i}` } }))
        .mockResolvedValueOnce(json({ sha: `newtree${i}` }))
        .mockResolvedValueOnce(json({ sha: `commit${i}` }))
        .mockResolvedValueOnce(new Response('{"message":"Update is not a fast forward"}', { status: 422 }));
    }

    await expect(
      commitFiles(REPO, [{ path: 'a.md', content: 'x' }], { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toBeInstanceOf(CommitConflictError);
    expect(fetchMock).toHaveBeenCalledTimes(20);
  });

  it('throws on a non-422 ref update failure without retrying', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } }))
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree' } }))
      .mockResolvedValueOnce(json({ sha: 'newtree' }))
      .mockResolvedValueOnce(json({ sha: 'commit1' }))
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }));

    await expect(
      commitFiles(REPO, [{ path: 'a.md', content: 'x' }], { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toThrow(/403/);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/github-atomic-commit.test.ts`
Expected: FAIL. The single-pass `commitFiles` throws on the first `422` instead of retrying, so the retry-then-succeed and the exhaustion tests fail. (The non-422 test already passes, since the single pass throws on any non-OK ref update; it stays green through the refactor.)

- [ ] **Step 3: Wrap the sequence in the retry loop**

In `src/lib/github/repo.ts`, add the retry constant above `commitFiles`:

```ts
/** Retries after the initial attempt when the branch moves under an atomic commit. */
const COMMIT_RETRIES = 3;
```

Replace the body of `commitFiles` (keep the signature and the doc comment) with the looped form:

```ts
export async function commitFiles(
  repo: RepoRef,
  changes: FileChange[],
  opts: { message: string; author: CommitAuthor },
  token: string,
): Promise<string> {
  const tree = treeChanges(changes);
  for (let attempt = 0; attempt <= COMMIT_RETRIES; attempt++) {
    const parent = await headCommitSha(repo, token);
    const baseTree = await commitTreeSha(repo, parent, token);

    const treeRes = await fetch(gitUrl(repo, 'trees'), {
      method: 'POST',
      headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_tree: baseTree, tree }),
    });
    if (!treeRes.ok) throw new Error(`GitHub tree create failed: ${treeRes.status} ${await treeRes.text()}`);
    const newTree = ((await treeRes.json()) as { sha: string }).sha;

    const commitRes = await fetch(gitUrl(repo, 'commits'), {
      method: 'POST',
      headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: opts.message, tree: newTree, parents: [parent], author: opts.author }),
    });
    if (!commitRes.ok) throw new Error(`GitHub commit create failed: ${commitRes.status} ${await commitRes.text()}`);
    const newCommit = ((await commitRes.json()) as { sha: string }).sha;

    const refRes = await fetch(gitUrl(repo, `refs/heads/${encodeURIComponent(repo.branch)}`), {
      method: 'PATCH',
      headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommit, force: false }),
    });
    if (refRes.ok) return newCommit;
    // A non-fast-forward means the branch moved; retry on the new head so a concurrent commit
    // is preserved. Any other failure is not a race, so surface it.
    if (refRes.status !== 422) throw new Error(`GitHub ref update failed: ${refRes.status} ${await refRes.text()}`);
  }
  throw new CommitConflictError(`${repo.branch} (atomic commit)`);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/github-atomic-commit.test.ts`
Expected: PASS, all six tests green.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/github/repo.ts src/tests/unit/github-atomic-commit.test.ts
git commit -m "feat(github): retry an atomic commit on a non-fast-forward

A force:false ref update returns 422 when the branch moved under us. Retry the
whole sequence on the fresh head up to three times, rebuilding the tree on the
new base so a concurrent commit's changes survive, and throw CommitConflictError
once the retries are spent so the caller fails safe. A non-422 ref failure still
throws immediately, since it is not a race.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification items (no implementation task)

- **The primitive is unexported from the package entry.** Confirm `commitFiles` is not added to `src/lib/index.ts` (it is an internal backend function, like `commitFile`). The save and lifecycle paths in later plans import it from `../github/repo.js` directly. So this plan adds no public surface and no export-condition change.

## Pass-end review gate

This plan touches the GitHub commit path, which writes to `main` and triggers a deploy on the consuming sites, so it is the highest-stakes code in the initiative. The gate runs `cloudflare-workers-reviewer` (Opus) for the Worker-side fetch and error handling, a high-effort `/code-review` focused on the Git Data API request sequence, the `base_tree` preservation, and the non-fast-forward retry correctness (the new commit must parent the re-read head, never a stale one), and the simplifier over the changed code. The `svelte-reviewer`, `web-auth-security-reviewer`, and `daisyui-a11y-reviewer` do not apply (no Svelte, no auth or session or cookie code, no DaisyUI markup). No `/admin` server surface changed, since no route calls `commitFiles` yet, so the live admin smoke does not apply.

---

## Self-review notes

- **Spec coverage.** This plan implements the design's Plan 1 in full: the Git Data API tree commit (Task 1), the add/modify/remove path changes the rename and the manifest write need (Task 2's delete encoding plus Task 1's writes), and the non-fast-forward race handling (Task 3). The single-file `commitFile` is untouched and is migrated onto the primitive in Plan 2, as the design states.
- **No regression.** `commitFiles` is a new export from `repo.ts`; nothing imports it yet, so no existing caller changes. `commitFile`, `listMarkdown`, `readRaw`, and `fileSha` are unchanged, so the existing `github-commit.test.ts` and `github-read.test.ts` stay green.
- **Type and name consistency.** `commitFiles(repo, changes, opts, token)` keeps the argument order of `commitFile` (repo, target, payload, opts, token), returns the new commit sha as `commitFile` does, and reuses `RepoRef`, `CommitAuthor`, and `CommitConflictError`. `FileChange.content` is `string | null` after Task 2, the type the manifest write and the delete both use. `treeChanges`, `headCommitSha`, `commitTreeSha`, and `gitUrl` are module-private helpers, consistent with `repo.ts`'s existing private helpers (`ghHeaders`, `basename`, `toBase64`).
- **TDD growth.** Task 1 writes the single pass (the first 422 throws), Task 2 widens the type for deletes, and Task 3 wraps the loop so the retry tests fail first for the right reason. Each task's test fails before its implementation lands.
- **Testing altitude.** The GitHub layer is unit-tested by stubbing `fetch` per call, the established pattern in `github-commit.test.ts`, since the `integration` project has no GitHub double. This corrects the design doc's testing note. The five-call sequence and the retry are exact and deterministic under `mockResolvedValueOnce`.
- **Versioning.** Additive and internal, no package export, no export-condition change, so no version bump. The version moves later in the initiative when a consumable surface lands.

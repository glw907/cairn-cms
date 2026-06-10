# Publish Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hold content edits on per-entry branches until a deliberate Publish (per page, plus a site-wide publish-all), with status badges, a discard, and structural-op interactions, per the approved spec.

**Architecture:** A pending entry lives on `cairn/<conceptKey>/<id>`; the ref's existence is the only state. Save commits the entry file (only the entry file) to its branch through the existing atomic pipeline; publish is a content copy to `main` (entry file plus a main-manifest upsert in one commit), never a merge, followed by a branch delete; discard is a branch delete. The admin reads branch-first for a pending entry, derives Published/Edited/New from the ref set, and keeps the `draft:` flag as a Hidden badge.

**Tech Stack:** TypeScript (NodeNext ESM, `.js` specifiers), Vitest (`vitest run`), scripted/stateful fetch doubles for the GitHub layer, `vitest-browser-svelte` for components, svelte-check.

**Spec:** `docs/superpowers/specs/2026-06-10-cairn-publish-workflow-design.md`.

**Project gate (every task ends green):** the task's targeted test passes, `npm run check` 0/0, `npm test` exits 0 (re-run once if only the known `delivery-*-split` import-timeout flake fails). Bump the minor to `0.39.0` in the docs task.

**Two reconciliations against the spec, settled at plan time:**
1. **Consumer shims must change.** The spec said the new actions wire through `composeRuntime` with no consumer change, but site shims enumerate named actions explicitly (`export const actions = { save: ..., delete: ..., rename: ... }`). The changelog and upgrade guide carry `Consumers must:` lines: add `publish`/`discard` to the edit shim and `publishAll` to the list shim.
2. **The branch holds only the entry file, not a manifest copy.** Saves to a branch skip the manifest commit; the link guard and `editLoad`'s link targets read `main`'s manifest. Publish performs the manifest upsert on `main`. This keeps the spec's invariant literal (the branch differs from `main` only at the entry's path) and avoids a stale-branch-manifest class entirely. Consequence: an editor cannot `cairn:` link to a pending-new entry (the guard blocks it as absent on `main`), which is correct, since publishing the linker before the target would break the build.

---

### Task 1: The pending-branch codec

**Files:**
- Create: `src/lib/content/pending.ts`
- Test: `src/tests/unit/content-pending.test.ts`

Pure functions, no I/O. Entry ids and concept ids are slug-safe (`isValidId`), so the ref needs no escaping.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/content-pending.test.ts
import { describe, it, expect } from 'vitest';
import { PENDING_PREFIX, pendingBranch, parsePendingBranch } from '../../lib/content/pending.js';

describe('pendingBranch', () => {
  it('composes the branch name from concept and id', () => {
    expect(pendingBranch('posts', '2026-06-10-summer-race')).toBe('cairn/posts/2026-06-10-summer-race');
    expect(PENDING_PREFIX).toBe('cairn/');
  });
});

describe('parsePendingBranch', () => {
  it('parses a bare branch name and a fully qualified ref', () => {
    expect(parsePendingBranch('cairn/posts/hello-world')).toEqual({ concept: 'posts', id: 'hello-world' });
    expect(parsePendingBranch('refs/heads/cairn/posts/hello-world')).toEqual({ concept: 'posts', id: 'hello-world' });
  });

  it('returns null for non-cairn refs and malformed names', () => {
    expect(parsePendingBranch('main')).toBeNull();
    expect(parsePendingBranch('refs/heads/main')).toBeNull();
    expect(parsePendingBranch('cairn/posts')).toBeNull();
    expect(parsePendingBranch('cairn//x')).toBeNull();
  });

  it('keeps an id containing further hyphens intact', () => {
    expect(parsePendingBranch('cairn/pages/a-b-c')).toEqual({ concept: 'pages', id: 'a-b-c' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/tests/unit/content-pending.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/content/pending.ts
// The pending-branch codec (publish-workflow spec): a pending entry lives on
// `cairn/<conceptKey>/<id>`, and the ref's existence is the only pending state. Concept ids and
// entry ids are slug-safe, so the name needs no escaping; the parser is the codec's inverse.

/** Every pending branch sits under this prefix; one matching-refs call lists them all. */
export const PENDING_PREFIX = 'cairn/';

/** The branch name holding an entry's pending edits. */
export function pendingBranch(concept: string, id: string): string {
  return `${PENDING_PREFIX}${concept}/${id}`;
}

/** Parse a branch name or fully qualified ref back to its entry, or null for any other ref. */
export function parsePendingBranch(ref: string): { concept: string; id: string } | null {
  const name = ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : ref;
  if (!name.startsWith(PENDING_PREFIX)) return null;
  const rest = name.slice(PENDING_PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const concept = rest.slice(0, slash);
  const id = rest.slice(slash + 1);
  if (!id || id.includes('/')) return null;
  return { concept, id };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/tests/unit/content-pending.test.ts`
Expected: PASS.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`

```bash
git add src/lib/content/pending.ts src/tests/unit/content-pending.test.ts
git commit -m "$(printf 'Add the pending-branch codec\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>')"
```

---

### Task 2: A stateful in-memory GitHub double

**Files:**
- Create: `src/tests/unit/_github-double.ts`
- Test: `src/tests/unit/github-double.test.ts`

The existing per-file scripted fetch mocks cannot express branch state (a save lands on a branch, a publish reads it back, a discard removes it). This double models a tiny multi-branch repo: branches map to file trees, the contents API reads honor `?ref=`, the Git Data API commit sequence mutates the named branch, and refs can be created, deleted, and listed by prefix. It stubs `globalThis.fetch` the way `commitFetch` does today, so the real `repo.ts`/`branches.ts` transports run unmodified against it.

- [ ] **Step 1: Write the failing self-test**

The self-test proves the double against the real transports (this pins the double's fidelity, so every later test can trust it):

```ts
// src/tests/unit/github-double.test.ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { readRaw, commitFiles, listMarkdown } from '../../lib/github/repo.js';
import type { RepoRef } from '../../lib/github/types.js';

const repo: RepoRef = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };
afterEach(() => vi.restoreAllMocks());

describe('GithubDouble', () => {
  it('serves contents reads per branch and 404s a missing file', async () => {
    const gh = new GithubDouble({ main: { 'src/content/posts/a.md': 'A' } });
    gh.install();
    expect(await readRaw(repo, 'src/content/posts/a.md', 't')).toBe('A');
    expect(await readRaw(repo, 'src/content/posts/missing.md', 't')).toBeNull();
    expect(await readRaw({ ...repo, branch: 'cairn/posts/a' }, 'src/content/posts/a.md', 't')).toBeNull();
  });

  it('applies an atomic commit to the named branch only', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/a', 'main');
    gh.install();
    await commitFiles(
      { ...repo, branch: 'cairn/posts/a' },
      [{ path: 'src/content/posts/a.md', content: 'pending' }],
      { message: 'm', author: { name: 'Ed', email: 'ed@t' } },
      't',
    );
    expect(gh.read('cairn/posts/a', 'src/content/posts/a.md')).toBe('pending');
    expect(gh.read('main', 'src/content/posts/a.md')).toBeNull();
  });

  it('lists markdown through the trees API and deletes via null content', async () => {
    const gh = new GithubDouble({ main: { 'src/content/posts/a.md': 'A', 'src/content/posts/b.md': 'B' } });
    gh.install();
    const files = await listMarkdown(repo, 'src/content/posts', 't');
    expect(files.map((f) => f.id).sort()).toEqual(['a', 'b']);
    await commitFiles(repo, [{ path: 'src/content/posts/a.md', content: null }], { message: 'd', author: { name: 'E', email: 'e@t' } }, 't');
    expect(gh.read('main', 'src/content/posts/a.md')).toBeNull();
  });

  it('creates, lists, and deletes refs through the raw API routes', async () => {
    const gh = new GithubDouble({ main: { 'x.md': 'x' } });
    gh.install();
    const headSha = gh.headSha('main');
    let res = await fetch('https://api.github.com/repos/o/r/git/refs', {
      method: 'POST',
      body: JSON.stringify({ ref: 'refs/heads/cairn/posts/a', sha: headSha }),
    });
    expect(res.status).toBe(201);
    res = await fetch('https://api.github.com/repos/o/r/git/matching-refs/heads/cairn/');
    const refs = (await res.json()) as { ref: string }[];
    expect(refs.map((r) => r.ref)).toEqual(['refs/heads/cairn/posts/a']);
    expect(gh.read('cairn/posts/a', 'x.md')).toBe('x'); // branched from main's tree
    res = await fetch('https://api.github.com/repos/o/r/git/refs/heads/cairn/posts/a', { method: 'DELETE' });
    expect(res.status).toBe(204);
    res = await fetch('https://api.github.com/repos/o/r/git/matching-refs/heads/cairn/');
    expect(await res.json()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/tests/unit/github-double.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the double**

```ts
// src/tests/unit/_github-double.ts
// A stateful in-memory GitHub for the publish-workflow tests. Branches map to flat
// path-to-content trees; the API surface is the slice the engine's transports use: contents
// reads (?ref= aware), the recursive trees listing, the Git Data commit sequence
// (ref read, commit read, trees POST, commits POST, ref PATCH), and ref create/delete plus
// matching-refs listing. `install()` stubs global fetch; vi.restoreAllMocks() in afterEach
// removes it. Commit shas are sequential and per-branch trees are copied on write, so a
// branch created from main snapshots main's tree at that moment, like a real git ref.
import { vi } from 'vitest';

type Tree = Record<string, string>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

export class GithubDouble {
  branches = new Map<string, Tree>();
  private shas = new Map<string, string>();
  private seq = 0;
  /** Pending tree-create payloads keyed by their returned sha, applied at ref PATCH time. */
  private stagedTrees = new Map<string, { base: string; changes: { path: string; content?: string; sha?: null }[] }>();
  private stagedCommits = new Map<string, string>();
  calls: { method: string; url: string; body?: unknown }[] = [];

  constructor(initial: Record<string, Tree>) {
    for (const [name, tree] of Object.entries(initial)) {
      this.branches.set(name, { ...tree });
      this.shas.set(name, this.nextSha());
    }
  }

  private nextSha(): string {
    return `sha${++this.seq}`;
  }

  read(branch: string, path: string): string | null {
    return this.branches.get(branch)?.[path] ?? null;
  }

  headSha(branch: string): string {
    return this.shas.get(branch) ?? '';
  }

  createBranch(name: string, from: string): void {
    this.branches.set(name, { ...(this.branches.get(from) ?? {}) });
    this.shas.set(name, this.nextSha());
  }

  install(): void {
    vi.stubGlobal('fetch', vi.fn(this.handle.bind(this)));
  }

  private async handle(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const rawBody = init?.body ?? (input instanceof Request ? await input.text() : undefined);
    const body = typeof rawBody === 'string' && rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : undefined;
    this.calls.push({ method, url, body });
    const u = new URL(url);
    const path = u.pathname;

    // Contents API: GET /repos/o/r/contents/<path>?ref=<branch>
    const contents = path.match(/^\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/);
    if (contents && method === 'GET') {
      const branch = u.searchParams.get('ref') ?? 'main';
      const file = this.read(branch, decodeURIComponent(contents[1]));
      if (file === null) return new Response('Not Found', { status: 404 });
      return new Response(file, { status: 200 });
    }

    // Trees listing: GET /repos/o/r/git/trees/<branch>?recursive=1
    const treeList = path.match(/^\/repos\/[^/]+\/[^/]+\/git\/trees\/([^/]+)$/);
    if (treeList && method === 'GET') {
      const branch = decodeURIComponent(treeList[1]);
      const tree = this.branches.get(branch);
      if (!tree) return new Response('Not Found', { status: 404 });
      return json({ truncated: false, tree: Object.keys(tree).map((p) => ({ path: p, type: 'blob' })) });
    }

    // Single-ref read: GET /repos/o/r/git/ref/heads/<branch>
    const refRead = path.match(/^\/repos\/[^/]+\/[^/]+\/git\/ref\/heads\/(.+)$/);
    if (refRead && method === 'GET') {
      const branch = decodeURIComponent(refRead[1]);
      if (!this.branches.has(branch)) return new Response('Not Found', { status: 404 });
      return json({ object: { sha: this.headSha(branch) } });
    }

    // Matching refs: GET /repos/o/r/git/matching-refs/heads/<prefix>
    const matching = path.match(/^\/repos\/[^/]+\/[^/]+\/git\/matching-refs\/heads\/(.*)$/);
    if (matching && method === 'GET') {
      const prefix = decodeURIComponent(matching[1]);
      const refs = [...this.branches.keys()]
        .filter((b) => b.startsWith(prefix))
        .sort()
        .map((b) => ({ ref: `refs/heads/${b}`, object: { sha: this.headSha(b) } }));
      return json(refs);
    }

    // Ref create: POST /repos/o/r/git/refs  { ref: 'refs/heads/x', sha }
    if (/\/git\/refs$/.test(path) && method === 'POST') {
      const ref = String(body?.ref ?? '');
      const name = ref.replace(/^refs\/heads\//, '');
      if (this.branches.has(name)) return new Response('Reference already exists', { status: 422 });
      const source = [...this.shas.entries()].find(([, sha]) => sha === body?.sha)?.[0];
      this.createBranch(name, source ?? 'main');
      return json({ ref }, 201);
    }

    // Ref delete: DELETE /repos/o/r/git/refs/heads/<branch>
    const refDel = path.match(/^\/repos\/[^/]+\/[^/]+\/git\/refs\/heads\/(.+)$/);
    if (refDel && method === 'DELETE') {
      const branch = decodeURIComponent(refDel[1]);
      if (!this.branches.has(branch)) return new Response('Not Found', { status: 404 });
      this.branches.delete(branch);
      this.shas.delete(branch);
      return new Response(null, { status: 204 });
    }

    // Commit read: GET /repos/o/r/git/commits/<sha>  (base tree is the sha itself here)
    if (/\/git\/commits\/[^/]+$/.test(path) && method === 'GET') {
      return json({ tree: { sha: path.split('/').pop() } });
    }

    // Tree create: POST /repos/o/r/git/trees  { base_tree, tree }
    if (/\/git\/trees$/.test(path) && method === 'POST') {
      const sha = this.nextSha();
      this.stagedTrees.set(sha, {
        base: String(body?.base_tree ?? ''),
        changes: (body?.tree ?? []) as { path: string; content?: string; sha?: null }[],
      });
      return json({ sha });
    }

    // Commit create: POST /repos/o/r/git/commits  { tree, parents }
    if (/\/git\/commits$/.test(path) && method === 'POST') {
      const sha = this.nextSha();
      this.stagedCommits.set(sha, String(body?.tree ?? ''));
      return json({ sha });
    }

    // Ref update (the atomic-commit landing): PATCH /repos/o/r/git/refs/heads/<branch>
    if (refDel && method === 'PATCH') {
      const branch = decodeURIComponent(refDel[1]);
      const tree = this.branches.get(branch);
      const staged = this.stagedTrees.get(this.stagedCommits.get(String(body?.sha ?? '')) ?? '');
      if (!tree || !staged) return new Response('Unprocessable', { status: 422 });
      for (const change of staged.changes) {
        if (change.sha === null) delete tree[change.path];
        else tree[change.path] = change.content ?? '';
      }
      this.shas.set(branch, String(body?.sha));
      return json({ ref: `refs/heads/${branch}` });
    }

    return new Response(`github-double: unhandled ${method} ${url}`, { status: 500 });
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/tests/unit/github-double.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Project gate, then commit**

```bash
git add src/tests/unit/_github-double.ts src/tests/unit/github-double.test.ts
git commit -m "$(printf 'Add a stateful in-memory GitHub double for branch-state tests\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>')"
```

---

### Task 3: The branch transport

**Files:**
- Create: `src/lib/github/branches.ts`
- Test: `src/tests/unit/github-branches.test.ts`

Pure transport over the Git Data API, mirroring `repo.ts`'s style (same headers idiom, errors carry the status and operation).

- [ ] **Step 1: Write the failing test** (against the Task 2 double)

```ts
// src/tests/unit/github-branches.test.ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { branchHeadSha, createBranch, deleteBranch, listBranches } from '../../lib/github/branches.js';
import type { RepoRef } from '../../lib/github/types.js';

const repo: RepoRef = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };
afterEach(() => vi.restoreAllMocks());

describe('branches transport', () => {
  it('reads a branch head and returns null for a missing branch', async () => {
    const gh = new GithubDouble({ main: { 'a.md': 'A' } });
    gh.install();
    expect(await branchHeadSha(repo, 'main', 't')).toBe(gh.headSha('main'));
    expect(await branchHeadSha(repo, 'cairn/posts/x', 't')).toBeNull();
  });

  it('creates a branch from a source sha and lists it by prefix', async () => {
    const gh = new GithubDouble({ main: { 'a.md': 'A' } });
    gh.install();
    await createBranch(repo, 'cairn/posts/x', gh.headSha('main'), 't');
    expect(gh.read('cairn/posts/x', 'a.md')).toBe('A');
    expect(await listBranches(repo, 'cairn/', 't')).toEqual(['cairn/posts/x']);
    expect(await listBranches(repo, 'cairn/pages/', 't')).toEqual([]);
  });

  it('deletes a branch and tolerates deleting a missing one', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/x', 'main');
    gh.install();
    await deleteBranch(repo, 'cairn/posts/x', 't');
    expect(await listBranches(repo, 'cairn/', 't')).toEqual([]);
    await expect(deleteBranch(repo, 'cairn/posts/x', 't')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/tests/unit/github-branches.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/github/branches.ts
// Branch (ref) operations for the publish workflow, over the Git Data API. A pending entry's
// branch is created lazily at first save, listed by the `cairn/` prefix to derive pending
// state, and deleted by publish and discard. All three are covered by the App's contents
// permission; no PRs are involved.
import type { RepoRef } from './types.js';

const API = 'https://api.github.com';

function headers(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'cairn-cms',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function gitUrl(repo: RepoRef, suffix: string): string {
  return `${API}/repos/${repo.owner}/${repo.repo}/git/${suffix}`;
}

/** The head commit sha of a branch, or null when the branch does not exist. */
export async function branchHeadSha(repo: RepoRef, branch: string, token: string): Promise<string | null> {
  const res = await fetch(gitUrl(repo, `ref/heads/${encodeURIComponent(branch)}`), { headers: headers(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ref ${branch} failed: ${res.status}`);
  return ((await res.json()) as { object: { sha: string } }).object.sha;
}

/** Create `branch` pointing at `fromSha`. Throws on any failure including an existing ref. */
export async function createBranch(repo: RepoRef, branch: string, fromSha: string, token: string): Promise<void> {
  const res = await fetch(gitUrl(repo, 'refs'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
  });
  if (!res.ok) throw new Error(`GitHub branch create ${branch} failed: ${res.status} ${await res.text()}`);
}

/** Delete `branch`. A 404 (already gone) is success: the desired state holds. */
export async function deleteBranch(repo: RepoRef, branch: string, token: string): Promise<void> {
  const res = await fetch(gitUrl(repo, `refs/heads/${encodeURIComponent(branch)}`), {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok && res.status !== 404) throw new Error(`GitHub branch delete ${branch} failed: ${res.status}`);
}

/** Branch names under `prefix`, sorted. The matching-refs API needs no pagination at cairn's scale. */
export async function listBranches(repo: RepoRef, prefix: string, token: string): Promise<string[]> {
  const res = await fetch(gitUrl(repo, `matching-refs/heads/${prefix}`), { headers: headers(token) });
  if (!res.ok) throw new Error(`GitHub matching-refs ${prefix} failed: ${res.status}`);
  const refs = (await res.json()) as { ref: string }[];
  return refs.map((r) => r.ref.replace(/^refs\/heads\//, ''));
}
```

- [ ] **Step 4: Run the test to verify it passes**

- [ ] **Step 5: Project gate, then commit**

```bash
git add src/lib/github/branches.ts src/tests/unit/github-branches.test.ts
git commit -m "$(printf 'Add the branch transport for pending refs\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>')"
```

---

### Task 4: Saves and creates target the pending branch

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (saveAction, createAction)
- Test: `src/tests/unit/content-routes-save.test.ts` (rewrite the commit-shape cases onto the double), `src/tests/unit/content-routes-pending.test.ts` (create)

Behavior change, handled in-task like Pass 2's Task 3: a save no longer commits to `main` and no longer writes the manifest. It ensures the entry's branch exists (created from `main`'s head on first save), commits one change (the entry file) to the branch, and logs `commit.succeeded` with a `branch` field. The link guard reads `main`'s manifest (reconciliation 2). `createAction`'s clobber check also refuses when a pending branch already exists for the id.

Implementation sketch for `saveAction` (replacing the manifest-upsert-and-commit block; the validation, path confinement, and redirect bounds stay):

```ts
    const token = await mintToken(event.platform?.env ?? {});

    // The link guard reads main's manifest (the authoritative one; branches carry no manifest
    // copy) with this entry's row upserted in memory, so a self-link and links to published
    // targets resolve. A link to a target absent from main hard-blocks: publishing this entry
    // before its target would break the build.
    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
    const row = manifestEntryFromFile(concept, { path, raw: markdown });
    const upserted = upsertEntry(manifest, row);
    // ... the existing absent/draft classification over extractCairnLinks(body), unchanged ...

    // Ensure the pending branch exists, then commit the entry file (only it) there.
    const branch = pendingBranch(concept.id, id);
    const branchRepo = { ...runtime.backend, branch };
    if ((await branchHeadSha(runtime.backend, branch, token)) === null) {
      const mainHead = await branchHeadSha(runtime.backend, runtime.backend.branch, token);
      if (mainHead === null) throw error(500, 'Cannot read the default branch');
      await createBranch(runtime.backend, branch, mainHead, token);
    }
    const commitFields = { concept: concept.id, id, editor: editor.email, branch };
    try {
      await commitFiles(branchRepo, [{ path, content: markdown }], { message: `Update ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } }, token);
      log.info('commit.succeeded', commitFields);
    } catch (err) { /* unchanged conflict handling */ }
```

- [ ] **Step 1: Write the failing tests.** New `content-routes-pending.test.ts` (on the double): a first save creates `cairn/posts/<id>` from main and the file lands on the branch, not `main`, and no manifest path appears in the branch commit; a second save reuses the branch; the link guard still blocks an absent target (read from `main`'s manifest); `createAction` bounces when a pending branch exists for the slug. Rewrite the two commit-shape cases in `content-routes-save.test.ts` onto the double (assert the branch tree, the absent manifest change, and the author attribution).
- [ ] **Step 2: Run to verify the new assertions fail.**
- [ ] **Step 3: Implement** (the sketch above; `createAction` gains a `branchHeadSha` existence bounce after the existing `readRaw` clobber check).
- [ ] **Step 4: Targeted tests pass. Step 5: project gate** (other suites must stay green; `content-routes-edit/list` tests do not touch save). **Step 6: commit.**

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-save.test.ts src/tests/unit/content-routes-pending.test.ts
git commit -m "$(printf 'Hold saves on the per-entry pending branch\n\nA save ensures cairn/<concept>/<id> exists (cut from main lazily),\ncommits only the entry file there, and leaves main and the manifest\nuntouched until publish. The link guard reads main'\''s manifest.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>')"
```

---

### Task 5: Branch-first reads and pending status in the loads

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (editLoad, listLoad, layoutLoad)
- Test: `src/tests/unit/content-routes-edit.test.ts`, `content-routes-list.test.ts`, `content-routes-layout.test.ts` (extend, on the double where branch state matters)

Additive type changes:
- `EntrySummary` gains `status: 'published' | 'edited' | 'new'`.
- `EditData` gains `pending: boolean` (a branch exists), `published: boolean` (the file exists on `main`), and `publishedFlash: boolean` plus `discardedFlash: boolean` (from `?published=1` / `?discarded=1`).
- `LayoutData` gains `pendingEntries: { concept: string; id: string }[] | null` (null when GitHub is unreachable, so the topbar hides the action rather than lying).
- `layoutLoad` becomes async (it now mints a token and lists `cairn/` refs, degrading to `null` on any failure).

Load behavior:
- `editLoad` checks `branchHeadSha` for the entry's branch; when present, reads the entry file from the branch (`{ ...backend, branch }`) and sets `pending: true`. The manifest read stays on `main`. `published` comes from a `main` read (when pending) or the existing read.
- `listLoad` lists `cairn/<concept>/` refs once. Main-listed entries get `status: 'edited'` when their ref exists, else `'published'`. Ref-only ids append rows read from their branch with `status: 'new'` (degrading to an id-only row on a read failure, like `summarize`).

- [ ] **Step 1: Write the failing tests.** Edit: a pending entry's body comes from the branch and `pending`/`published` are set; a non-pending entry behaves as today (`pending: false`). List: an edited entry is marked `edited`, a branch-only id appears as `new`, no refs means all `published`. Layout: `pendingEntries` carries parsed `{concept, id}` pairs, and a token-mint failure yields `null` (not a throw).
- [ ] **Step 2: Verify failures. Step 3: Implement. Step 4: Targeted pass. Step 5: Gate.** The existing `content-routes-edit/list/layout` suites run on scripted doubles with no `cairn/` refs; extend their fetch scripts to 404 the new `git/ref/heads/cairn/...` probe and return `[]` from `matching-refs` so their existing cases stay valid.
- [ ] **Step 6: Commit** (`Read pending entries branch-first and derive entry status`).

---

### Task 6: Publish and discard actions, and the log events

**Files:**
- Modify: `src/lib/log/events.ts` (three names), `src/lib/sveltekit/content-routes.ts` (publishAction, discardAction, returned from the factory)
- Test: `src/tests/unit/content-routes-publish.test.ts` (create, on the double)

```ts
// events.ts additions to the union:
  | 'entry.published'
  | 'entry.discarded'
  | 'publish.failed'
```

`publishAction` (POST from the edit page): validate id; read the entry file from its branch (no branch: redirect back with an error flash); read `main`'s manifest; upsert the row derived from the branch file; one `commitFiles` on `main` with the entry file and the manifest, message `Publish <label>: <id>`, authored by the editor; `log.info('entry.published', { concept, id, editor, batch: false })`; `deleteBranch`; redirect to `?published=1`. A commit failure logs `publish.failed` with the `commit.failed` reason/error shape and redirects or rethrows exactly as `saveAction` does on conflict.

`discardAction`: validate id; `deleteBranch` (tolerant of already-gone); `log.info('entry.discarded', { concept, id, editor })`; redirect to the edit page with `?discarded=1` when the entry exists on `main`, else to the concept list (the entry is gone entirely).

- [ ] **Step 1: Write the failing tests.** Publish lands the file and the upserted manifest row on `main` in one commit and deletes the branch; publish of a never-published (new) entry adds its row; publish with no branch redirects with an error and commits nothing; discard deletes the branch and routes by `main` existence; the three events fire with their fields (spy on console like `auth-request.test.ts` does).
- [ ] **Steps 2 through 5: fail, implement, pass, gate. Step 6: Commit** (`Add the publish and discard actions`).

---

### Task 7: Publish-all

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (publishAllAction)
- Test: `src/tests/unit/content-routes-publish.test.ts` (extend)

`publishAllAction` (POST, mounted on the concept list shim; the topbar form targets `/admin/<firstConcept>?/publishAll` from anywhere): list all `cairn/` refs; parse each to `{concept, id}` (skipping refs whose concept is not configured); read each entry file from its branch; read `main`'s manifest once; build one `FileChange[]` with every entry file plus the manifest with every row upserted; one `commitFiles` on `main` (`Publish ${n} entries`, authored by the editor); `log.info('entry.published', { concept, id, editor, batch: true })` per entry; delete every consumed branch; redirect to `/admin/<firstConcept>?publishedAll=<n>`. Zero pending refs redirects back with no commit. A failure logs `publish.failed` and surfaces like a save conflict. `ListData` gains `publishedAll: number | null` read from the query for the list page's flash.

- [ ] **Step 1: Write the failing tests** (a multi-concept batch lands atomically, branches all gone, zero-pending no-op). **Steps 2 through 5: implement, pass, gate. Step 6: Commit** (`Add site-wide publish-all`).

---

### Task 8: Structural ops against a pending branch

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (deleteEntry, renameAction)
- Test: `src/tests/unit/content-routes-delete.test.ts`, `content-routes-rename.test.ts` (extend, on the double where needed)

- `deleteEntry`: after the existing inbound-link gate, delete the entry's pending branch too (before the `main` commit; tolerant if absent). When the entry exists only on its branch (the `main` read is null), skip the `main` commit entirely: delete the branch and redirect to the list. The inbound gate still runs (it passes vacuously for a pending-new entry).
- `renameAction`: immediately after the id validation, refuse while a pending branch exists: `return fail(409, { renameError: 'This entry has unpublished edits. Publish or discard them, then rename.' })`.

- [ ] **Step 1: Write the failing tests** (delete cascades the branch; delete of a new-only entry removes just the branch; rename refuses while pending and proceeds when not). **Steps 2 through 5: implement, pass, gate. Step 6: Commit** (`Cascade deletes to the pending branch and refuse renames while pending`).

---

### Task 9: The admin UI (badges, publish and discard controls, topbar publish-all)

**Files:**
- Modify: `src/lib/components/ConceptList.svelte`, `src/lib/components/EditPage.svelte`, `src/lib/components/AdminLayout.svelte`, `src/lib/components/DeleteDialog.svelte`
- Test: `src/tests/component/ConceptList.test.ts`, `EditPage.test.ts`, `AdminLayout.test.ts` (extend)

Read `docs/internal/admin-design-system.md` first (its component recipes and scoping rules are load-bearing). The pieces:

- ConceptList: replace the Draft/Published badge pair with the status vocabulary. `entry.status === 'new'` renders `badge-info` "New", `'edited'` renders `badge-warning` "Edited", `'published'` renders `badge-ghost` "Published"; independently, `entry.draft` renders `badge-neutral` "Hidden" beside it. A `publishedAll` flash renders through the existing `role="status"` pattern ("Published N entries.").
- EditPage: when `data.pending`, a slim pending banner above the editor ("Unpublished changes. The live site still shows the last published version." or, for `!data.published`, "Not yet published."); a Publish submit button (`formaction="?/publish"`, `btn-primary`) beside Save; and a Discard changes button opening a confirm dialog (the `DeleteDialog` pattern: native `<dialog>`, form POST to `?/discard` with `CsrfField`) whose copy branches on `data.published` ("restore the live version" versus "delete this entry; it has never been published"). The `?published=1` and `?discarded=1` flashes reuse the existing `saved` confirmation strip.
- AdminLayout: in the topbar (right of the palette trigger), when `data.pendingEntries?.length`, a "Publish site (N)" button opening a confirm `<dialog>` listing the pending ids grouped by concept label, whose form POSTs to `/admin/${data.concepts[0].id}?/publishAll` with a `CsrfField`. With `pendingEntries` null or empty, render nothing.
- DeleteDialog: an optional `pending: boolean` prop adds one sentence: "Unpublished edits to this entry are discarded too."

- [ ] **Step 1: Write the failing component tests.** The list renders each badge per status and Hidden stacks with Edited; the edit page shows the banner, the Publish button, and the discard confirm copy in both variants; the layout shows the publish-all trigger with the count and hides it when null or empty; the dialogs carry the CSRF field.
- [ ] **Steps 2 through 5: fail, implement, pass, gate** (including `npm run check:prose` for the new admin copy). **Step 6: Commit** (`Add the publish-workflow admin UI`).

---

### Task 10: Showcase wiring and the golden-path E2E

**Files:**
- Modify: `examples/showcase/src/routes/admin/(app)/[concept]/+page.server.ts` (add `publishAll: routes.publishAllAction`), `.../[concept]/[id]/+page.server.ts` (add `publish: routes.publishAction`, `discard: routes.discardAction`), `examples/showcase/src/hooks.server.ts` (the fake-github gains the ref routes, same shapes as the Task 2 double), `examples/showcase/e2e/golden-path.spec.ts`
- Test: the E2E itself plus `cd examples/showcase && npm run check` (0 errors in `src/`)

The golden path extends to the new flow: create, save, the list shows New, publish, the fake repo's `main` holds the file, edit again, save, Edited, discard, back to the published content.

- [ ] **Step 1: Extend the fake and wire the shims. Step 2: Extend the spec and run the E2E. Steps 3 through 5: gate, commit** (`Wire the publish workflow through the showcase and E2E`).

---

### Task 11: Docs, changelog, and the 0.39.0 bump

**Files:**
- Modify: `docs/reference/sveltekit.md` (the `createContentRoutes` return signature: the three new actions, the widened `LayoutData`/`EntrySummary`/`EditData`/`ListData`), `docs/reference/components.md` (the new props and controls), `docs/reference/admin-routes.md` (the shim examples gain the three action lines), `docs/reference/log-events.md` (three event rows plus field notes), `docs/explanation/architecture.md` and `docs/explanation/security-model.md` (the branch model; the App writes under `cairn/` refs and the content dirs on `main`), `docs/guides/upgrade-cairn.md`, `CHANGELOG.md`, `package.json` (0.39.0), `docs/superpowers/specs/2026-06-10-cairn-publish-workflow-design.md` (one-line reconciliation notes), and a new editor-facing guide `docs/guides/publish-and-discard.md`
- The changelog entry carries: `Consumers must: add publish/discard to the edit shim's actions and publishAll to the list shim's actions; saves no longer deploy the site, Publish does.`

- [ ] **Step 1: Write the docs and bump. Step 2: Run the three doc gates plus the full gate. Step 3: Commit** (`Document the publish workflow; bump 0.39.0`).

---

## Self-review notes

- **Spec coverage.** Branch codec and stateless pending (Tasks 1-3), hold-back save with lazy branch creation (4), branch-first reads and the status vocabulary (5), per-page publish as a copy-not-merge with the manifest upsert (6), site-wide publish-all atomic batch (7), discard with New/Edited divergence (6), delete cascade and rename refusal (8), badges, banner, buttons, and topbar with the design system (9), showcase plus E2E (10), docs dimension with the editor guide and the trust-boundary update (11). The Hidden re-presentation rides Task 9 (the badge rename); the `draft:` mechanics are untouched everywhere.
- **The two reconciliations** (consumer shims must change; branches carry no manifest copy) are stated up top and land in the spec file in Task 11.
- **Type consistency.** `pendingBranch(concept.id, id)` everywhere; `branchHeadSha(repo, branch, token)` returns `string | null` and doubles as the existence probe; `EntrySummary.status` is `'published' | 'edited' | 'new'`; `LayoutData.pendingEntries` is `{ concept: string; id: string }[] | null`.
- **Order-of-operations risks.** Tasks 4 and 5 leave a one-task window where saves land on branches but reads are main-only; no release happens mid-plan. Publish deletes the branch only after the `main` commit lands, so a crash between the two leaves a stale branch whose re-publish is idempotent (the same content copies again). Publish-all's branch deletes follow one atomic commit; a partial delete failure leaves idempotent stragglers, not lost content.
- **Review gate (ritual, not tasks).** `web-auth-security-reviewer` (new POST actions, path confinement on branch names from refs, CSRF on the new forms), `svelte-reviewer` (the three components, the async layout load), `cloudflare-workers-reviewer` (the added GitHub calls per admin load, degrade paths), `daisyui-a11y-reviewer` (badges, dialogs, live regions). The live admin smoke applies (the `/admin` surface changes substantially): follow `docs/internal/admin-smoke-test.md`.

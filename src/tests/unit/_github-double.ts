// A stateful in-memory GitHub for the publish-workflow tests. Branches map to flat
// path-to-content trees; the API surface is the slice the engine's transports use: contents
// reads (?ref= aware, and a historical commit sha via the recorded `history`), the recursive
// trees listing, the Git Data commit sequence (ref read, commit read, trees POST, commits POST,
// ref PATCH), the commits-API path filter (`listCommits`), and ref create/delete plus
// matching-refs listing. `install()` stubs global fetch; vi.restoreAllMocks() in afterEach
// removes it. Commit shas are sequential and per-branch trees are copied on write, so a
// branch created from main snapshots main's tree at that moment, like a real git ref.
import { vi } from 'vitest';

type Tree = Record<string, string>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** One commit landed on a branch, as `listCommits` and the history-sha content read replay it. */
interface HistoryRecord {
  branch: string;
  sha: string;
  /** The paths this commit changed, the same set `listCommits`'s path filter matches against. */
  paths: string[];
  author: { name: string; email: string };
  /** ISO 8601; a synthetic, monotonically increasing stamp (landing order, not a wall clock). */
  date: string;
  /** Each changed path's new content, `null` for a delete, so a historical-sha read can replay it. */
  contentByPath: Record<string, string | null>;
}

export class GithubDouble {
  branches = new Map<string, Tree>();
  private shas = new Map<string, string>();
  private seq = 0;
  /** Pending tree-create payloads keyed by their returned sha, applied at ref PATCH time. */
  private stagedTrees = new Map<string, { base: string; changes: { path: string; content?: string; sha?: null }[] }>();
  private stagedCommits = new Map<string, string>();
  /** Author and message staged at commit-create time, applied to the `history` row at ref PATCH. */
  private stagedCommitMeta = new Map<string, { author: { name: string; email: string }; message: string }>();
  /**
   * Every commit landed through the real ref-PATCH sequence, newest last, the source `listCommits`
   *  and a historical-sha content read replay from. A test simulating an out-of-band commit (the
   *  double's own `commit()` helper) does not append here; push a record directly when a test
   *  needs that commit to be `listCommits`-visible too.
   */
  history: HistoryRecord[] = [];
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

  /** Write a file straight onto a branch and move its head, like a commit landing out of band.
   *  Tests use it to simulate a concurrent save racing a publish. */
  commit(branch: string, path: string, content: string): void {
    const tree = this.branches.get(branch);
    if (!tree) throw new Error(`github-double: no branch ${branch}`);
    tree[path] = content;
    this.shas.set(branch, this.nextSha());
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

    // Contents API: GET /repos/o/r/contents/<path>?ref=<branch-or-historical-sha>. A `ref` naming
    // a live branch reads its current tree; a `ref` naming a recorded commit sha instead (a
    // revert's target, read at a past commit rather than a branch head) replays that commit's own
    // change to the path from `history`, the same commit `listCommits` would have offered it from.
    const contents = path.match(/^\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/);
    if (contents && method === 'GET') {
      const ref = u.searchParams.get('ref') ?? 'main';
      const filePath = decodeURIComponent(contents[1]);
      if (this.branches.has(ref)) {
        const file = this.read(ref, filePath);
        if (file === null) return new Response('Not Found', { status: 404 });
        return new Response(file, { status: 200 });
      }
      const historical = this.history.find((h) => h.sha === ref && h.paths.includes(filePath));
      const content = historical?.contentByPath[filePath];
      if (content === undefined || content === null) return new Response('Not Found', { status: 404 });
      return new Response(content, { status: 200 });
    }

    // Commits API path filter: GET /repos/o/r/commits?path=<path>&sha=<ref>&per_page=<n>. Newest
    // first, scoped to commits recorded on the named branch (a branch snapshot inherits no
    // ancestor history here, since every test that needs an entry's ref-membership check reaches
    // it through a real commit on that same branch). A `sha` naming no known branch is a 404, the
    // same "unknown ref" signal the real API gives; a known branch with no matching commits is an
    // empty 200, mirroring the never-published-entry case `fetchCommitLog` degrades to `[]` for.
    const commitsList = path.match(/^\/repos\/[^/]+\/[^/]+\/commits$/);
    if (commitsList && method === 'GET') {
      const ref = u.searchParams.get('sha') ?? 'main';
      const filterPath = u.searchParams.get('path') ?? '';
      if (!this.branches.has(ref)) return new Response('Not Found', { status: 404 });
      const perPage = Number(u.searchParams.get('per_page') ?? '30') || 30;
      // filter() already copies, so reverse() rewrites that copy, never the recorded history.
      const rows = this.history
        .filter((h) => h.branch === ref && h.paths.includes(filterPath))
        .reverse()
        .slice(0, perPage)
        .map((h) => ({ sha: h.sha, commit: { author: h.author, committer: { date: h.date } } }));
      return json(rows);
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

    // Matching refs: GET /repos/o/r/git/matching-refs/heads/<prefix>. Paginates like GitHub:
    // 30 per page by default, `per_page` honored up to 100, a `Link: rel="next"` header while
    // more pages remain.
    const matching = path.match(/^\/repos\/[^/]+\/[^/]+\/git\/matching-refs\/heads\/(.*)$/);
    if (matching && method === 'GET') {
      const prefix = decodeURIComponent(matching[1]);
      const all = [...this.branches.keys()].filter((b) => b.startsWith(prefix)).sort();
      const perPage = Math.min(Number(u.searchParams.get('per_page') ?? '30') || 30, 100);
      const page = Math.max(Number(u.searchParams.get('page') ?? '1') || 1, 1);
      const slice = all.slice((page - 1) * perPage, page * perPage);
      const refs = slice.map((b) => ({ ref: `refs/heads/${b}`, object: { sha: this.headSha(b) } }));
      const headers: Record<string, string> = {};
      if (page * perPage < all.length) {
        const next = new URL(u);
        next.searchParams.set('per_page', String(perPage));
        next.searchParams.set('page', String(page + 1));
        headers.Link = `<${next}>; rel="next"`;
      }
      return new Response(JSON.stringify(refs), { status: 200, headers });
    }

    // Ref create: POST /repos/o/r/git/refs  { ref: 'refs/heads/x', sha }. Real GitHub creates
    // the ref AT the posted sha, so the new branch's head equals the source's head, which is what
    // revert's fail-closed expectedHead (the validated main head) depends on; minting a fresh sha
    // here would make every such commit conflict spuriously.
    if (/\/git\/refs$/.test(path) && method === 'POST') {
      const ref = String(body?.ref ?? '');
      const name = ref.replace(/^refs\/heads\//, '');
      if (this.branches.has(name)) return new Response('Reference already exists', { status: 422 });
      const source = [...this.shas.entries()].find(([, sha]) => sha === body?.sha)?.[0];
      this.branches.set(name, { ...(this.branches.get(source ?? 'main') ?? {}) });
      this.shas.set(name, String(body?.sha ?? this.nextSha()));
      return json({ ref }, 201);
    }

    // Ref delete: DELETE /repos/o/r/git/refs/heads/<branch>
    const refWrite = path.match(/^\/repos\/[^/]+\/[^/]+\/git\/refs\/heads\/(.+)$/);
    if (refWrite && method === 'DELETE') {
      const branch = decodeURIComponent(refWrite[1]);
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

    // Commit create: POST /repos/o/r/git/commits  { tree, parents, message, author }
    if (/\/git\/commits$/.test(path) && method === 'POST') {
      const sha = this.nextSha();
      this.stagedCommits.set(sha, String(body?.tree ?? ''));
      this.stagedCommitMeta.set(sha, {
        author: (body?.author as { name: string; email: string } | undefined) ?? { name: '', email: '' },
        message: String(body?.message ?? ''),
      });
      return json({ sha });
    }

    // Ref update (the atomic-commit landing): PATCH /repos/o/r/git/refs/heads/<branch>
    if (refWrite && method === 'PATCH') {
      const branch = decodeURIComponent(refWrite[1]);
      const tree = this.branches.get(branch);
      const commitSha = String(body?.sha ?? '');
      const staged = this.stagedTrees.get(this.stagedCommits.get(commitSha) ?? '');
      if (!tree || !staged) return new Response('Unprocessable', { status: 422 });
      const contentByPath: Record<string, string | null> = {};
      for (const change of staged.changes) {
        if (change.sha === null) {
          delete tree[change.path];
          contentByPath[change.path] = null;
        } else {
          tree[change.path] = change.content ?? '';
          contentByPath[change.path] = change.content ?? '';
        }
      }
      this.shas.set(branch, commitSha);
      const meta = this.stagedCommitMeta.get(commitSha);
      this.history.push({
        branch,
        sha: commitSha,
        paths: staged.changes.map((c) => c.path),
        author: meta?.author ?? { name: '', email: '' },
        // A synthetic, strictly increasing timestamp: landing order is what "newest first" and
        // the staleness/ref-membership checks actually depend on, not a real wall clock.
        date: new Date(Date.UTC(2026, 0, 1) + this.history.length * 86_400_000).toISOString(),
        contentByPath,
      });
      return json({ ref: `refs/heads/${branch}` });
    }

    return new Response(`github-double: unhandled ${method} ${url}`, { status: 500 });
  }
}

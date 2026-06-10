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

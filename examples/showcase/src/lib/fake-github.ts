// A dev-only GitHub double for the showcase. It intercepts api.github.com so the engine's reads
// and commits land in an in-memory repo instead of the real API, and records the last commit so
// the E2E can assert the author, the committer, and the branch the commit landed on. Installed
// once from hooks.server.ts; never part of the published engine.
//
// The repo is branch-aware for the publish workflow: each branch holds a flat path-to-content
// map, creating a ref snapshots its source branch's tree (like a real git ref), and the Git Data
// commit sequence lands on whichever branch its final ref PATCH names.
//
// URL patterns reconciled against src/lib/github/repo.ts and src/lib/github/branches.ts:
//   listMarkdown  -> GET    /repos/o/r/git/trees/<branch>?recursive=1
//   readRaw       -> GET    /repos/o/r/contents/<path>?ref=<branch>, Accept: application/vnd.github.raw
//   fileSha       -> GET    /repos/o/r/contents/<path>?ref=<branch>, Accept: application/vnd.github+json -> { sha }
//   commitFile    -> PUT    /repos/o/r/contents/<path>   body: { message, content, branch, author, sha? }
//                    (single-file path, still used by nav-routes.ts)
//   branchHeadSha -> GET    /repos/o/r/git/ref/heads/<branch> -> { object: { sha } }, 404 when absent
//   createBranch  -> POST   /repos/o/r/git/refs               body: { ref, sha }
//   deleteBranch  -> DELETE /repos/o/r/git/refs/heads/<branch>
//   listBranches  -> GET    /repos/o/r/git/matching-refs/heads/<prefix>
//   commitFiles   -> the atomic Git Data sequence (content + manifest in one commit):
//                    GET /git/ref/heads/<branch>, GET /git/commits/<sha>, POST /git/trees,
//                    POST /git/commits, PATCH /git/refs/heads/<branch> (applies the staged tree)
//                    (no committer field; GitHub attributes commits to cairn-cms[bot])
//
// Branch names arrive encodeURIComponent'd in ref URLs (cairn%2Fposts%2Fid), so every captured
// segment decodes before the branch lookup.

/** The shape the E2E reads from /test/last-commit. */
export interface RecordedCommit {
  path: string;
  /** The branch the commit landed on: a `cairn/<concept>/<id>` pending branch, or `main`. */
  branch: string;
  author: { name: string; email: string };
  /** Absent from the cairn commit body; GitHub attributes the committer to cairn-cms[bot]. */
  committer: unknown;
  content: string;
}

let lastCommit: RecordedCommit | null = null;
let installed = false;

/** One branch's working tree: repo path to file content. */
type Tree = Map<string, string>;

/** A Git Trees API change entry: a content write, or a `sha: null` delete. */
interface TreeChange {
  path: string;
  content?: string;
  sha?: string | null;
}

// The seeded post path must match the adapter's posts dir plus a valid id filename.
// cairn.config.ts sets dir: 'src/content/posts'; idFromFilename strips the .md suffix.
const SEED_POST = 'src/content/posts/2026-06-hello.md';

let seq = 0;
function nextSha(): string {
  return `sha-${++seq}`;
}

const branches = new Map<string, Tree>([
  [
    'main',
    new Map([[SEED_POST, '---\ntitle: Hello\ndate: 2026-06-01\n---\nThe original body.\n']]),
  ],
]);
const heads = new Map<string, string>([['main', nextSha()]]);

/** Tree-create payloads keyed by their returned sha, applied at ref PATCH time. */
const stagedTrees = new Map<string, TreeChange[]>();
/** Commit-create payloads keyed by their returned sha: the tree to apply plus the recorded author. */
const stagedCommits = new Map<
  string,
  { treeSha: string; author: { name: string; email: string }; committer: unknown }
>();

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function lastRecordedCommit(): RecordedCommit | null {
  return lastCommit;
}

export function installFakeGitHub(): void {
  if (installed) return;
  installed = true;
  const real = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    if (!url.includes('api.github.com')) return real(input, init);

    const u = new URL(url);
    // pathname keeps %2F intact, so an encoded branch name stays one segment until decoded.
    const route = u.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const accept = headers['Accept'] ?? headers['accept'] ?? '';
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;

    // listBranches: every ref under the prefix (the prefix arrives unencoded, slashes literal).
    const matching = route.match(/\/git\/matching-refs\/heads\/(.*)$/);
    if (method === 'GET' && matching) {
      const prefix = decodeURIComponent(matching[1]);
      const refs = [...branches.keys()]
        .filter((name) => name.startsWith(prefix))
        .sort()
        .map((name) => ({ ref: `refs/heads/${name}`, object: { sha: heads.get(name) } }));
      return json(refs);
    }

    // branchHeadSha / commitFiles head read: the single-ref read, 404 when the branch is absent.
    const refRead = route.match(/\/git\/ref\/heads\/(.+)$/);
    if (method === 'GET' && refRead) {
      const branch = decodeURIComponent(refRead[1]);
      if (!branches.has(branch)) return new Response('Not Found', { status: 404 });
      return json({ object: { sha: heads.get(branch) } });
    }

    // createBranch: snapshot the source branch's tree (the branch whose head matches the sha).
    if (method === 'POST' && route.endsWith('/git/refs')) {
      const name = String(body.ref ?? '').replace(/^refs\/heads\//, '');
      if (branches.has(name)) return new Response('Reference already exists', { status: 422 });
      const source = [...heads.entries()].find(([, sha]) => sha === body.sha)?.[0] ?? 'main';
      branches.set(name, new Map(branches.get(source)));
      heads.set(name, nextSha());
      return json({ ref: `refs/heads/${name}` }, 201);
    }

    const refWrite = route.match(/\/git\/refs\/heads\/(.+)$/);

    // deleteBranch: 404 when already gone (the engine treats that as success).
    if (method === 'DELETE' && refWrite) {
      const branch = decodeURIComponent(refWrite[1]);
      if (!branches.has(branch)) return new Response('Not Found', { status: 404 });
      branches.delete(branch);
      heads.delete(branch);
      return new Response(null, { status: 204 });
    }

    // The atomic-commit landing: apply the staged tree to the named branch and record the
    // content file (the .md entry, not the manifest) as the last commit.
    if (method === 'PATCH' && refWrite) {
      const branch = decodeURIComponent(refWrite[1]);
      const tree = branches.get(branch);
      const staged = stagedCommits.get(String(body.sha ?? ''));
      const changes = staged ? stagedTrees.get(staged.treeSha) : undefined;
      if (!tree || !staged || !changes) return new Response('Unprocessable', { status: 422 });
      for (const change of changes) {
        if (change.sha === null) tree.delete(change.path);
        else if (typeof change.content === 'string') tree.set(change.path, change.content);
      }
      heads.set(branch, String(body.sha));
      const fileEntry =
        changes.find((e) => e.path.endsWith('.md') && typeof e.content === 'string') ??
        changes.find((e) => typeof e.content === 'string');
      if (fileEntry) {
        lastCommit = {
          path: fileEntry.path,
          branch,
          author: staged.author,
          committer: staged.committer,
          content: fileEntry.content ?? '',
        };
      }
      return json({ object: { sha: body.sha } });
    }

    // listMarkdown: all blobs on the branch, so the engine can filter by dir prefix.
    const treeList = route.match(/\/git\/trees\/([^/]+)$/);
    if (method === 'GET' && treeList) {
      const tree = branches.get(decodeURIComponent(treeList[1]));
      if (!tree) return new Response('Not Found', { status: 404 });
      return json({ tree: [...tree.keys()].map((path) => ({ path, type: 'blob' })), truncated: false });
    }

    // Tree create: stage the changes; they apply to a branch only at ref PATCH time.
    if (method === 'POST' && route.endsWith('/git/trees')) {
      const sha = nextSha();
      stagedTrees.set(sha, (body.tree ?? []) as TreeChange[]);
      return json({ sha });
    }

    // commitTreeSha: the parent commit's tree (the sha itself stands in for it here).
    if (method === 'GET' && /\/git\/commits\/[^/]+$/.test(route)) {
      return json({ tree: { sha: route.split('/').pop() } });
    }

    // Commit create: stage the tree pointer and the author for the ref PATCH that lands it.
    if (method === 'POST' && route.endsWith('/git/commits')) {
      const sha = nextSha();
      stagedCommits.set(sha, {
        treeSha: String(body.tree ?? ''),
        author: body.author as { name: string; email: string },
        // committer is not set by cairn; record null so the E2E can assert its absence.
        committer: body.committer ?? null,
      });
      return json({ sha });
    }

    // Contents API: PUT (commitFile) or GET (readRaw / fileSha), honoring ?ref= for any branch.
    const contentsMatch = route.match(/\/contents\/(.+)$/);
    const path = contentsMatch ? decodeURIComponent(contentsMatch[1]) : '';

    if (method === 'PUT' && path) {
      const branch = String(body.branch ?? 'main');
      const tree = branches.get(branch);
      if (!tree) return new Response('Not Found', { status: 404 });
      const encoded = String(body.content ?? '');
      const decoded =
        typeof atob === 'function' ? atob(encoded) : Buffer.from(encoded, 'base64').toString('utf-8');
      tree.set(path, decoded);
      heads.set(branch, nextSha());
      lastCommit = {
        path,
        branch,
        author: body.author as { name: string; email: string },
        committer: body.committer ?? null,
        content: decoded,
      };
      return json({ commit: { sha: heads.get(branch) } });
    }

    // GET: distinguish readRaw (Accept: application/vnd.github.raw) from fileSha (JSON).
    if (method === 'GET' && path) {
      const branch = u.searchParams.get('ref') ?? 'main';
      const content = branches.get(branch)?.get(path);
      if (content === undefined) return new Response('Not Found', { status: 404 });
      if (accept.includes('raw')) return new Response(content, { status: 200 });
      return json({ sha: 'old-sha', name: path.split('/').pop() });
    }

    // Fallthrough: installation token exchange and other GitHub API calls.
    if (url.includes('/access_tokens')) {
      return json({ token: 'dev-token' }, 201);
    }

    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;
}

// A dev-only GitHub double for the showcase. It intercepts api.github.com so a save reaches an
// in-memory repo instead of the real API, and records the last commit so the E2E can assert the
// author and committer. Installed once from hooks.server.ts; never part of the published engine.
//
// URL patterns reconciled against src/lib/github/repo.ts:
//   listMarkdown -> GET /repos/owner/repo/git/trees/<branch>?recursive=1, Accept: application/vnd.github+json
//   readRaw      -> GET /repos/owner/repo/contents/<path>?ref=<branch>,   Accept: application/vnd.github.raw
//   fileSha      -> GET /repos/owner/repo/contents/<path>?ref=<branch>,   Accept: application/vnd.github+json -> { sha }
//   commitFile   -> PUT /repos/owner/repo/contents/<path>,                 body: { message, content, branch, author, sha? }
//                   (single-file path, still used by nav-routes.ts)
//   commitFiles  -> the atomic Git Data API path content saves now use (content + manifest in one commit):
//                     headCommitSha  -> GET   /repos/owner/repo/git/ref/heads/<branch>   -> { object: { sha } }
//                     commitTreeSha  -> GET   /repos/owner/repo/git/commits/<sha>        -> { tree: { sha } }
//                     create tree    -> POST  /repos/owner/repo/git/trees                 body: { base_tree, tree[] }
//                     create commit  -> POST  /repos/owner/repo/git/commits               body: { message, tree, parents, author }
//                     update ref     -> PATCH /repos/owner/repo/git/refs/heads/<branch>   body: { sha, force }
//                   (no committer field; GitHub attributes commit to cairn-cms[bot])

/** The shape the E2E reads from /test/last-commit. */
export interface RecordedCommit {
  path: string;
  author: { name: string; email: string };
  /** Absent from the cairn commit body; GitHub attributes the committer to cairn-cms[bot]. */
  committer: unknown;
  content: string;
}

let lastCommit: RecordedCommit | null = null;
let installed = false;

/** Tree entries from the most recent POST /git/trees, read by the following POST /git/commits. */
let pendingTree: Array<{ path: string; content?: string; sha?: string | null }> = [];

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// The seeded post path must match the adapter's posts dir plus a valid id filename.
// cairn.config.ts sets dir: 'src/content/posts'; idFromFilename strips the .md suffix.
const SEED_POST = 'src/content/posts/2026-06-hello.md';

const seededFiles = new Map<string, string>([
  [SEED_POST, '---\ntitle: Hello\ndate: 2026-06-01\n---\nThe original body.\n'],
]);

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

    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const accept = headers['Accept'] ?? headers['accept'] ?? '';

    // Git Trees API: list all blobs so listMarkdown can filter by dir prefix.
    if (method === 'GET' && url.includes('/git/trees/')) {
      const tree = [...seededFiles.keys()].map((path) => ({ path, type: 'blob' }));
      return json({ tree, truncated: false });
    }

    // Atomic commitFiles path (content saves: content + manifest in one commit).
    const bareUrl = url.split('?')[0];

    // headCommitSha: the branch head through the single-ref read.
    if (method === 'GET' && url.includes('/git/ref/heads/')) {
      return json({ object: { sha: 'parent-commit-sha' } });
    }

    // commitTreeSha: the parent commit's tree sha.
    if (method === 'GET' && url.includes('/git/commits/')) {
      return json({ tree: { sha: 'base-tree-sha' } });
    }

    // Create tree: apply each blob to the in-memory repo, and remember the entries for the commit.
    if (method === 'POST' && bareUrl.endsWith('/git/trees')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        tree: Array<{ path: string; content?: string; sha?: string | null }>;
      };
      pendingTree = body.tree ?? [];
      for (const entry of pendingTree) {
        if (typeof entry.content === 'string') seededFiles.set(entry.path, entry.content);
        else if (entry.sha === null) seededFiles.delete(entry.path);
      }
      return json({ sha: 'new-tree-sha' });
    }

    // Create commit: record the content file (the .md entry, not the manifest) as the last commit.
    if (method === 'POST' && bareUrl.endsWith('/git/commits')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        author: { name: string; email: string };
        committer?: unknown;
      };
      const fileEntry =
        pendingTree.find((e) => e.path.endsWith('.md') && typeof e.content === 'string') ??
        pendingTree.find((e) => typeof e.content === 'string');
      if (fileEntry) {
        lastCommit = {
          path: fileEntry.path,
          author: body.author,
          committer: body.committer ?? null,
          content: fileEntry.content ?? '',
        };
      }
      return json({ sha: 'new-commit-sha' });
    }

    // Update ref: fast-forward the branch to the new commit.
    if (method === 'PATCH' && url.includes('/git/refs/heads/')) {
      return json({ object: { sha: 'new-commit-sha' } });
    }

    // Contents API: PUT (commitFile) or GET (readRaw / fileSha).
    // commitFile PUT uses /contents/<path> with NO ?ref query param.
    // readRaw and fileSha GET use /contents/<path>?ref=<branch>.
    const contentsMatch = decodeURIComponent(url).match(/\/contents\/([^?]+)/);
    const path = contentsMatch ? contentsMatch[1] : '';

    if (method === 'PUT') {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        content: string;
        message: string;
        author: { name: string; email: string };
        committer?: unknown;
        sha?: string;
      };
      const decoded =
        typeof atob === 'function'
          ? atob(body.content)
          : Buffer.from(body.content, 'base64').toString('utf-8');
      seededFiles.set(path, decoded);
      // committer is not set by commitFile; record null so the E2E can assert its absence.
      lastCommit = {
        path,
        author: body.author,
        committer: body.committer ?? null,
        content: decoded,
      };
      return new Response(JSON.stringify({ commit: { sha: 'showcase-sha' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET: distinguish readRaw (Accept: application/vnd.github.raw) from fileSha (JSON).
    if (path) {
      if (seededFiles.has(path)) {
        if (accept.includes('raw')) {
          return new Response(seededFiles.get(path), { status: 200 });
        }
        // fileSha: return the JSON metadata with a stable sha.
        return new Response(JSON.stringify({ sha: 'old-sha', name: path.split('/').pop() }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not Found', { status: 404 });
    }

    // Fallthrough: installation token exchange and other GitHub API calls.
    if (url.includes('/access_tokens')) {
      return new Response(JSON.stringify({ token: 'dev-token' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;
}

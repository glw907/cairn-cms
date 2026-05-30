// A dev-only GitHub double for the showcase. It intercepts api.github.com so a save reaches an
// in-memory repo instead of the real API, and records the last commit so the E2E can assert the
// author and committer. Installed once from hooks.server.ts; never part of the published engine.
//
// URL patterns reconciled against src/lib/github/repo.ts:
//   listMarkdown -> GET /repos/owner/repo/git/trees/<branch>?recursive=1, Accept: application/vnd.github+json
//   readRaw      -> GET /repos/owner/repo/contents/<path>?ref=<branch>,   Accept: application/vnd.github.raw
//   fileSha      -> GET /repos/owner/repo/contents/<path>?ref=<branch>,   Accept: application/vnd.github+json -> { sha }
//   commitFile   -> PUT /repos/owner/repo/contents/<path>,                 body: { message, content, branch, author, sha? }
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
    if (url.includes('/git/trees/')) {
      const tree = [...seededFiles.keys()].map((path) => ({ path, type: 'blob' }));
      return new Response(JSON.stringify({ tree, truncated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
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

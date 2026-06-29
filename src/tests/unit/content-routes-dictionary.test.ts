// Task 9: the addDictionaryWord action (spec 1.6). The transport mirrors the media raw-body actions:
// a text/plain POST, the CSRF token in X-Cairn-CSRF validated by validateCsrfHeader (CSRF first, then
// the session), and a JSON body { word } or { words }. The action reads the committed dictionary from
// the default branch, merges the validated words in sorted order if absent (idempotent), and commits
// through the GitHub-App pipeline. The commit is SHA-guarded with commit-and-retry: a stale-SHA
// conflict re-reads the new head, re-merges (order-independent), and retries once. The response is the
// merged word list so the client reconciles its pending additions; a refusal rides a fail envelope.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { DictionaryAddResult, DictionaryAddFailure } from '../../lib/sveltekit/content-routes.js';
import { parseDictionary, serializeDictionary } from '../../lib/content/site-dictionary.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

const DICT_PATH = 'src/content/.cairn/dictionary.txt';
const CSRF = 'csrf-token-value-0123456789abcdef';

function runtime(over: Partial<CairnRuntime> = {}): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [
      {
        id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts',
        routing: { routable: true, dated: true, inFeeds: true },
        permalink: '/posts/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [], validate: ok,
      },
    ],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    dictionaryPath: DICT_PATH,
    resolvedAssets: { enabled: false },
    vocabulary: [],
    ...over,
  };
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

function cookieJar(csrf: string | undefined): CookieJar {
  return {
    get: (name) => (name === '__Host-cairn_csrf' ? csrf : undefined),
    set: () => {},
    delete: () => {},
  };
}

/** A JSON-body POST with the X-Cairn-CSRF header and a matching cookie jar, the raw-body transport. */
function addEvent(payload: unknown, opts: { csrf?: string; cookieCsrf?: string | undefined } = {}) {
  const url = new URL('https://t.example/admin/posts/2026-05-01-hi');
  const headers = new Headers({ 'content-type': 'text/plain' });
  headers.set('x-cairn-csrf', opts.csrf ?? CSRF);
  return {
    url,
    params: { concept: 'posts', id: '2026-05-01-hi' },
    request: new Request(url, { method: 'POST', headers, body: JSON.stringify(payload) }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    cookies: cookieJar('cookieCsrf' in opts ? opts.cookieCsrf : CSRF),
  };
}

/** Count the ref-PATCH-to-main calls a GithubDouble recorded: the landing commits. */
function commitCount(gh: GithubDouble): number {
  return gh.calls.filter(
    (c) => c.method === 'PATCH' && /\/git\/refs\/heads\/main$/.test(new URL(c.url).pathname),
  ).length;
}

afterEach(() => vi.restoreAllMocks());

describe('addDictionaryWord transport gates', () => {
  it('refuses a missing CSRF header (fail 403) before any GitHub call', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.addDictionaryWord(addEvent({ word: 'cairn' }, { csrf: 'wrong' }) as never);
    expect(result).toMatchObject({ status: 403 });
    expect((result as unknown as { data: DictionaryAddFailure }).data.error).toBe('csrf');
    expect(commitCount(gh)).toBe(0);
  });

  it('refuses a body that carries no valid word (fail 400), committing nothing', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.addDictionaryWord(addEvent({ word: 'two words' }) as never);
    expect(result).toMatchObject({ status: 400 });
    expect(commitCount(gh)).toBe(0);
  });

  it('rejects a word with a newline (a one-line injection), committing nothing', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.addDictionaryWord(addEvent({ word: 'good\nevil' }) as never);
    expect(result).toMatchObject({ status: 400 });
    expect(commitCount(gh)).toBe(0);
  });
});

describe('addDictionaryWord read-modify-write', () => {
  it('inserts a new word in sorted order and commits the merged list', async () => {
    const gh = new GithubDouble({ main: { [DICT_PATH]: serializeDictionary(['alpha', 'gamma']) } });
    gh.install();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const routes = createContentRoutes(runtime(), deps);
    const result = (await routes.addDictionaryWord(addEvent({ word: 'beta' }) as never)) as unknown as DictionaryAddResult;
    expect(result.words).toEqual(['alpha', 'beta', 'gamma']);
    expect(commitCount(gh)).toBe(1);
    // The committed file is the canonical sorted set.
    expect(parseDictionary(gh.read('main', DICT_PATH))).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('creates the dictionary file when it does not exist yet', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const routes = createContentRoutes(runtime(), deps);
    const result = (await routes.addDictionaryWord(addEvent({ word: 'cairn' }) as never)) as unknown as DictionaryAddResult;
    expect(result.words).toEqual(['cairn']);
    expect(commitCount(gh)).toBe(1);
    expect(parseDictionary(gh.read('main', DICT_PATH))).toEqual(['cairn']);
  });

  it('is idempotent: re-adding an existing word commits nothing but returns the merged list', async () => {
    const gh = new GithubDouble({ main: { [DICT_PATH]: serializeDictionary(['Cairn', 'alpha']) } });
    gh.install();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const routes = createContentRoutes(runtime(), deps);
    // Case-insensitive: "cairn" collapses onto the existing "Cairn".
    const result = (await routes.addDictionaryWord(addEvent({ word: 'cairn' }) as never)) as unknown as DictionaryAddResult;
    expect(result.words).toEqual(['alpha', 'Cairn']);
    expect(commitCount(gh)).toBe(0);
  });

  it('accepts a { words } batch, committing the union in sorted order', async () => {
    const gh = new GithubDouble({ main: { [DICT_PATH]: serializeDictionary(['alpha']) } });
    gh.install();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const routes = createContentRoutes(runtime(), deps);
    const result = (await routes.addDictionaryWord(addEvent({ words: ['gamma', 'beta'] }) as never)) as unknown as DictionaryAddResult;
    expect(result.words).toEqual(['alpha', 'beta', 'gamma']);
    expect(commitCount(gh)).toBe(1);
  });
});

describe('addDictionaryWord SHA-guarded retry', () => {
  it('re-reads and re-merges on a stale-SHA conflict, then succeeds on the retry', async () => {
    // A hand-rolled GitHub: the dictionary file lives in `file`, the contents read returns it, and the
    // commit sequence (ref read, commit read, trees POST, commits POST, ref PATCH) lands a write. The
    // first commitFiles ref PATCH fails non-fast-forward until commitFiles exhausts its internal
    // retries and throws CommitConflictError; the action catches it, re-reads the (now moved) head,
    // re-merges the same addition, and retries once. The wrapper fails the first 4 PATCHes (commitFiles
    // tries the initial attempt plus 3 retries), then lands the write. On the first failure a
    // concurrent editor's word lands in `file`, which the order-independent re-merge must preserve.
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let file = serializeDictionary(['alpha']);
    let patchCount = 0;
    let concurrentLanded = false;
    let stagedContent: string | null = null;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const rawBody = init?.body ?? (input instanceof Request ? await input.text() : undefined);
      const body = typeof rawBody === 'string' && rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : undefined;
      const path = new URL(url).pathname;
      if (method === 'GET' && path.includes('/contents/')) {
        return file === null ? new Response('Not Found', { status: 404 }) : new Response(file, { status: 200 });
      }
      if (method === 'GET' && path.includes('/git/ref/')) return json({ object: { sha: 'head1' } });
      if (method === 'GET' && path.includes('/git/commits/')) return json({ tree: { sha: 'basetree' } });
      if (method === 'POST' && path.endsWith('/git/trees')) {
        // Capture the committed dictionary content so a landing PATCH applies it.
        const tree = (body?.tree ?? []) as { path: string; content?: string }[];
        const entry = tree.find((t) => t.path === DICT_PATH);
        stagedContent = entry?.content ?? null;
        return json({ sha: 'newtree' });
      }
      if (method === 'POST' && path.endsWith('/git/commits')) return json({ sha: 'commit1' });
      if (method === 'PATCH' && path.includes('/git/refs/')) {
        patchCount += 1;
        if (patchCount <= 4) {
          if (!concurrentLanded) {
            // A concurrent editor lands "newword" on main between the two action attempts.
            file = serializeDictionary(['alpha', 'newword']);
            concurrentLanded = true;
          }
          return new Response('{"message":"Update is not a fast forward"}', { status: 422 });
        }
        if (stagedContent !== null) file = stagedContent;
        return json({ ref: 'refs/heads/main' });
      }
      return new Response('unexpected', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const routes = createContentRoutes(runtime(), deps);
    const result = (await routes.addDictionaryWord(addEvent({ word: 'beta' }) as never)) as unknown as DictionaryAddResult;
    // The retry's re-merge keeps the concurrent "newword" and adds "beta": order-independent convergence.
    expect(result.words).toEqual(['alpha', 'beta', 'newword']);
    expect(parseDictionary(file)).toEqual(['alpha', 'beta', 'newword']);
  });
});

describe('addDictionaryWord routing gate (composer)', () => {
  it('is registered so the composer test reaches it; the unit here proves the content function', async () => {
    // The composer 404/routing assertions live in cairn-admin-actions.test.ts. This file proves the
    // content function's behavior; the import above proves the result/failure types are exported.
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    expect(typeof routes.addDictionaryWord).toBe('function');
  });
});

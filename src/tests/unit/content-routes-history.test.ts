// Task 2 (history and revert plan): historyLoad shapes a Backend.listCommits read into
// HistoryData, the entry's bounded publish history plus its synthetic draft row. Driven with a
// hand-built Backend fake rather than the fetch-level GithubDouble: historyLoad's whole
// contract is listCommits/branchHead call shapes, which the fake asserts directly.
import { describe, it, expect } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { defineRoles } from '../../lib/auth/roles.js';
import { defineAccess } from '../../lib/auth/access.js';
import { runtime, postsConcept, contentEvent } from './_content-harness.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { Backend, BackendCommit } from '../../lib/github/backend.js';

/** One recorded commit, distinguishable by index: a unique sha, author, and date. */
function commitAt(i: number, overrides: Partial<BackendCommit> = {}): BackendCommit {
  return {
    ref: `sha-${i}`,
    author: { name: `Editor ${i}`, email: `editor${i}@t` },
    date: `2026-01-${String((i % 27) + 1).padStart(2, '0')}T00:00:00Z`,
    ...overrides,
  };
}

/**
 * A Backend that answers `listCommits` from a scripted per-ref commit list, sliced to
 * `limit + 1` the way the real backends promise, and `branchHead` from a scripted map. Every
 * `listCommits` call is recorded so a test can assert the exact path and ref historyLoad asked
 * for. Every other member throws: historyLoad never touches them.
 */
function fakeHistoryBackend(opts: {
  defaultBranch?: string;
  mainCommits?: BackendCommit[];
  branchCommits?: Record<string, BackendCommit[]>;
  branchHeads?: Record<string, string>;
}): Backend & { calls: { path: string; ref: string; limit: number }[] } {
  const defaultBranch = opts.defaultBranch ?? 'main';
  const calls: { path: string; ref: string; limit: number }[] = [];
  const boom = (): never => {
    throw new Error('fakeHistoryBackend: unexpected call');
  };
  return {
    defaultBranch,
    calls,
    readFile: async () => boom(),
    readEntries: async () => boom(),
    branchHead: async (branch: string) => opts.branchHeads?.[branch] ?? null,
    listBranches: async () => boom(),
    commit: async () => boom(),
    listCommits: async (path: string, ref: string, limit: number) => {
      calls.push({ path, ref, limit });
      const source = ref === defaultBranch ? (opts.mainCommits ?? []) : (opts.branchCommits?.[ref] ?? []);
      return source.slice(0, limit + 1);
    },
    createBranch: async () => boom(),
    deleteBranch: async () => boom(),
  };
}

const ENTRY_PATH = 'src/content/posts/2026-05-hello.md';
const PENDING_BRANCH = 'cairn/posts/2026-05-hello';

function historyEvent(id: string, backend: Backend) {
  return contentEvent({
    url: `https://t.example/admin/posts/${id}/history`,
    params: { concept: 'posts', id },
    eventBackend: backend,
  });
}

describe('historyLoad', () => {
  it('reads the entry file at the same path editLoad derives, on the default branch', async () => {
    const backend = fakeHistoryBackend({ mainCommits: [commitAt(0)] });
    const routes = createContentRoutes(runtime());
    await routes.historyLoad(historyEvent('2026-05-hello', backend) as never);
    expect(backend.calls[0]).toEqual({ path: ENTRY_PATH, ref: 'main', limit: 25 });
  });

  it('returns exactly the bound with no truncation when the log holds exactly 25 publishes', async () => {
    const commits = Array.from({ length: 25 }, (_, i) => commitAt(i));
    const backend = fakeHistoryBackend({ mainCommits: commits });
    const routes = createContentRoutes(runtime());
    const data = await routes.historyLoad(historyEvent('2026-05-hello', backend) as never);
    expect(data.entries).toHaveLength(25);
    expect(data.entries[0].ref).toBe('sha-0');
    expect(data.entries[24].ref).toBe('sha-24');
    expect(data.truncated).toBe(false);
  });

  it('sets truncated on the limit+1 probe row, and never renders that row', async () => {
    const commits = Array.from({ length: 26 }, (_, i) => commitAt(i));
    const backend = fakeHistoryBackend({ mainCommits: commits });
    const routes = createContentRoutes(runtime());
    const data = await routes.historyLoad(historyEvent('2026-05-hello', backend) as never);
    expect(data.entries).toHaveLength(25);
    expect(data.truncated).toBe(true);
    expect(data.entries.map((e) => e.ref)).not.toContain('sha-25');
  });

  it('renders the commit-author name, degrading to email then "unknown"', async () => {
    const commits = [
      commitAt(0, { author: { name: 'Jamie Rivera', email: 'jamie@t' } }),
      commitAt(1, { author: { name: '  ', email: 'no-name@t' } }),
      commitAt(2, { author: { name: '', email: '' } }),
    ];
    const backend = fakeHistoryBackend({ mainCommits: commits });
    const routes = createContentRoutes(runtime());
    const data = await routes.historyLoad(historyEvent('2026-05-hello', backend) as never);
    expect(data.entries.map((e) => e.editor)).toEqual(['Jamie Rivera', 'no-name@t', 'unknown']);
  });

  it('leaves draft null when the entry has no pending branch', async () => {
    const backend = fakeHistoryBackend({ mainCommits: [commitAt(0)] });
    const routes = createContentRoutes(runtime());
    const data = await routes.historyLoad(historyEvent('2026-05-hello', backend) as never);
    expect(data.draft).toBeNull();
  });

  it('populates draft from the pending branch head commit when one exists', async () => {
    const backend = fakeHistoryBackend({
      mainCommits: [commitAt(0)],
      branchHeads: { [PENDING_BRANCH]: 'sha-draft' },
      branchCommits: {
        [PENDING_BRANCH]: [{ ref: 'sha-draft', author: { name: 'Ed Editor', email: 'ed@t' }, date: '2026-06-01T00:00:00Z' }],
      },
    });
    const routes = createContentRoutes(runtime());
    const data = await routes.historyLoad(historyEvent('2026-05-hello', backend) as never);
    expect(data.draft).toEqual({ editor: 'Ed Editor', startedAt: '2026-06-01T00:00:00Z' });
  });

  it('yields empty entries plus the draft row for a never-published entry with an open draft', async () => {
    const backend = fakeHistoryBackend({
      mainCommits: [],
      branchHeads: { [PENDING_BRANCH]: 'sha-draft' },
      branchCommits: {
        [PENDING_BRANCH]: [{ ref: 'sha-draft', author: { name: 'Ed Editor', email: 'ed@t' }, date: '2026-06-01T00:00:00Z' }],
      },
    });
    const routes = createContentRoutes(runtime());
    const data = await routes.historyLoad(historyEvent('2026-05-hello', backend) as never);
    expect(data.entries).toEqual([]);
    expect(data.truncated).toBe(false);
    expect(data.draft).toEqual({ editor: 'Ed Editor', startedAt: '2026-06-01T00:00:00Z' });
  });
});

describe('historyLoad access-map denial', () => {
  const ROLES = defineRoles({ owner: 'owner', webmaster: 'editor', publisher: 'editor' });
  const ACCESS = defineAccess(ROLES, { pages: ['webmaster'] });

  function accessRuntime(): CairnRuntime {
    return {
      ...runtime(),
      concepts: [postsConcept({ id: 'pages', dir: 'src/content/pages', permalink: '/pages/:slug' })],
      roles: ROLES,
      access: ACCESS,
    };
  }

  // The role vocabulary's own names (`publisher`) fall outside ContentEventOptions.editor's
  // narrower `'owner' | 'editor'` role literal, so this builds the event shape directly, the
  // same way access-map-route-enforcement.test.ts does for the same reason.
  function pagesEvent(id: string, backend: Backend) {
    const url = `https://t.example/admin/pages/${id}/history`;
    return {
      url: new URL(url),
      params: { concept: 'pages', id },
      request: new Request(url),
      locals: { cairnEditor: { email: 'p@t', displayName: 'Publisher', role: 'publisher', capability: 'editor' }, cairnBackend: backend },
      platform: { env: {} },
      cookies: { get: () => undefined, set: () => {}, delete: () => {} },
    };
  }

  async function statusOf(promise: Promise<unknown>): Promise<number | null> {
    try {
      await promise;
      return null;
    } catch (err) {
      return (err as { status?: number }).status ?? null;
    }
  }

  it('403s an editor mapped away from the concept, the same refusal editLoad gives', async () => {
    const backend = fakeHistoryBackend({ mainCommits: [] });
    const routes = createContentRoutes(accessRuntime());
    const historyStatus = await statusOf(routes.historyLoad(pagesEvent('2026-05-hi', backend) as never));
    const editStatus = await statusOf(routes.editLoad(pagesEvent('2026-05-hi', backend) as never));
    expect(historyStatus).toBe(403);
    expect(historyStatus).toBe(editStatus);
  });
});

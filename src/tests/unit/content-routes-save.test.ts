import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { CommitConflictError } from '../../lib/github/types.js';
import type { CairnRuntime, ValidationResult } from '../../lib/content/types.js';

function runtime(validate: (fm: Record<string, unknown>, body: string) => ValidationResult): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [
      {
        id: 'posts', label: 'Posts', dir: 'src/content/posts',
        routing: { routable: true, dated: true, inFeeds: true },
        fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
        validate,
      },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

function saveEvent(id: string, form: Record<string, string>) {
  const body = new URLSearchParams(form);
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST', body }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('saveAction', () => {
  it('commits a valid edit with the session editor as author, then redirects to saved', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method === 'PUT') return new Response(JSON.stringify({ commit: { sha: 'abc' } }), { status: 200 });
      return new Response('Not Found', { status: 404 }); // fileSha lookup: new file
    }));
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), deps);
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'Hello' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }
    const put = calls.find((c) => c.init?.method === 'PUT')!;
    expect(put.url).toContain('src/content/posts/2026-05-hi.md');
    const sent = JSON.parse(String(put.init!.body));
    expect(sent.author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    expect(sent).not.toHaveProperty('committer');
  });

  it('bounces invalid frontmatter back to the form and never commits', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime(() => ({ ok: false, errors: { title: 'Title is required' } })), deps);
    try {
      await routes.saveAction(saveEvent('2026-05-x', { title: '', body: 'b' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/error=.*Title/);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid id before any commit', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    await expect(routes.saveAction(saveEvent('Bad Id!', { title: 'x', body: 'b' }) as never)).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a 409 conflict as a reload prompt without overwriting', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response('conflict', { status: 409 });
      return new Response(JSON.stringify({ sha: 'old' }), { status: 200 });
    }));
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), deps);
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });

  it('matches a conflict by name even if the class identity differs', async () => {
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), {
      mintToken: () => Promise.resolve('t'),
    });
    // Throw a look-alike: a plain Error carrying the class name, to exercise the name-based branch.
    vi.stubGlobal('fetch', vi.fn(async () => {
      const e = new Error('x') as Error & { name: string };
      e.name = 'CommitConflictError';
      throw e;
    }));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location?: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });
});

it('CommitConflictError is importable for the instanceof branch', () => {
  expect(new CommitConflictError('p')).toBeInstanceOf(Error);
});

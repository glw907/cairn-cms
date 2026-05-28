import { describe, it, expect, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { adminLayoutLoad, collectionListLoad, createEntry, editLoad, saveCommit, adminIndexRedirect, navLoad, navSave } from '../lib/sveltekit';
import { isHttpError, isRedirect } from '@sveltejs/kit';
import type { CairnAdapter } from '../lib/adapter';
import type { CairnUser } from '../lib/auth/guard';

const owner: CairnUser = { id: '1', email: 'o@x', name: 'O', role: 'owner' };
const editor: CairnUser = { id: '2', email: 'e@x', name: 'E', role: 'editor' };

// A fixture adapter with two folder collections, mirroring ecnordic's shape.
const adapter: CairnAdapter = {
  siteName: 'Test Site',
  sender: 'noreply@test',
  backend: { owner: 'o', repo: 'r', branch: 'main' },
  preview: { remarkPlugins: [], rehypePlugins: [] },
  collections: [
    { type: 'posts', label: 'Posts', dir: 'src/content/posts', fields: [], validate: (d) => d },
    { type: 'pages', label: 'Pages', dir: 'src/content/pages', kind: 'page' as const, fields: [], validate: (d) => d },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

// A fetch stub keyed by URL substring, so a directory listing and each raw-file read return
// distinct bodies (mirrors the contents-API shapes github.ts relies on).
function mockFetch(routes: { match: string; body: string; status?: number }[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes.find((r) => url.includes(r.match));
    if (!route) return new Response('not mocked', { status: 500 });
    return new Response(route.body, { status: route.status ?? 200 });
  });
}

const listEvent = (collection: string) => ({
  params: { collection },
  url: new URL(`https://x/admin/${collection}`),
  locals: { user: null as CairnUser | null },
  platform: { env: {} },
});

describe('adminLayoutLoad', () => {
  it('returns branding, session, pathname, and the collection nav list', () => {
    const data = adminLayoutLoad(
      { locals: { user: null }, url: new URL('https://x/admin/posts') },
      adapter,
    );
    expect(data.siteName).toBe('Test Site');
    expect(data.pathname).toBe('/admin/posts');
    expect(data.collections).toEqual([
      { type: 'posts', label: 'Posts' },
      { type: 'pages', label: 'Pages' },
    ]);
  });
});

describe('collectionListLoad', () => {
  it('throws 404 for an unknown collection', async () => {
    try {
      await collectionListLoad(listEvent('events'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isHttpError(err)).toBe(true);
      expect((err as { status: number }).status).toBe(404);
    }
  });

  it('lists entries with title, date, and draft from each frontmatter', async () => {
    mockFetch([
      {
        match: '/contents/src/content/posts?',
        body: JSON.stringify([
          { name: '2026-05-two.md', path: 'src/content/posts/2026-05-two.md', type: 'file' },
          { name: '2025-01-one.md', path: 'src/content/posts/2025-01-one.md', type: 'file' },
        ]),
      },
      {
        match: '2026-05-two.md',
        body: '---\ntitle: Second\ndate: 2026-05-10\ndraft: true\n---\nbody',
      },
      {
        match: '2025-01-one.md',
        body: '---\ntitle: First\ndate: 2025-01-02\n---\nbody',
      },
    ]);

    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.type).toBe('posts');
    expect(data.label).toBe('Posts');
    expect(data.error).toBeUndefined();
    // markdownFiles sorts newest id first, so 2026-05-two precedes 2025-01-one.
    expect(data.entries).toEqual([
      { id: '2026-05-two', path: 'src/content/posts/2026-05-two.md', title: 'Second', date: '2026-05-10', draft: true },
      { id: '2025-01-one', path: 'src/content/posts/2025-01-one.md', title: 'First', date: '2025-01-02', draft: false },
    ]);
  });

  it('degrades to the slug when an entry read fails', async () => {
    mockFetch([
      {
        match: '/contents/src/content/posts?',
        body: JSON.stringify([{ name: 'a.md', path: 'src/content/posts/a.md', type: 'file' }]),
      },
      { match: 'src/content/posts/a.md', body: 'boom', status: 500 },
    ]);
    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.entries).toEqual([
      { id: 'a', path: 'src/content/posts/a.md', title: 'a', date: null, draft: false },
    ]);
  });

  it('returns an inline error when the directory listing fails', async () => {
    mockFetch([{ match: '/contents/src/content/posts?', body: 'rate limited', status: 403 }]);
    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.entries).toEqual([]);
    expect(data.error).toMatch(/403/);
  });

  it('surfaces a create-flow error from the query string', async () => {
    mockFetch([{ match: '/contents/src/content/posts?', body: JSON.stringify([]) }]);
    const event = { params: { collection: 'posts' }, url: new URL('https://x/admin/posts?error=nope'), locals: { user: null as CairnUser | null }, platform: { env: {} } };
    const data = await collectionListLoad(event, adapter);
    expect(data.formError).toBe('nope');
  });
});

function createEvent(collection: string, id: string, date?: string) {
  const form = new FormData();
  form.set('id', id);
  if (date) form.set('date', date);
  return {
    params: { collection },
    locals: { user: { id: 'u1', name: 'Ed', email: 'ed@test', role: 'owner' as const } },
    platform: { env: {} },
    request: new Request('https://x/admin/posts?/create', { method: 'POST', body: form }),
    url: new URL(`https://x/admin/${collection}`),
  };
}

describe('createEntry', () => {
  it('rejects an invalid slug with a redirect back to the list', async () => {
    try {
      await createEntry(createEvent('posts', 'Not A Slug!'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      const loc = (err as { location: string }).location;
      expect(loc).toMatch(/^\/admin\/posts\?error=/);
    }
  });

  it('rejects a slug that already exists', async () => {
    mockFetch([{ match: 'src/content/posts/taken.md', body: '---\ntitle: Taken\n---\n' }]);
    try {
      await createEntry(createEvent('posts', 'taken'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect(decodeURIComponent((err as { location: string }).location)).toContain('already exists');
    }
  });

  it('redirects a valid new slug into the editor in create mode', async () => {
    // readRaw to 404 means the slug is free.
    mockFetch([{ match: 'src/content/posts/2026-05-fresh.md', body: 'not found', status: 404 }]);
    try {
      await createEntry(createEvent('posts', '2026-05-fresh'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).toBe('/admin/edit/posts/2026-05-fresh?new=1');
    }
  });
});

describe('createEntry story date', () => {
  it('forwards a story date into the editor redirect', async () => {
    mockFetch([{ match: '/contents/src/content/posts/2026-05-fresh.md', body: '', status: 404 }]);
    try {
      await createEntry(createEvent('posts', '2026-05-fresh', '2026-05-20'), adapter);
      expect.unreachable('should redirect');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).toBe('/admin/edit/posts/2026-05-fresh?new=1&date=2026-05-20');
    }
  });

  it('omits the date for a page kind even if posted', async () => {
    mockFetch([{ match: '/contents/src/content/pages/about.md', body: '', status: 404 }]);
    try {
      await createEntry(createEvent('pages', 'about', '2026-05-20'), adapter);
      expect.unreachable('should redirect');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).toBe('/admin/edit/pages/about?new=1');
    }
  });
});

const editEvent = (id: string, query = '', type = 'posts') => ({
  params: { type, id },
  url: new URL(`https://x/admin/edit/${type}/${id}${query}`),
  platform: { env: {} },
});

describe('editLoad', () => {
  it('serves a blank new document when the file is missing and ?new=1', async () => {
    mockFetch([{ match: 'src/content/posts/2026-05-fresh.md', body: 'not found', status: 404 }]);
    const data = await editLoad(editEvent('2026-05-fresh', '?new=1'), adapter);
    expect(data.isNew).toBe(true);
    expect(data.id).toBe('2026-05-fresh');
    expect(data.body).toBe('');
    expect(data.frontmatter).toEqual({});
    expect(data.title).toBe('2026-05-fresh');
    expect(data.fields).toEqual(adapter.collections[0].fields);
  });

  it('404s for a missing file without ?new=1', async () => {
    mockFetch([{ match: 'src/content/posts/ghost.md', body: 'not found', status: 404 }]);
    try {
      await editLoad(editEvent('ghost'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isHttpError(err)).toBe(true);
      expect((err as { status: number }).status).toBe(404);
    }
  });

  it('loads an existing file as a non-new document', async () => {
    mockFetch([{ match: 'src/content/posts/real.md', body: '---\ntitle: Real\n---\nhi' }]);
    const data = await editLoad(editEvent('real'), adapter);
    expect(data.isNew).toBe(false);
    expect(data.title).toBe('Real');
    expect(data.body).toBe('hi');
  });
});

describe('editLoad date seeding', () => {
  it('seeds frontmatter.date for a new dated story', async () => {
    mockFetch([{ match: '/contents/src/content/posts/2026-05-fresh.md', body: '', status: 404 }]);
    const data = await editLoad(editEvent('2026-05-fresh', '?new=1&date=2026-05-20', 'posts'), adapter);
    expect(data.isNew).toBe(true);
    expect(data.frontmatter.date).toBe('2026-05-20');
  });

  it('does not seed a date when none is passed', async () => {
    mockFetch([{ match: '/contents/src/content/posts/2026-05-bare.md', body: '', status: 404 }]);
    const data = await editLoad(editEvent('2026-05-bare', '?new=1', 'posts'), adapter);
    expect(data.frontmatter.date).toBeUndefined();
  });
});

// An adapter whose validate always throws, so saveCommit takes the validation-error redirect
// before any GitHub call. Dummy GitHub App env satisfies the earlier config gate.
const throwingAdapter: CairnAdapter = {
  ...adapter,
  collections: [
    {
      type: 'posts',
      label: 'Posts',
      dir: 'src/content/posts',
      fields: [],
      validate: () => {
        throw new Error('bad frontmatter');
      },
    },
  ],
};

function saveEvent(extra: Record<string, string>) {
  const form = new FormData();
  form.set('type', 'posts');
  form.set('id', '2026-05-fresh');
  form.set('body', 'hello');
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return {
    locals: { user: { id: 'u1', name: 'Ed', email: 'ed@test', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_ID: '1', GITHUB_APP_INSTALLATION_ID: '2', GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    request: new Request('https://x/admin/save', { method: 'POST', body: form }),
  };
}

describe('saveCommit create-flag preservation', () => {
  it('keeps ?new=1 on a validation-error redirect for a new entry', async () => {
    try {
      await saveCommit(saveEvent({ new: '1' }), throwingAdapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      const loc = (err as { location: string }).location;
      expect(loc).toContain('/admin/edit/posts/2026-05-fresh?error=');
      expect(loc).toContain('&new=1');
    }
  });

  it('omits the new flag for an existing-entry validation error', async () => {
    try {
      await saveCommit(saveEvent({}), throwingAdapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).not.toContain('new=1');
    }
  });
});

describe('collection kind', () => {
  it('collectionListLoad defaults an unmarked collection to story', async () => {
    mockFetch([{ match: '/contents/src/content/posts?', body: '[]' }]);
    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.kind).toBe('story');
  });

  it('collectionListLoad reports an explicit page kind', async () => {
    mockFetch([{ match: '/contents/src/content/pages?', body: '[]' }]);
    const data = await collectionListLoad(listEvent('pages'), adapter);
    expect(data.kind).toBe('page');
  });

  it('editLoad returns the collection kind', async () => {
    mockFetch([{ match: '/contents/src/content/pages/about.md', body: '# About', status: 200 }]);
    const data = await editLoad(editEvent('about', '', 'pages'), adapter);
    expect(data.kind).toBe('page');
  });
});

describe('adminIndexRedirect', () => {
  it('redirects to the first collection', () => {
    try {
      adminIndexRedirect(adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).toBe('/admin/posts');
    }
  });

  it('404s when no collections are configured', () => {
    try {
      adminIndexRedirect({ ...adapter, collections: [] });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isHttpError(err)).toBe(true);
      expect((err as { status: number }).status).toBe(404);
    }
  });
});

describe('createEntry capability gating', () => {
  it('blocks an editor from creating a page (403)', async () => {
    const event = {
      params: { collection: 'pages' },
      locals: { user: editor },
      request: new Request('http://x/admin/pages?', { method: 'POST', body: new FormData() }),
      platform: { env: {} },
    };
    try {
      await createEntry(event as never, adapter);
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(403);
    }
  });

  it('lets an editor create a story (redirects to the editor)', async () => {
    const form = new FormData();
    form.set('id', 'my-post');
    mockFetch([{ match: '/contents/src/content/posts/my-post.md', body: 'not found', status: 404 }]);
    const event = {
      params: { collection: 'posts' },
      locals: { user: editor },
      request: new Request('http://x/admin/posts?', { method: 'POST', body: form }),
      platform: { env: {} },
    };
    try {
      await createEntry(event as never, adapter);
      expect.unreachable();
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });
});

describe('collectionListLoad canCreate', () => {
  it('is false for an editor on a page collection', async () => {
    mockFetch([{ match: '/contents/src/content/pages', body: JSON.stringify([]) }]);
    const data = await collectionListLoad(
      { params: { collection: 'pages' }, url: new URL('http://x/admin/pages'), locals: { user: editor }, platform: { env: {} } } as never,
      adapter,
    );
    expect(data.canCreate).toBe(false);
  });

  it('is true for an editor on a story collection', async () => {
    mockFetch([{ match: '/contents/src/content/posts', body: JSON.stringify([]) }]);
    const data = await collectionListLoad(
      { params: { collection: 'posts' }, url: new URL('http://x/admin/posts'), locals: { user: editor }, platform: { env: {} } } as never,
      adapter,
    );
    expect(data.canCreate).toBe(true);
  });
});

// ── navLoad / navSave ───────────────────────────────────────────────────────

const navAdapter: CairnAdapter = {
  ...adapter,
  navMenus: [{ name: 'primary', label: 'Main menu', maxDepth: 2 }],
};

function navDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec('CREATE TABLE nav_menu (name TEXT PRIMARY KEY, tree_json TEXT NOT NULL, updated_at INTEGER NOT NULL)');
  return {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      let args: unknown[] = [];
      const api = {
        bind(...a: unknown[]) { args = a; return api; },
        async first<T>() { return (stmt.get(...args) as T) ?? null; },
        async run() { stmt.run(...args); return { success: true }; },
      };
      return api;
    },
  } as never;
}

describe('navLoad', () => {
  it('denies an editor (403)', async () => {
    try {
      await navLoad({ locals: { user: editor }, url: new URL('http://x/admin/nav'), platform: { env: { AUTH_DB: navDb() } } } as never, navAdapter);
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(403);
    }
  });

  it('returns the menu config + empty tree for an owner', async () => {
    mockFetch([{ match: '/contents/src/content/pages', body: JSON.stringify([]) }]);
    const data = await navLoad(
      { locals: { user: owner }, url: new URL('http://x/admin/nav'), platform: { env: { AUTH_DB: navDb() } } } as never,
      navAdapter,
    );
    expect(data.menu).toEqual({ name: 'primary', label: 'Main menu', maxDepth: 2 });
    expect(data.tree).toEqual([]);
    expect(Array.isArray(data.pages)).toBe(true);
  });

  it('404s when the site declares no navMenus', async () => {
    try {
      await navLoad({ locals: { user: owner }, url: new URL('http://x/admin/nav'), platform: { env: { AUTH_DB: navDb() } } } as never, adapter);
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(404);
    }
  });
});

describe('adminLayoutLoad nav surface', () => {
  it('exposes navMenus + canManageNav=true for an owner', () => {
    const data = adminLayoutLoad({ locals: { user: owner }, url: new URL('http://x/admin/posts') } as never, navAdapter);
    expect(data.navMenus).toEqual([{ name: 'primary', label: 'Main menu' }]);
    expect(data.canManageNav).toBe(true);
  });

  it('canManageNav=false for an editor', () => {
    const data = adminLayoutLoad({ locals: { user: editor }, url: new URL('http://x/admin/posts') } as never, navAdapter);
    expect(data.canManageNav).toBe(false);
  });

  it('navMenus is [] when the adapter declares none', () => {
    const data = adminLayoutLoad({ locals: { user: owner }, url: new URL('http://x/admin/posts') } as never, adapter);
    expect(data.navMenus).toEqual([]);
  });
});

describe('navSave', () => {
  it('validates, writes, and redirects to ?saved=1 for an owner', async () => {
    const db = navDb();
    const form = new FormData();
    form.set('tree', JSON.stringify([{ label: 'Home', url: '/' }]));
    try {
      await navSave({ locals: { user: owner }, request: new Request('http://x/admin/nav', { method: 'POST', body: form }), platform: { env: { AUTH_DB: db } } } as never, navAdapter);
      expect.unreachable();
    } catch (e) {
      expect(isRedirect(e) && e.location).toBe('/admin/nav?saved=1');
    }
  });

  it('redirects to ?error= on an invalid tree', async () => {
    const form = new FormData();
    form.set('tree', JSON.stringify([{ label: '' }]));
    try {
      await navSave({ locals: { user: owner }, request: new Request('http://x/admin/nav', { method: 'POST', body: form }), platform: { env: { AUTH_DB: navDb() } } } as never, navAdapter);
      expect.unreachable();
    } catch (e) {
      expect(isRedirect(e) && String(e.location).startsWith('/admin/nav?error=')).toBe(true);
    }
  });

  it('denies an editor (403)', async () => {
    const form = new FormData();
    form.set('tree', JSON.stringify([]));
    try {
      await navSave({ locals: { user: editor }, request: new Request('http://x/admin/nav', { method: 'POST', body: form }), platform: { env: { AUTH_DB: navDb() } } } as never, navAdapter);
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(403);
    }
  });
});

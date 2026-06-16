import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CairnAdmin from '../../lib/components/CairnAdmin.svelte';
import { createCairnAdmin, type AdminData } from '../../lib/sveltekit/cairn-admin.js';
import type { CairnRuntime, FrontmatterField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

function layout(over = {}) {
  return {
    siteName: 'Test Site',
    user: { displayName: 'Ed', email: 'ed@example.com', role: 'owner' as const },
    concepts: [{ id: 'posts', label: 'Posts' }],
    pathname: '/admin/posts',
    canManageEditors: true,
    navLabel: null,
    theme: 'cairn-admin' as const,
    collapsedNav: [] as string[],
    csrf: 'test-csrf',
    pendingEntries: null,
    ...over,
  };
}

function listData(layoutOver = {}, pageOver = {}): AdminData {
  return {
    view: 'list',
    layout: layout(layoutOver),
    page: {
      conceptId: 'posts',
      label: 'Posts',
      singular: 'Posts',
      dated: true,
      entries: [
        { id: '2026-05-01-hello', title: 'Hello', date: '2026-05-01', draft: false, status: 'published' as const, summary: null },
      ],
      error: null,
      formError: null,
      publishedAll: null,
      ...pageOver,
    },
  };
}

function loginData(): AdminData {
  return { view: 'login', page: { siteName: 'Test Site', error: null, csrf: 'test-csrf' } };
}

function confirmData(): AdminData {
  return {
    view: 'confirm',
    page: { token: 'tok123', siteName: 'Test Site', error: null, csrf: 'test-csrf' },
  };
}

function editorsData(): AdminData {
  return {
    view: 'editors',
    layout: layout({ pathname: '/admin/editors' }),
    page: {
      editors: [{ email: 'owner@t', displayName: 'Owner One', role: 'owner' as const }],
      self: 'owner@t',
    },
  };
}

function navData(): AdminData {
  return {
    view: 'nav',
    layout: layout({ pathname: '/admin/nav', navLabel: 'Navigation' }),
    page: {
      menu: { name: 'primary', label: 'Primary nav', maxDepth: 2 },
      tree: [{ label: 'Home', url: '/' }],
      pages: [{ label: 'about', url: '/about' }],
      saved: false,
      error: null,
    },
  };
}

function editData(): AdminData {
  return {
    view: 'edit',
    layout: layout({ pathname: '/admin/posts/2026-05-hello' }),
    page: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }] satisfies FrontmatterField[],
      frontmatter: { title: 'Hello' },
      body: 'The body.',
      title: 'Hello',
      isNew: false,
      saved: false,
      renamed: false,
      error: null,
      slug: 'hello',
      linkTargets: [] as LinkTarget[],
      mediaTargets: {},
      inboundLinks: [],
      pending: false,
      published: true,
      publishedFlash: false,
      discardedFlash: false,
      preview: null,
    },
  };
}

const chromeNav = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('nav[aria-label="Site content"]');

describe('CairnAdmin', () => {
  it('renders the login view bare, with the email form posting ?/request', async () => {
    const screen = render(CairnAdmin, { data: loginData() });
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    const form = screen.container.querySelector('form[method="POST"]');
    expect(form?.getAttribute('action')).toBe('?/request');
    // The public auth pages carry no admin chrome.
    expect(chromeNav(screen)).toBeNull();
  });

  it('renders the confirm view bare, with the token form posting ?/confirm', async () => {
    const screen = render(CairnAdmin, { data: confirmData() });
    await expect.element(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.container.querySelector('input[name="token"]')).toHaveValue('tok123');
    const form = screen.container.querySelector('form[method="POST"]');
    expect(form?.getAttribute('action')).toBe('?/confirm');
    expect(chromeNav(screen)).toBeNull();
  });

  it('renders the list view inside the admin chrome', async () => {
    const screen = render(CairnAdmin, { data: listData() });
    expect(chromeNav(screen)).not.toBeNull();
    await expect.element(screen.getByRole('link', { name: 'Hello' })).toHaveAttribute(
      'href',
      '/admin/posts/2026-05-01-hello',
    );
  });

  it('renders the edit view inside the admin chrome with the editor surface', async () => {
    const screen = render(CairnAdmin, { data: editData() });
    expect(chromeNav(screen)).not.toBeNull();
    await expect.element(screen.getByRole('toolbar')).toBeInTheDocument();
    await expect.element(screen.getByLabelText(/title/i)).toHaveValue('Hello');
  });

  it('renders the editors view inside the admin chrome', async () => {
    const screen = render(CairnAdmin, { data: editorsData() });
    expect(chromeNav(screen)).not.toBeNull();
    await expect.element(screen.getByText('Owner One')).toBeInTheDocument();
  });

  it('renders the nav view inside the admin chrome', async () => {
    const screen = render(CairnAdmin, { data: navData() });
    expect(chromeNav(screen)).not.toBeNull();
    await expect.element(screen.getByLabelText('Label')).toHaveValue('Home');
  });

  it('posts the logout form to the named ?/logout action', async () => {
    const screen = render(CairnAdmin, { data: listData() });
    const form = screen.container.querySelector('form[action="?/logout"]');
    expect(form).not.toBeNull();
    expect(form!.querySelector('input[name="csrf"]')).not.toBeNull();
  });

  it('posts the publish-all form to the named ?/publishAll action', async () => {
    const data = listData({ pendingEntries: [{ concept: 'posts', id: '2026-05-01-hello' }] });
    const screen = render(CairnAdmin, { data });
    const form = screen.container.querySelector('form[action="?/publishAll"]');
    expect(form).not.toBeNull();
    expect(form!.querySelector('input[name="csrf"]')).not.toBeNull();
  });

  it('forwards the action result to the rendered view', async () => {
    const screen = render(CairnAdmin, { data: loginData(), form: { sent: true } });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
  });

  it('resets the list state when navigation crosses to another concept', async () => {
    const screen = render(CairnAdmin, { data: listData() });
    const search = screen.getByRole('searchbox', { name: 'Search Posts' });
    await search.fill('hello');
    await expect.element(search).toHaveValue('hello');
    // The single mount reuses the page component across /admin/posts -> /admin/pages, so only
    // the {#key data.page.conceptId} remount keeps one concept's query out of the next.
    await screen.rerender({
      data: listData({ pathname: '/admin/pages' }, { conceptId: 'pages', label: 'Pages', dated: false }),
    });
    await expect.element(screen.getByRole('searchbox', { name: 'Search Pages' })).toHaveValue('');
  });
});

describe('form-action contract', () => {
  // A minimal runtime, the same shape the unit suite feeds createCairnAdmin: enough to build
  // the actions record, never invoked here.
  function runtime(): CairnRuntime {
    const ok = () => ({ ok: true as const, data: {} });
    return {
      siteName: 'Test Site',
      concepts: [
        { id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], summaryFields: [], validate: ok },
        { id: 'pages', label: 'Pages', singular: 'Pages', dir: 'src/content/pages', routing: { routable: true, dated: false, inFeeds: false }, permalink: '/:slug', datePrefix: 'day', fields: [], summaryFields: [], validate: ok },
      ],
      backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
      sender: { from: 'cms@test' },
      render: (md) => md,
      manifestPath: 'src/content/.cairn/index.json',
      mediaManifestPath: 'src/content/.cairn/media.json',
      resolvedAssets: { enabled: false },
    };
  }

  /** Every named action a rendered view posts: form action attributes plus the button
   *  formaction overrides EditPage uses for ?/publish. */
  function renderedActionNames(container: HTMLElement): string[] {
    const names = new Set<string>();
    for (const form of container.querySelectorAll('form[action^="?/"]')) {
      names.add(form.getAttribute('action')!.slice(2));
    }
    for (const override of container.querySelectorAll('[formaction^="?/"]')) {
      names.add(override.getAttribute('formaction')!.slice(2));
    }
    return [...names];
  }

  const dispatcherActions = new Set(Object.keys(createCairnAdmin(runtime()).actions));

  const views: Array<[AdminData['view'], AdminData]> = [
    ['login', loginData()],
    ['confirm', confirmData()],
    ['list', listData({ pendingEntries: [{ concept: 'posts', id: '2026-05-01-hello' }] })],
    ['edit', editData()],
    ['editors', editorsData()],
    ['nav', navData()],
  ];

  it.each(views)('the %s view posts only actions the dispatcher defines', async (_view, data) => {
    const screen = render(CairnAdmin, { data });
    const rendered = renderedActionNames(screen.container);
    // A fixture that renders no action form would prove nothing; fail loudly instead.
    expect(rendered.length).toBeGreaterThan(0);
    const unknown = rendered.filter((name) => !dispatcherActions.has(name));
    expect(unknown).toEqual([]);
  });
});

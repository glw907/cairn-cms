import { describe, it, expect, beforeEach } from 'vitest';
import { githubApp } from '../../lib/index.js';
import { render } from 'vitest-browser-svelte';
import CairnAdmin from '../../lib/components/CairnAdmin.svelte';
import { createCairnAdmin, type AdminData } from '../../lib/sveltekit/cairn-admin.js';
import type { CairnRuntime, NamedField } from '../../lib/content/types.js';
import type { AdminShellData } from '../../lib/sveltekit/content-routes.js';
import { fieldset } from '../../lib/content/fieldset.js';
import type { LinkTarget } from '../../lib/content/manifest.js';
import { page } from './_app-state.js';

// The authed shell payload the edit view reads its siteName from (page.data.shell). CairnAdmin no
// longer carries chrome, so only the edit view consults the shell.
function shell(): AdminShellData {
  return {
    public: false,
    siteName: 'Test Site',
    user: { displayName: 'Ed', email: 'ed@example.com', role: 'owner' },
    concepts: [{ id: 'posts', label: 'Posts' }],
    customNav: [],
    pathname: '/admin/posts',
    canManageEditors: true,
    navLabel: null,
    theme: 'cairn-admin',
    collapsedNav: [],
    csrf: 'test-csrf',
    pendingEntries: Promise.resolve(null),
  };
}

function listData(pageOver = {}): AdminData {
  return {
    view: 'list',
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
    page: {
      editors: [{ email: 'owner@t', displayName: 'Owner One', role: 'owner' as const }],
      self: 'owner@t',
      error: null,
    },
  };
}

function navData(): AdminData {
  return {
    view: 'nav',
    page: {
      menu: { name: 'primary', label: 'Primary nav', maxDepth: 2 },
      tree: [{ label: 'Home', url: '/' }],
      pages: [{ label: 'about', url: '/about' }],
      saved: false,
      error: null,
    },
  };
}

function settingsData(): AdminData {
  return {
    view: 'settings',
    page: {
      enabled: true,
      tidyEnabled: true,
      keyConfigured: true,
      model: 'claude-sonnet-4-6',
      modelLabel: 'Claude Sonnet',
      conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false },
      saved: false,
      error: null,
    },
  };
}

function editData(): AdminData {
  return {
    view: 'edit',
    page: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }] satisfies NamedField[],
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
      mediaLibrary: {},
      inboundLinks: [],
      pending: false,
      published: true,
      publishedFlash: false,
      publishActions: [],
      discardedFlash: false,
      preview: null,
      spellcheckDictionary: 'dictionary-en-us.txt',
      siteDictionary: [],
      tidy: { enabled: false, model: 'claude-sonnet-4-6', conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false } },
      advisories: [],
      orphanTags: [],
    },
  };
}

const chromeNav = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('nav[aria-label="Site content"]');

describe('CairnAdmin', () => {
  beforeEach(() => {
    // The edit view reads siteName from the shell on page.data; reset it between tests.
    page.data = {};
  });

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

  it('renders the list view bare (chrome now rides the shell, not CairnAdmin)', async () => {
    const screen = render(CairnAdmin, { data: listData() });
    // CairnAdmin no longer wraps the chrome shell; only the view component renders.
    expect(chromeNav(screen)).toBeNull();
    await expect.element(screen.getByRole('link', { name: 'Hello' })).toHaveAttribute(
      'href',
      '/admin/posts/2026-05-01-hello',
    );
  });

  it('renders the edit view with the editor surface, reading siteName from the shell', async () => {
    page.data = { shell: shell() };
    const screen = render(CairnAdmin, { data: editData() });
    expect(chromeNav(screen)).toBeNull();
    await expect.element(screen.getByRole('toolbar')).toBeInTheDocument();
    await expect.element(screen.getByLabelText(/title/i)).toHaveValue('Hello');
  });

  it('renders the editors view bare', async () => {
    const screen = render(CairnAdmin, { data: editorsData() });
    await expect.element(screen.getByText('Owner One')).toBeInTheDocument();
  });

  it('renders the nav view bare', async () => {
    const screen = render(CairnAdmin, { data: navData() });
    await expect.element(screen.getByLabelText('Label')).toHaveValue('Home');
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
      data: listData({ conceptId: 'pages', label: 'Pages', dated: false }),
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
        { id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [], validate: ok },
        { id: 'pages', label: 'Pages', singular: 'Pages', dir: 'src/content/pages', routing: { routable: true, dated: false, inFeeds: false }, permalink: '/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [], validate: ok },
      ],
      backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
      sender: { from: 'cms@test' },
      render: ({ body }) => Promise.resolve(body),
      manifestPath: 'src/content/.cairn/index.json',
      mediaManifestPath: 'src/content/.cairn/media.json',
      resolvedAssets: { enabled: false },
    vocabulary: [],
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
    ['list', listData()],
    ['edit', editData()],
    ['editors', editorsData()],
    ['nav', navData()],
    ['settings', settingsData()],
  ];

  it.each(views)('the %s view posts only actions the dispatcher defines', async (view, data) => {
    if (view === 'edit') page.data = { shell: shell() };
    const screen = render(CairnAdmin, { data });
    const rendered = renderedActionNames(screen.container);
    // A fixture that renders no action form would prove nothing; fail loudly instead.
    expect(rendered.length).toBeGreaterThan(0);
    const unknown = rendered.filter((name) => !dispatcherActions.has(name));
    expect(unknown).toEqual([]);
  });
});

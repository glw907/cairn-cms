import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CairnAdmin from '../../lib/components/CairnAdmin.svelte';
import type { AdminData } from '../../lib/sveltekit/cairn-admin.js';
import type { FrontmatterField } from '../../lib/content/types.js';
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

function listData(layoutOver = {}): AdminData {
  return {
    view: 'list',
    layout: layout(layoutOver),
    page: {
      conceptId: 'posts',
      label: 'Posts',
      dated: true,
      entries: [
        { id: '2026-05-01-hello', title: 'Hello', date: '2026-05-01', draft: false, status: 'published' as const },
      ],
      error: null,
      formError: null,
      publishedAll: null,
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
      inboundLinks: [],
      pending: false,
      published: true,
      publishedFlash: false,
      discardedFlash: false,
    },
  };
}

const chromeNav = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('nav[aria-label="Site content"]');

describe('CairnAdmin', () => {
  it('renders the login view bare, with the email form posting ?/request', async () => {
    const screen = render(CairnAdmin, {
      data: { view: 'login', page: { siteName: 'Test Site', error: null, csrf: 'test-csrf' } },
    });
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    const form = screen.container.querySelector('form[method="POST"]');
    expect(form?.getAttribute('action')).toBe('?/request');
    // The public auth pages carry no admin chrome.
    expect(chromeNav(screen)).toBeNull();
  });

  it('renders the confirm view bare, with the token form posting ?/confirm', async () => {
    const screen = render(CairnAdmin, {
      data: { view: 'confirm', page: { token: 'tok123', siteName: 'Test Site', error: null, csrf: 'test-csrf' } },
    });
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
    const screen = render(CairnAdmin, {
      data: {
        view: 'editors',
        layout: layout({ pathname: '/admin/editors' }),
        page: {
          editors: [{ email: 'owner@t', displayName: 'Owner One', role: 'owner' as const }],
          self: 'owner@t',
        },
      },
    });
    expect(chromeNav(screen)).not.toBeNull();
    await expect.element(screen.getByText('Owner One')).toBeInTheDocument();
  });

  it('renders the nav view inside the admin chrome', async () => {
    const screen = render(CairnAdmin, {
      data: {
        view: 'nav',
        layout: layout({ pathname: '/admin/nav', navLabel: 'Navigation' }),
        page: {
          menu: { name: 'primary', label: 'Primary nav', maxDepth: 2 },
          tree: [{ label: 'Home', url: '/' }],
          pages: [{ label: 'about', url: '/about' }],
          saved: false,
          error: null,
        },
      },
    });
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
    const screen = render(CairnAdmin, {
      data: { view: 'login', page: { siteName: 'Test Site', error: null, csrf: 'test-csrf' } },
      form: { sent: true },
    });
    await expect.element(screen.getByText(/check your email/i)).toBeInTheDocument();
  });
});

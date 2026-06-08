import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import AdminLayout from '../../lib/components/AdminLayout.svelte';

const child = createRawSnippet(() => ({ render: () => '<p>page body</p>' }));

function data(canManageEditors: boolean, navLabel: string | null = null, pathname = '/admin/posts') {
  return {
    siteName: 'Test Site',
    user: { displayName: 'Ed', email: 'ed@example.com', role: canManageEditors ? ('owner' as const) : ('editor' as const) },
    concepts: [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }],
    pathname,
    canManageEditors,
    navLabel,
    theme: 'cairn-admin' as const,
    collapsedNav: [] as string[],
  };
}

describe('AdminLayout', () => {
  beforeEach(() => {
    // Clear any theme cookie a prior test wrote so the no-cookie OS-preference branch and the
    // toggle assertions stay deterministic across tests.
    document.cookie = 'cairn-admin-theme=; path=/admin; max-age=0';
  });

  it('applies the cairn-admin theme and renders the concept nav and child', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByText('page body')).toBeInTheDocument();
    // Scope to the sidebar nav: the topbar breadcrumb also renders a concept link at this depth.
    const sidebar = screen.getByRole('navigation', { name: 'Site content' });
    await expect.element(sidebar.getByRole('link', { name: 'Posts' })).toBeInTheDocument();
    await expect.element(sidebar.getByRole('link', { name: 'Pages' })).toBeInTheDocument();
    expect(document.querySelector('[data-theme="cairn-admin"]')).not.toBeNull();
  });

  it('shows the Cairn brand in the sidebar', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByText('Cairn', { exact: true })).toBeInTheDocument();
  });

  it('opens the command palette from the topbar trigger', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await screen.getByRole('button', { name: /search or jump to/i }).click();
    await expect.element(screen.getByRole('textbox', { name: /search or jump to/i })).toBeInTheDocument();
    // A palette-only command confirms the dialog is open (a nav link like Posts also exists in the sidebar).
    await expect.element(screen.getByText('View the live site')).toBeInTheDocument();
  });

  it('renders the core group and developer groups as peers', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByText('Core', { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    // A custom-named developer group sits at the same level as the core group.
    await expect.element(screen.getByText('Marketing', { exact: true })).toBeInTheDocument();
  });

  it('shows the manage-editors link to an owner', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByRole('link', { name: /editors/i })).toBeInTheDocument();
  });

  it('hides the manage-editors link from an editor', async () => {
    const screen = render(AdminLayout, { data: data(false), children: child });
    await expect.element(screen.getByRole('link', { name: /editors/i })).not.toBeInTheDocument();
  });

  it('shows the navigation link when a nav menu is configured', async () => {
    const screen = render(AdminLayout, { data: data(false, 'Primary nav'), children: child });
    await expect.element(screen.getByRole('link', { name: 'Primary nav' })).toBeInTheDocument();
  });

  it('shows the user identity and a sign-out control in the sidebar', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByText('ed@example.com')).toBeInTheDocument();
    await expect.element(screen.getByText('Ed', { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('shows the owner role in the user menu', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByText(/owner/i)).toBeInTheDocument();
  });

  it('derives breadcrumbs from the path inside an entry route', async () => {
    const screen = render(AdminLayout, { data: data(true, null, '/admin/posts/2026-05-hello'), children: child });
    await expect.element(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    await expect.element(screen.getByText('2026-05-hello')).toBeInTheDocument();
  });

  it('toggles the theme on the admin root and persists it to a cookie', async () => {
    // The toggle scopes the cookie to path=/admin (production correctness), but the browser test
    // page is served at "/", so a path=/admin cookie is invisible to document.cookie here. Capture
    // the write through the cookie setter instead, which observes the exact string production sets.
    const writes: string[] = [];
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => 'cairn-admin-theme=cairn-admin', // seed: a light cookie exists, so the OS branch is skipped
      set: (value: string) => {
        writes.push(value);
      },
    });
    try {
      const screen = render(AdminLayout, { data: data(true), children: child });
      const root = () => screen.container.querySelector('[data-theme]');
      expect(root()?.getAttribute('data-theme')).toBe('cairn-admin');
      await screen.getByRole('button', { name: /dark mode|light mode|toggle theme/i }).click();
      expect(root()?.getAttribute('data-theme')).toBe('cairn-admin-dark');
      expect(writes.some((w) => w.includes('cairn-admin-theme=cairn-admin-dark'))).toBe(true);
      expect(writes.some((w) => w.includes('path=/admin'))).toBe(true);
    } finally {
      // The cookie accessor lives on the prototype; deleting the own override restores it.
      delete (document as { cookie?: unknown }).cookie;
    }
  });

  it('toggles the drawer with Ctrl+B', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    const toggle = () => screen.container.querySelector('#cairn-drawer') as HTMLInputElement;
    const before = toggle().checked;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
    await expect.poll(() => toggle().checked).toBe(!before);
  });
});

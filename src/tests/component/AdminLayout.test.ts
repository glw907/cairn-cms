import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import AdminLayout from '../../lib/components/AdminLayout.svelte';
// AdminLayout joined to a descendant that fills the topbar holder, the way EditPage does.
import AdminLayoutDeskHarness from './AdminLayoutDeskHarness.svelte';

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
    csrf: 'test-csrf-token',
    pendingEntries: null,
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

  it('carries a CSRF field in every POST form', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    const postForms = screen.container.querySelectorAll('form[method="POST"]');
    const csrfFields = screen.container.querySelectorAll('form[method="POST"] input[name="csrf"]');
    expect(postForms.length).toBeGreaterThan(0);
    expect(csrfFields.length).toBe(postForms.length);
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

  it('closes the command palette once a navigation lands', async () => {
    // A destination command is a plain link that navigates; the palette closes itself from the
    // pathname effect after the route changes, rather than racing a close() against the link's own
    // navigation (which cancelled it). Re-rendering with a new pathname stands in for that nav.
    const screen = render(AdminLayout, { data: data(true), children: child });
    await screen.getByRole('button', { name: /search or jump to/i }).click();
    expect(document.querySelector<HTMLDialogElement>('dialog.modal')?.open).toBe(true);
    await screen.rerender({ data: data(true, null, '/admin/pages'), children: child });
    expect(document.querySelector<HTMLDialogElement>('dialog.modal')?.open).toBe(false);
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

  it('renders the registered desk snippet in the band on a desk route', async () => {
    // A descendant document fills the topbar holder; AdminLayout renders it after the breadcrumb on
    // a desk route (/admin/<concept>/<id>). DeskChild stands in for EditPage's registration.
    const screen = render(AdminLayoutDeskHarness, {
      data: data(true, null, '/admin/posts/2026-05-hello'),
    });
    await expect.element(screen.getByTestId('desk-control')).toBeInTheDocument();
  });

  it('stands down the palette trigger and the site Publish button on a desk route', async () => {
    const pending = [{ concept: 'posts', id: '2026-05-hello' }];
    const screen = render(AdminLayoutDeskHarness, {
      data: { ...data(true, null, '/admin/posts/2026-05-hello'), pendingEntries: pending },
    });
    // The band has one job on a desk route: no command-palette trigger, no site-wide Publish in
    // the topbar (the navbar). The publish-all confirm dialog still exists in the DOM, so scope the
    // check to the navbar rather than the whole container.
    await expect.element(screen.getByTestId('desk-control')).toBeInTheDocument();
    const navbar = screen.container.querySelector('.navbar')!;
    expect(navbar.textContent ?? '').not.toContain('Search or jump to');
    expect(navbar.textContent ?? '').not.toContain('Publish site');
  });

  it('keeps the palette trigger and band as is on a list route (the office is unchanged)', async () => {
    const screen = render(AdminLayoutDeskHarness, { data: data(true) });
    // On the office routes the desk snippet never renders, and the palette trigger stays.
    expect(screen.container.textContent ?? '').toContain('Search or jump to');
    expect(screen.container.querySelector('[data-testid="desk-control"]')).toBeNull();
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

  it('does not warn about host chrome on a clean mount', async () => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args.join(' '));
    });
    render(AdminLayout, { data: data(true), children: child });
    await new Promise((resolve) => setTimeout(resolve, 0)); // let onMount run
    spy.mockRestore();
    expect(errors.join(' ')).not.toContain('rendering inside host chrome');
  });

  it('shows the publish-site trigger with the pending count', async () => {
    const pending = [
      { concept: 'posts', id: '2026-05-01-a' },
      { concept: 'posts', id: '2026-05-02-b' },
      { concept: 'pages', id: 'about' },
      { concept: 'widgets', id: 'w1' },
    ];
    const screen = render(AdminLayout, { data: { ...data(true), pendingEntries: pending }, children: child });
    await expect.element(screen.getByRole('button', { name: 'Publish site (4)' })).toBeInTheDocument();
  });

  it('confirms a publish-all with the pending ids grouped by concept label', async () => {
    const pending = [
      { concept: 'posts', id: '2026-05-01-a' },
      { concept: 'posts', id: '2026-05-02-b' },
      { concept: 'pages', id: 'about' },
      { concept: 'widgets', id: 'w1' },
    ];
    const screen = render(AdminLayout, { data: { ...data(true), pendingEntries: pending }, children: child });
    await screen.getByRole('button', { name: 'Publish site (4)' }).click();
    const dialog = screen.container.querySelector('dialog[aria-labelledby="cairn-publish-all-title"]') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    const text = dialog.textContent ?? '';
    // Configured concepts resolve to their labels; an unknown key falls back to the raw key.
    expect(text).toContain('Posts');
    expect(text).toContain('Pages');
    expect(text).toContain('widgets');
    expect(text).toContain('2026-05-01-a');
    expect(text).toContain('2026-05-02-b');
    expect(text).toContain('about');
    expect(text).toContain('w1');
    // The confirm posts the named action to the current page with the CSRF field.
    const form = dialog.querySelector('form[action="?/publishAll"]');
    expect(form).not.toBeNull();
    expect(form!.querySelector('input[name="csrf"]')).not.toBeNull();
  });

  it('closes the publish-all dialog once a navigation lands', async () => {
    const pending = [{ concept: 'posts', id: '2026-05-01-a' }];
    const screen = render(AdminLayout, { data: { ...data(true), pendingEntries: pending }, children: child });
    await screen.getByRole('button', { name: 'Publish site (1)' }).click();
    const dialog = () =>
      screen.container.querySelector('dialog[aria-labelledby="cairn-publish-all-title"]') as HTMLDialogElement;
    expect(dialog().open).toBe(true);
    await screen.rerender({ data: { ...data(true, null, '/admin/pages'), pendingEntries: pending }, children: child });
    expect(dialog().open).toBe(false);
  });

  it('shows the publish-site trigger even when no concepts are configured', async () => {
    // The confirm posts the named ?/publishAll action to the current page, so a stray pending
    // ref with zero configured concepts no longer reads data.concepts[0].
    const screen = render(AdminLayout, {
      data: { ...data(true), concepts: [], pendingEntries: [{ concept: 'posts', id: 'a' }] },
      children: child,
    });
    await expect.element(screen.getByRole('button', { name: /publish site/i })).toBeInTheDocument();
    expect(screen.container.querySelector('form[action="?/publishAll"]')).not.toBeNull();
  });

  it('associates each pending group list with its eyebrow label', async () => {
    const pending = [
      { concept: 'posts', id: '2026-05-01-a' },
      { concept: 'pages', id: 'about' },
    ];
    const screen = render(AdminLayout, { data: { ...data(true), pendingEntries: pending }, children: child });
    await screen.getByRole('button', { name: 'Publish site (2)' }).click();
    const dialog = screen.container.querySelector('dialog[aria-labelledby="cairn-publish-all-title"]')!;
    const lists = Array.from(dialog.querySelectorAll('ul[aria-labelledby]'));
    expect(lists.length).toBe(2);
    const labelTexts = lists.map(
      (ul) => dialog.querySelector(`#${ul.getAttribute('aria-labelledby')}`)?.textContent?.trim(),
    );
    expect(labelTexts).toEqual(['Posts', 'Pages']);
  });

  it('hides the publish-site trigger when nothing is pending', async () => {
    const nullScreen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(nullScreen.getByRole('button', { name: /publish site/i })).not.toBeInTheDocument();
    const emptyScreen = render(AdminLayout, { data: { ...data(true), pendingEntries: [] }, children: child });
    await expect.element(emptyScreen.getByRole('button', { name: /publish site/i })).not.toBeInTheDocument();
  });

  it('drops the persistent nav drawer on a desk route (SSR markup, no flash)', async () => {
    // An open document recedes the nav: the drawer shell omits lg:drawer-open so the sidebar starts
    // closed at desktop width. The class is conditional in the rendered markup (no effect flips it),
    // so the chrome-free state resolves at SSR and never flashes.
    const screen = render(AdminLayoutDeskHarness, {
      data: data(true, null, '/admin/posts/2026-05-hello'),
    });
    const drawer = screen.container.querySelector('.drawer')!;
    expect(drawer.classList.contains('lg:drawer-open')).toBe(false);
  });

  it('keeps the persistent nav drawer on a list route', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    const drawer = screen.container.querySelector('.drawer')!;
    expect(drawer.classList.contains('lg:drawer-open')).toBe(true);
  });

  it('shows the drawer toggle at desktop width on a desk route', async () => {
    // On a desk route the toggle loses lg:hidden so it stays visible at desktop and reopens the nav
    // as an overlay. On a list route the persistent sidebar is shown, so the toggle is lg:hidden.
    const deskScreen = render(AdminLayoutDeskHarness, {
      data: data(true, null, '/admin/posts/2026-05-hello'),
    });
    const deskToggleWrap = deskScreen.container.querySelector('label[for="cairn-drawer"]')!.parentElement!;
    expect(deskToggleWrap.classList.contains('lg:hidden')).toBe(false);

    const listScreen = render(AdminLayout, { data: data(true), children: child });
    const listToggleWrap = listScreen.container.querySelector('label[for="cairn-drawer"]')!.parentElement!;
    expect(listToggleWrap.classList.contains('lg:hidden')).toBe(true);
  });

  it('toggles the drawer with Ctrl+B', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    const toggle = () => screen.container.querySelector('#cairn-drawer') as HTMLInputElement;
    const before = toggle().checked;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
    await expect.poll(() => toggle().checked).toBe(!before);
  });
});

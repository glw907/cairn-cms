import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import CairnAdminShell from '../../lib/components/CairnAdminShell.svelte';
import { resolveNavLayout, type NavLayout, type ResolvedNavItem } from '../../lib/sveltekit/admin-nav.js';
// CairnAdminShell joined to a descendant that fills the topbar holder, the way EditPage does.
import CairnAdminShellDeskHarness from './_CairnAdminShellDeskHarness.svelte';

const child = createRawSnippet(() => ({ render: () => '<p>page body</p>' }));

// The authed shell payload. pendingEntries is a streamed promise now, so a default resolves to null
// (GitHub unreachable, so the publish-all action hides); the pending-count tests pass a resolved
// array override. A none-capability payload gets no concepts and no manage-editors capability, the
// same shape shellPayload itself produces (content-routes-core.ts), so the harness accepts a
// pre-shaped none payload through the `capability` override rather than reconstructing that shape.
// `nav` is built through the same `resolveNavLayout` shellPayload calls, with `adminNav` (the
// legacy customNav shape) folded into the default arrangement, so a fixture always carries exactly
// what production would produce for an undeclared navLayout.
function data(
  canManageEditors: boolean,
  navLabel: string | null = null,
  pathname = '/admin/posts',
  capability: 'owner' | 'editor' | 'none' = canManageEditors ? 'owner' : 'editor',
  adminNav: ResolvedNavItem[] = [],
) {
  const role = canManageEditors ? ('owner' as const) : ('editor' as const);
  const concepts = capability === 'none' ? [] : [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }];
  return {
    public: false as const,
    siteName: 'Test Site',
    user: { displayName: 'Ed', email: 'ed@example.com', role, capability },
    concepts,
    nav: resolveNavLayout({ layout: undefined, adminNav, concepts, navMenuLabel: navLabel, capability, role }),
    pathname,
    theme: 'cairn-admin' as const,
    collapsedNav: [] as string[],
    csrf: 'test-csrf-token',
    pendingEntries: Promise.resolve(null) as Promise<{ concept: string; id: string }[] | null>,
  };
}

// A shell payload built from a declared navLayout tree, resolved the same way shellPayload resolves
// one for real (content-routes-core.ts): the fixture always carries exactly what the resolver would
// produce for the given declaration, capability, and role.
function dataWithLayout(
  layout: NavLayout,
  overrides: {
    pathname?: string;
    capability?: 'owner' | 'editor' | 'none';
    role?: 'owner' | 'editor';
    navMenuLabel?: string | null;
    concepts?: { id: string; label: string }[];
  } = {},
) {
  const capability = overrides.capability ?? 'owner';
  const role = overrides.role ?? (capability === 'owner' ? 'owner' : 'editor');
  const concepts = overrides.concepts ?? [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }];
  const navMenuLabel = overrides.navMenuLabel ?? null;
  return {
    public: false as const,
    siteName: 'Test Site',
    user: { displayName: 'Ed', email: 'ed@example.com', role, capability },
    concepts: capability === 'none' ? [] : concepts,
    nav: resolveNavLayout({ layout, adminNav: [], concepts, navMenuLabel, capability, role }),
    pathname: overrides.pathname ?? '/admin/posts',
    theme: 'cairn-admin' as const,
    collapsedNav: [] as string[],
    csrf: 'test-csrf-token',
    pendingEntries: Promise.resolve(null) as Promise<{ concept: string; id: string }[] | null>,
  };
}

describe('CairnAdminShell', () => {
  beforeEach(() => {
    // Clear any theme cookie a prior test wrote so the no-cookie OS-preference branch and the
    // toggle assertions stay deterministic across tests.
    document.cookie = 'cairn-admin-theme=; path=/admin; max-age=0';
  });

  it('applies the cairn-admin theme and renders the concept nav and child', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    await expect.element(screen.getByText('page body')).toBeInTheDocument();
    // Scope to the sidebar nav: the topbar breadcrumb also renders a concept link at this depth.
    const sidebar = screen.getByRole('navigation', { name: 'Site content' });
    await expect.element(sidebar.getByRole('link', { name: 'Posts' })).toBeInTheDocument();
    await expect.element(sidebar.getByRole('link', { name: 'Pages' })).toBeInTheDocument();
    expect(document.querySelector('[data-theme="cairn-admin"]')).not.toBeNull();
  });

  it('carries a CSRF field in every POST form', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    const postForms = screen.container.querySelectorAll('form[method="POST"]');
    const csrfFields = screen.container.querySelectorAll('form[method="POST"] input[name="csrf"]');
    expect(postForms.length).toBeGreaterThan(0);
    expect(csrfFields.length).toBe(postForms.length);
  });

  it('shows the Cairn brand in the sidebar', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    await expect.element(screen.getByText('Cairn', { exact: true })).toBeInTheDocument();
  });

  it('opens the command palette from the topbar trigger', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    await screen.getByRole('button', { name: /search or jump to/i }).click();
    await expect.element(screen.getByRole('textbox', { name: /search or jump to/i })).toBeInTheDocument();
    // A palette-only command confirms the dialog is open (a nav link like Posts also exists in the sidebar).
    await expect.element(screen.getByText('View the live site')).toBeInTheDocument();
  });

  it('closes the command palette once a navigation lands', async () => {
    // A destination command is a plain link that navigates; the palette closes itself from the
    // pathname effect after the route changes, rather than racing a close() against the link's own
    // navigation (which cancelled it). Re-rendering with a new pathname stands in for that nav.
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    await screen.getByRole('button', { name: /search or jump to/i }).click();
    expect(document.querySelector<HTMLDialogElement>('dialog.modal')?.open).toBe(true);
    await screen.rerender({ data: data(true, null, '/admin/pages'), children: child });
    expect(document.querySelector<HTMLDialogElement>('dialog.modal')?.open).toBe(false);
  });

  it('renders the core group with its built-in entries', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    await expect.element(screen.getByText('Core', { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('shows the manage-editors link to an owner', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    await expect.element(screen.getByRole('link', { name: /editors/i })).toBeInTheDocument();
  });

  it('hides the manage-editors link from an editor', async () => {
    const screen = render(CairnAdminShell, { data: data(false), children: child });
    await expect.element(screen.getByRole('link', { name: /editors/i })).not.toBeInTheDocument();
  });

  it('hides every engine nav item from a none-capability session but keeps the site custom nav', async () => {
    // A none-capability session (the spec's none contract) still authenticates and reaches the
    // shell, but every engine screen (Library, Tags, the nav-menu editor, Settings, Help) 403s it,
    // so the sidebar carries only the site's own custom nav.
    const adminNav: ResolvedNavItem[] = [
      { label: 'Roster', iconName: 'inbox', href: '/admin/roster', ownerOnly: false },
    ];
    const screen = render(CairnAdminShell, {
      data: data(false, 'Primary nav', '/admin/roster', 'none', adminNav),
      children: child,
    });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' });
    await expect.element(sidebar.getByRole('link', { name: 'Roster' })).toBeInTheDocument();
    expect(sidebar.getByRole('link', { name: 'Library' }).query()).toBeNull();
    expect(sidebar.getByRole('link', { name: 'Tags' }).query()).toBeNull();
    expect(sidebar.getByRole('link', { name: 'Settings' }).query()).toBeNull();
    expect(sidebar.getByRole('link', { name: 'Primary nav' }).query()).toBeNull();
    expect(sidebar.getByRole('link', { name: 'Help' }).query()).toBeNull();
    expect(sidebar.getByRole('link', { name: 'Posts' }).query()).toBeNull();
  });

  it('renders every engine nav item for an editor-capability session (regression pin)', async () => {
    const screen = render(CairnAdminShell, { data: data(false, 'Primary nav', '/admin/posts', 'editor'), children: child });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' });
    await expect.element(sidebar.getByRole('link', { name: 'Posts' })).toBeInTheDocument();
    await expect.element(sidebar.getByRole('link', { name: 'Library' })).toBeInTheDocument();
    await expect.element(sidebar.getByRole('link', { name: 'Tags' })).toBeInTheDocument();
    await expect.element(sidebar.getByRole('link', { name: 'Primary nav' })).toBeInTheDocument();
    await expect.element(sidebar.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    await expect.element(sidebar.getByRole('link', { name: 'Help' })).toBeInTheDocument();
    expect(sidebar.getByRole('link', { name: /editors/i }).query()).toBeNull();
  });

  it('shows the navigation link when a nav menu is configured', async () => {
    const screen = render(CairnAdminShell, { data: data(false, 'Primary nav'), children: child });
    await expect.element(screen.getByRole('link', { name: 'Primary nav' })).toBeInTheDocument();
  });

  it('labels the media-library nav entry Library, not Media', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    await expect.element(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Media', exact: true }).query()).toBeNull();
  });

  it('shows the user identity and a sign-out control in the sidebar', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    await expect.element(screen.getByText('ed@example.com')).toBeInTheDocument();
    await expect.element(screen.getByText('Ed', { exact: true })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('shows the owner role in the user menu', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    await expect.element(screen.getByText(/owner/i)).toBeInTheDocument();
  });

  it('derives breadcrumbs from the path inside an entry route', async () => {
    const screen = render(CairnAdminShell, { data: data(true, null, '/admin/posts/2026-05-hello'), children: child });
    await expect.element(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    await expect.element(screen.getByText('2026-05-hello')).toBeInTheDocument();
  });

  it('renders the registered desk snippet in the band on a desk route', async () => {
    // A descendant document fills the topbar holder; the shell renders it after the breadcrumb on
    // a desk route (/admin/<concept>/<id>). DeskChild stands in for EditPage's registration.
    const screen = render(CairnAdminShellDeskHarness, {
      data: data(true, null, '/admin/posts/2026-05-hello'),
    });
    await expect.element(screen.getByTestId('desk-control')).toBeInTheDocument();
  });

  it('stands down the palette trigger and the site Publish button on a desk route', async () => {
    const pending = [{ concept: 'posts', id: '2026-05-hello' }];
    const screen = render(CairnAdminShellDeskHarness, {
      data: { ...data(true, null, '/admin/posts/2026-05-hello'), pendingEntries: Promise.resolve(pending) },
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
    const screen = render(CairnAdminShellDeskHarness, { data: data(true) });
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
      const screen = render(CairnAdminShell, { data: data(true), children: child });
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
    render(CairnAdminShell, { data: data(true), children: child });
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
    const screen = render(CairnAdminShell, { data: { ...data(true), pendingEntries: Promise.resolve(pending) }, children: child });
    await expect.element(screen.getByRole('button', { name: 'Publish site (4)' })).toBeInTheDocument();
  });

  it('confirms a publish-all with the pending ids grouped by concept label', async () => {
    const pending = [
      { concept: 'posts', id: '2026-05-01-a' },
      { concept: 'posts', id: '2026-05-02-b' },
      { concept: 'pages', id: 'about' },
      { concept: 'widgets', id: 'w1' },
    ];
    const screen = render(CairnAdminShell, { data: { ...data(true), pendingEntries: Promise.resolve(pending) }, children: child });
    await screen.getByRole('button', { name: 'Publish site (4)' }).click();
    const dialog = screen.container.querySelector('dialog[aria-labelledby="cairn-shell-publish-all-title"]') as HTMLDialogElement;
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
    // The confirm posts the named action to the absolute catch-all with the CSRF field.
    const form = dialog.querySelector('form[action="/admin?/publishAll"]');
    expect(form).not.toBeNull();
    expect(form!.querySelector('input[name="csrf"]')).not.toBeNull();
  });

  it('closes the publish-all dialog once a navigation lands', async () => {
    const pending = [{ concept: 'posts', id: '2026-05-01-a' }];
    const screen = render(CairnAdminShell, { data: { ...data(true), pendingEntries: Promise.resolve(pending) }, children: child });
    await screen.getByRole('button', { name: 'Publish site (1)' }).click();
    const dialog = () =>
      screen.container.querySelector('dialog[aria-labelledby="cairn-shell-publish-all-title"]') as HTMLDialogElement;
    expect(dialog().open).toBe(true);
    await screen.rerender({ data: { ...data(true, null, '/admin/pages'), pendingEntries: Promise.resolve(pending) }, children: child });
    expect(dialog().open).toBe(false);
  });

  it('shows the publish-site trigger even when no concepts are configured', async () => {
    // The confirm posts the named ?/publishAll action to the current page, so a stray pending
    // ref with zero configured concepts no longer reads data.concepts[0].
    const screen = render(CairnAdminShell, {
      data: { ...data(true), concepts: [], pendingEntries: Promise.resolve([{ concept: 'posts', id: 'a' }]) },
      children: child,
    });
    await expect.element(screen.getByRole('button', { name: /publish site/i })).toBeInTheDocument();
    expect(screen.container.querySelector('form[action="/admin?/publishAll"]')).not.toBeNull();
  });

  it('associates each pending group list with its eyebrow label', async () => {
    const pending = [
      { concept: 'posts', id: '2026-05-01-a' },
      { concept: 'pages', id: 'about' },
    ];
    const screen = render(CairnAdminShell, { data: { ...data(true), pendingEntries: Promise.resolve(pending) }, children: child });
    await screen.getByRole('button', { name: 'Publish site (2)' }).click();
    const dialog = screen.container.querySelector('dialog[aria-labelledby="cairn-shell-publish-all-title"]')!;
    const lists = Array.from(dialog.querySelectorAll('ul[aria-labelledby]'));
    expect(lists.length).toBe(2);
    const labelTexts = lists.map(
      (ul) => dialog.querySelector(`#${ul.getAttribute('aria-labelledby')}`)?.textContent?.trim(),
    );
    expect(labelTexts).toEqual(['Posts', 'Pages']);
  });

  it('hides the publish-site trigger when nothing is pending', async () => {
    const nullScreen = render(CairnAdminShell, { data: data(true), children: child });
    await expect.element(nullScreen.getByRole('button', { name: /publish site/i })).not.toBeInTheDocument();
    const emptyScreen = render(CairnAdminShell, { data: { ...data(true), pendingEntries: Promise.resolve([]) }, children: child });
    await expect.element(emptyScreen.getByRole('button', { name: /publish site/i })).not.toBeInTheDocument();
  });

  it('recedes the nav drawer to the xl breakpoint on a desk route (SSR markup, no flash)', async () => {
    // A desk route no longer drops the persistent sidebar outright: it recedes it behind the
    // toggle through the lg-xl tablet band and persists it again at xl (the desk rider, spec §5).
    // The class is conditional in the rendered markup (no effect flips it), so the chrome state
    // resolves at SSR and never flashes.
    const screen = render(CairnAdminShellDeskHarness, {
      data: data(true, null, '/admin/posts/2026-05-hello'),
    });
    const drawer = screen.container.querySelector('.drawer')!;
    expect(drawer.classList.contains('lg:drawer-open')).toBe(false);
    expect(drawer.classList.contains('xl:drawer-open')).toBe(true);
  });

  it('keeps the persistent nav drawer at lg on a list (office) route, with no xl-only gate', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    const drawer = screen.container.querySelector('.drawer')!;
    expect(drawer.classList.contains('lg:drawer-open')).toBe(true);
    expect(drawer.classList.contains('xl:drawer-open')).toBe(false);
  });

  it('reserves room for the fixed persistent sidebar at the route kind\'s own breakpoint', async () => {
    // Regression guard for the production scroll-bleed report: the desktop sidebar is `position:
    // fixed` (cairn-admin.css), which needs `drawer-content` to reserve its own width instead of
    // relying on grid track sizing (an out-of-flow item contributes no track width). An office
    // route reserves it at lg; a desk route reserves it at xl instead (the desk rider).
    const listScreen = render(CairnAdminShell, { data: data(true), children: child });
    const listContent = listScreen.container.querySelector('.drawer-content')!;
    expect(listContent.classList.contains('lg:ml-56')).toBe(true);
    expect(listContent.classList.contains('xl:ml-56')).toBe(false);

    const deskScreen = render(CairnAdminShellDeskHarness, {
      data: data(true, null, '/admin/posts/2026-05-hello'),
    });
    const deskContent = deskScreen.container.querySelector('.drawer-content')!;
    expect(deskContent.classList.contains('lg:ml-56')).toBe(false);
    expect(deskContent.classList.contains('xl:ml-56')).toBe(true);
  });

  it('keeps the persistent nav drawer on a deep custom-nav route (path depth alone is not a desk route)', async () => {
    // /admin/club/events is a developer's own custom nav section entry, three path segments deep,
    // but it is not a document editor: the second segment names no content concept. Path depth
    // alone once misclassified this as a desk route and receded the persistent sidebar to the
    // toggle-controlled mobile overlay, which read as the sidebar sliding away on an ordinary
    // desktop nav click.
    const adminNav: ResolvedNavItem[] = [
      { label: 'Club', children: [{ label: 'Events', iconName: 'calendar', href: '/admin/club/events', ownerOnly: false }] },
    ];
    const screen = render(CairnAdminShell, {
      data: data(true, null, '/admin/club/events', undefined, adminNav),
      children: child,
    });
    const drawer = screen.container.querySelector('.drawer')!;
    expect(drawer.classList.contains('lg:drawer-open')).toBe(true);
  });

  it('does not collapse or persist a nav-section collapse on a desktop navigation', async () => {
    // A pathname change alone must never touch the collapsed-section state or its cookie: that
    // state is owned solely by the section's own toggle. Regression guard for the drawer's
    // pathname effect, which resets other navigation-scoped UI (the palette, drawerOpen) but must
    // leave the persisted `collapsed` set alone.
    document.cookie = 'cairn-admin-nav-collapsed=; path=/admin; max-age=0';
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    await expect.element(screen.getByText('Core', { exact: true })).toBeInTheDocument();
    await screen.rerender({ data: data(true, null, '/admin/pages'), children: child });
    const details = screen.container.querySelector('details')!;
    expect(details.open).toBe(true);
    expect(document.cookie).not.toContain('cairn-admin-nav-collapsed=');
  });

  it('shows the drawer toggle through the tablet band on a desk route, hiding only at xl', async () => {
    // A desk route recedes the sidebar behind the toggle through lg-xl (the desk rider), so the
    // toggle stays visible there and only hides once the sidebar persists again at xl. An office
    // route's persistent sidebar stands in for the toggle starting at lg.
    const deskScreen = render(CairnAdminShellDeskHarness, {
      data: data(true, null, '/admin/posts/2026-05-hello'),
    });
    const deskToggleWrap = deskScreen.container.querySelector('label[for="cairn-shell-drawer"]')!.parentElement!;
    expect(deskToggleWrap.classList.contains('lg:hidden')).toBe(false);
    expect(deskToggleWrap.classList.contains('xl:hidden')).toBe(true);

    const listScreen = render(CairnAdminShell, { data: data(true), children: child });
    const listToggleWrap = listScreen.container.querySelector('label[for="cairn-shell-drawer"]')!.parentElement!;
    expect(listToggleWrap.classList.contains('lg:hidden')).toBe(true);
    expect(listToggleWrap.classList.contains('xl:hidden')).toBe(false);
  });

  it('lays out the shell as nested drawer regions, not merely styled parts', async () => {
    // The visual proof of the shell confirms only "styled", not "laid out": a DaisyUI nested-scoping
    // bug once shipped a non-rendering (display:block) drawer whose classes were all present. This
    // guards the structure itself, the drawer regions present and correctly nested. data(true) is an
    // owner on the default /admin/posts list route (the persistent office shell). The first arg of
    // data(...) selects owner vs editor; the pathname stays /admin/posts, a list route.
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    const drawer = screen.container.querySelector('.drawer')!;
    expect(drawer).not.toBeNull();
    // :scope > so a regression that flattens or detaches a region (the display:block failure mode)
    // fails, rather than matching a descendant anywhere in the subtree.
    const content = drawer.querySelector(':scope > .drawer-content');
    const side = drawer.querySelector(':scope > .drawer-side');
    expect(content).not.toBeNull();
    expect(side).not.toBeNull();
    // The topbar lives inside the content region, the sidebar nav inside the side region.
    expect(content!.querySelector('.navbar')).not.toBeNull();
    expect(side!.querySelector('nav[aria-label="Site content"]')).not.toBeNull();
  });

  it('toggles the drawer with Ctrl+B', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    const toggle = () => screen.container.querySelector('#cairn-shell-drawer') as HTMLInputElement;
    const before = toggle().checked;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
    await expect.poll(() => toggle().checked).toBe(!before);
  });

  it('posts the logout form to the absolute /admin?/logout catch-all', async () => {
    const screen = render(CairnAdminShell, { data: data(true), children: child });
    const form = screen.container.querySelector('form[action="/admin?/logout"]');
    expect(form).not.toBeNull();
    expect(form!.querySelector('input[name="csrf"]')).not.toBeNull();
  });

  it('renders a custom adminNav entry as a sidebar link to its href', async () => {
    const adminNav: ResolvedNavItem[] = [
      { label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false },
    ];
    const screen = render(CairnAdminShell, { data: data(true, null, undefined, undefined, adminNav), children: child });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' });
    await expect.element(sidebar.getByRole('link', { name: 'Signups' })).toBeInTheDocument();
  });

  it('renders a custom adminNav section as its own collapsible group beside Core', async () => {
    const adminNav: ResolvedNavItem[] = [
      { label: 'Club', children: [{ label: 'Events', iconName: 'calendar', href: '/admin/club/events', ownerOnly: false }] },
    ];
    const screen = render(CairnAdminShell, { data: data(true, null, undefined, undefined, adminNav), children: child });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' });
    await expect.element(sidebar.getByText('Club')).toBeInTheDocument();
    await expect.element(sidebar.getByRole('link', { name: 'Events' })).toBeInTheDocument();
    // The section is its own group, not folded into Core: Core's own summary is still present too.
    await expect.element(sidebar.getByText('Core')).toBeInTheDocument();
  });

  it('omits an owner-only custom entry the payload has already role-filtered out', async () => {
    // The shell receives an already-role-filtered customNav (the server hides an owner-only entry
    // from a non-owner), so an editor payload simply carries no such entry and the link is absent.
    const screen = render(CairnAdminShell, { data: data(false), children: child });
    expect(screen.container.querySelector('a[href="/admin/signups"]')).toBeNull();
  });

  it('renders only the children bare for a public payload, with no chrome', async () => {
    const screen = render(CairnAdminShell, {
      data: { public: true as const, siteName: 'Test Site' },
      children: child,
    });
    await expect.element(screen.getByText('page body')).toBeInTheDocument();
    // No sidebar nav, no drawer, no logout form: the login/confirm pages render with no chrome.
    expect(screen.container.querySelector('nav[aria-label="Site content"]')).toBeNull();
    expect(screen.container.querySelector('.drawer')).toBeNull();
    expect(screen.container.querySelector('form[action="/admin?/logout"]')).toBeNull();
  });

  it('renders the zero-config default arrangement exactly: Core in order, Help alone in the foot', async () => {
    // The default synthesis (an undeclared navLayout) reproduces today's render exactly: one Core
    // section holding the concepts, the legacy flat entry, then the engine screens in order, and
    // Help left unreferenced so it resolves into the fallback foot band.
    const adminNav: ResolvedNavItem[] = [
      { label: 'Signups', iconName: 'inbox', href: '/admin/signups', ownerOnly: false },
    ];
    const screen = render(CairnAdminShell, {
      data: data(true, 'Primary nav', '/admin/posts', 'owner', adminNav),
      children: child,
    });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' }).element() as HTMLElement;
    const details = sidebar.querySelectorAll('details');
    expect(details.length).toBe(1); // Core is the only section; Help is not a section.
    const coreLabels = Array.from(details[0].querySelectorAll('a')).map((a) => a.textContent?.trim());
    expect(coreLabels).toEqual([
      'Posts',
      'Pages',
      'Signups',
      'Library',
      'Tags',
      'Primary nav',
      'Settings',
      'Editors',
    ]);
    const foot = sidebar.querySelector('[data-testid="cairn-nav-fallback"]');
    expect(foot).not.toBeNull();
    expect(Array.from(foot!.querySelectorAll('a')).map((a) => a.textContent?.trim())).toEqual(['Help']);
    expect(foot!.compareDocumentPosition(details[0]) & Node.DOCUMENT_POSITION_PRECEDING).not.toBe(0);
  });

  it('renders an arranged navLayout in declared order, with a relabel and a fallback foot', async () => {
    const layout: NavLayout = [
      { label: 'Content', children: [{ screen: 'posts' }, { screen: 'pages' }] },
      {
        label: 'Site',
        children: [
          { screen: 'media' },
          { screen: 'vocabulary' },
          { screen: 'settings', label: 'Site settings' },
          { screen: 'editors' },
        ],
      },
      // help is deliberately unreferenced: it falls back to the foot band.
    ];
    const screen = render(CairnAdminShell, { data: dataWithLayout(layout), children: child });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' }).element() as HTMLElement;
    const sections = Array.from(sidebar.querySelectorAll('details')).map((d) => ({
      label: d.querySelector('summary')!.textContent?.trim(),
      links: Array.from(d.querySelectorAll('a')).map((a) => a.textContent?.trim()),
    }));
    expect(sections).toEqual([
      { label: 'Content', links: ['Posts', 'Pages'] },
      { label: 'Site', links: ['Library', 'Tags', 'Site settings', 'Editors'] },
    ]);
    expect(sidebar.querySelector('summary')?.textContent).not.toContain('Settings');
    const foot = sidebar.querySelector('[data-testid="cairn-nav-fallback"]');
    expect(Array.from(foot!.querySelectorAll('a')).map((a) => a.textContent?.trim())).toEqual(['Help']);
  });

  it('renders loose top-level nodes between sections, batched outside any collapsible group', async () => {
    const layout: NavLayout = [
      { screen: 'posts' },
      { label: 'Site', children: [{ screen: 'settings' }] },
      { label: 'Roster', icon: 'inbox', href: '/admin/roster' },
    ];
    const screen = render(CairnAdminShell, { data: dataWithLayout(layout), children: child });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' }).element() as HTMLElement;
    await expect.element(screen.getByRole('link', { name: 'Posts' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Roster' })).toBeInTheDocument();
    // Neither loose node opens a collapsible group: only the one declared section does.
    expect(sidebar.querySelectorAll('details').length).toBe(1);
    const postsLink = Array.from(sidebar.querySelectorAll('a')).find((a) => a.textContent?.trim() === 'Posts')!;
    expect(postsLink.closest('details')).toBeNull();
    const rosterLink = Array.from(sidebar.querySelectorAll('a')).find((a) => a.textContent?.trim() === 'Roster')!;
    expect(rosterLink.closest('details')).toBeNull();
  });

  it('hides every engine door for a none-capability session, with no empty Core header', async () => {
    // With no custom adminNav at all, every candidate for the Core section is an engine screen, and
    // every engine screen is stripped for a none-capability session: Core would be empty, so it must
    // not render at all (the deliberate none-session delta, locked call 7), and the fallback foot
    // stays empty too (Help is itself an engine screen, gated the same way).
    const screen = render(CairnAdminShell, {
      data: data(false, 'Primary nav', '/admin/posts', 'none'),
      children: child,
    });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' }).element() as HTMLElement;
    expect(sidebar.textContent).not.toContain('Core');
    expect(sidebar.querySelectorAll('details').length).toBe(0);
    expect(sidebar.querySelector('[data-testid="cairn-nav-fallback"]')).toBeNull();
  });

  it('keeps a site custom entry inside the Core section for a none-capability session', async () => {
    // A site's own custom entry is not an engine screen, so it survives capability filtering and
    // still folds into the default Core section, even though every engine door beside it is gone.
    const adminNav: ResolvedNavItem[] = [
      { label: 'Roster', iconName: 'inbox', href: '/admin/roster', ownerOnly: false },
    ];
    const screen = render(CairnAdminShell, {
      data: data(false, 'Primary nav', '/admin/roster', 'none', adminNav),
      children: child,
    });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' }).element() as HTMLElement;
    expect(sidebar.querySelector('[data-testid="cairn-nav-fallback"]')).toBeNull();
    await expect.element(screen.getByRole('link', { name: 'Roster' })).toBeInTheDocument();
  });

  it('lists a section child in the command palette', async () => {
    const layout: NavLayout = [
      { label: 'Content', children: [{ screen: 'posts' }] },
    ];
    const screen = render(CairnAdminShell, { data: dataWithLayout(layout), children: child });
    await screen.getByRole('button', { name: /search or jump to/i }).click();
    // Posts is a section child, not a top-level loose node: before this task the palette derived
    // only from the Core section's own children, so a non-Core section's child was absent.
    await expect.element(screen.getByRole('dialog').getByRole('link', { name: 'Posts' })).toBeInTheDocument();
    // Help, left unreferenced, resolves to the fallback foot; the palette still surfaces it.
    await expect.element(screen.getByRole('dialog').getByRole('link', { name: 'Help' })).toBeInTheDocument();
  });
});

<!--
@component
The admin shell: a DaisyUI drawer-and-navbar that wraps every authed admin page. The nav is
data-driven from the enabled concepts and role-gated (owners see the manage-editors entry). The
root sets `data-theme` to the resolved light or dark theme (seeded from the SSR'd cookie choice,
flipped by the topbar toggle) and imports the self-contained Warm Stone theme, so the admin looks
identical on every host regardless of the site's own theme.
-->
<script lang="ts">
  import { onMount, setContext, untrack, type Component, type Snippet } from 'svelte';
  import type { LayoutData } from '../sveltekit/content-routes.js';
  import CsrfField from './CsrfField.svelte';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import { MenuIcon, LogOutIcon, SunIcon, MoonIcon, ChevronRightIcon, SearchIcon } from './admin-icons.js';
  import CairnLogo from './CairnLogo.svelte';
  import { cairnFaviconHref } from './cairn-favicon.js';
  import { warnIfChromeWrapped } from './chrome-guard.js';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import SignpostIcon from '@lucide/svelte/icons/signpost';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import UsersIcon from '@lucide/svelte/icons/users';
  import BlocksIcon from '@lucide/svelte/icons/blocks';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import './cairn-admin.css';

  interface Props {
    /** The layout load's data: site name, user, nav concepts, active path, owner capability. */
    data: LayoutData;
    /** The page body. */
    children: Snippet;
  }

  let { data, children }: Props = $props();

  // Hand descendant forms a live getter for the CSRF token layoutLoad issued, so the field stays
  // correct even if the token ever rotates mid-session.
  setContext(CSRF_CONTEXT_KEY, () => data.csrf);

  // Persist an admin preference for a year, path-scoped to /admin so the cookie never reaches the
  // host's own pages.
  function writeAdminCookie(name: string, value: string) {
    document.cookie = `${name}=${value}; path=/admin; max-age=31536000; samesite=lax`;
  }

  // A nav entry. `href` makes it a link; without one it is an inert stub (a developer-tool slot the
  // extension mechanism has not wired yet).
  interface NavItem {
    label: string;
    icon: Component;
    href?: string;
  }

  // The core Cairn functions, all in one group: the content concepts, the nav-menu editor (when the
  // site configures one; a signpost, kept distinct from the Settings gear), the site Settings, and
  // the owner-only Editors.
  const coreItems: NavItem[] = $derived([
    ...data.concepts.map((c) => ({ label: c.label, icon: FileTextIcon, href: `/admin/${c.id}` })),
    ...(data.navLabel ? [{ label: data.navLabel, icon: SignpostIcon, href: '/admin/nav' }] : []),
    { label: 'Settings', icon: SettingsIcon, href: '/admin/settings' },
    ...(data.canManageEditors ? [{ label: 'Editors', icon: UsersIcon, href: '/admin/editors' }] : []),
  ]);

  // The developer-extension groups: each custom-named, with its own items, collapsible like the core
  // group. The CairnExtension seam will supply these; until it lands they are inert example stubs that
  // show the shape, multiple named groups kept visually apart from the core functions.
  const extensionGroups: { name: string; items: NavItem[] }[] = [
    { name: 'Marketing', items: [
      { label: 'Campaigns', icon: BlocksIcon },
      { label: 'Audiences', icon: BlocksIcon },
    ] },
    { name: 'Shop', items: [
      { label: 'Products', icon: BlocksIcon },
      { label: 'Orders', icon: BlocksIcon },
    ] },
  ];

  // Up to two uppercase initials from the display name, falling back to '?' for an empty name.
  function initialsOf(displayName: string): string {
    const letters = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
    return letters || '?';
  }

  const initials = $derived(initialsOf(data.user.displayName));

  function isActive(href: string): boolean {
    return data.pathname === href || data.pathname.startsWith(`${href}/`);
  }

  // Which nav groups are collapsed. Seeded once from the SSR'd cookie (so a collapsed group renders
  // collapsed with no flash), then owned by the toggle below, which mirrors each change to the cookie.
  let collapsed = $state(new Set(untrack(() => data.collapsedNav)));

  function onToggleSection(label: string, open: boolean) {
    const next = new Set(collapsed);
    if (open) next.delete(label);
    else next.add(label);
    collapsed = next;
    const value = [...next].map((entry) => encodeURIComponent(entry)).join(',');
    writeAdminCookie('cairn-admin-nav-collapsed', value);
  }

  let drawerOpen = $state(false);

  function onKeydown(e: KeyboardEvent) {
    if (e.key.toLowerCase() === 'b' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      drawerOpen = !drawerOpen;
    }
    if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      openPalette();
    }
  }

  // Close the mobile drawer and the command palette whenever the active path changes (a nav click
  // navigated). Closing the palette here, after the navigation lands, avoids racing a synchronous
  // close() against a result link's own navigation, which would cancel it.
  $effect(() => {
    data.pathname;
    drawerOpen = false;
    paletteDialog?.close();
    publishAllDialog?.close();
  });

  // Seed from the SSR'd theme once. The live theme is owned by this state and the toggle, so the
  // initial read of data.theme is intentional and untracked to keep it out of any reactive graph.
  let theme = $state<'cairn-admin' | 'cairn-admin-dark'>(untrack(() => data.theme));

  // First mount with no persisted choice follows the OS preference. A returning user's cookie was
  // already honored by the layout load (data.theme), so this only fires on a first-ever visit.
  $effect(() => {
    const hasCookie = document.cookie.split('; ').some((c) => c.startsWith('cairn-admin-theme='));
    if (!hasCookie && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      theme = 'cairn-admin-dark';
    }
  });

  function toggleTheme() {
    theme = theme === 'cairn-admin' ? 'cairn-admin-dark' : 'cairn-admin';
    writeAdminCookie('cairn-admin-theme', theme);
  }

  // The command palette: a quick jump-to over the admin's destinations plus a couple of actions, so
  // the topbar carries something productive. Opened by the topbar trigger or Cmd/Ctrl+K.
  interface Command {
    label: string;
    icon: Component;
    href?: string;
    external?: boolean;
    action?: () => void;
  }

  let paletteDialog = $state<HTMLDialogElement>();
  let paletteList = $state<HTMLUListElement>();
  let paletteQuery = $state('');

  // The site-wide publish action. The trigger and its confirm render only while entries are
  // pending; a null pendingEntries (GitHub unreachable) hides them rather than showing a stale count.
  let publishAllDialog = $state<HTMLDialogElement>();
  const pendingCount = $derived(data.pendingEntries?.length ?? 0);
  // The pending ids grouped under their concept's nav label, in first-seen order. A ref whose
  // concept is not in the nav (an unconfigured key) falls back to the raw key.
  const pendingGroups = $derived.by(() => {
    const groups = new Map<string, string[]>();
    for (const entry of data.pendingEntries ?? []) {
      const label = data.concepts.find((c) => c.id === entry.concept)?.label ?? entry.concept;
      groups.set(label, [...(groups.get(label) ?? []), entry.id]);
    }
    return [...groups.entries()].map(([label, ids]) => ({ label, ids }));
  });

  // The bare data-theme wrapper is the admin root the dev chrome-guard measures from.
  let rootEl = $state<HTMLElement>();
  onMount(() => {
    if (rootEl) warnIfChromeWrapped(rootEl);
  });

  const paletteCommands = $derived<Command[]>([
    ...coreItems.map((item) => ({ label: item.label, icon: item.icon, href: item.href })),
    { label: 'View the live site', icon: ExternalLinkIcon, href: '/', external: true },
    theme === 'cairn-admin'
      ? { label: 'Switch to dark mode', icon: MoonIcon, action: toggleTheme }
      : { label: 'Switch to light mode', icon: SunIcon, action: toggleTheme },
  ]);
  const paletteResults = $derived(
    paletteCommands.filter((c) => c.label.toLowerCase().includes(paletteQuery.trim().toLowerCase())),
  );

  function openPalette() {
    if (paletteDialog?.open) return; // showModal throws on an already-open dialog
    paletteQuery = '';
    paletteDialog?.showModal();
  }
  // An action command (theme toggle). Link commands are real <a> elements that navigate on click, so
  // the Enter shortcut clicks the first result element and both paths share the one navigation.
  function runCommand(cmd: Command) {
    paletteDialog?.close();
    cmd.action?.();
  }
  function submitPalette() {
    (paletteList?.querySelector('a, button') as HTMLElement | null)?.click();
  }

  interface Crumb {
    label: string;
    href?: string;
  }

  // Path-derived breadcrumbs: the concept label (from the nav) then the entry id segment. Only the
  // /admin/<concept>/<id> depth shows a trail; a bare concept list shows just the concept.
  const crumbs = $derived.by<Crumb[]>(() => {
    const segs = data.pathname.split('/').filter(Boolean); // ['admin', concept, id?]
    if (segs.length < 2 || segs[0] !== 'admin') return [];
    const conceptId = segs[1];
    const concept = data.concepts.find((c) => c.id === conceptId);
    const out: Crumb[] = [{ label: concept?.label ?? conceptId, href: `/admin/${conceptId}` }];
    if (segs[2]) out.push({ label: decodeURIComponent(segs[2]) });
    return out;
  });

  // The browser-tab title: the deepest breadcrumb (the active concept or entry), then the brand.
  const pageTitle = $derived(crumbs.length ? crumbs[crumbs.length - 1].label : 'Admin');
</script>

<svelte:head>
  <title>{pageTitle} · {data.siteName}</title>
  <link rel="icon" href={cairnFaviconHref} />
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<!-- data-theme sits on a bare wrapper, not on the drawer itself: every admin rule is scoped as a
     descendant of the theme root (`:where([data-theme]) .drawer`), so a class on the theme element
     itself never matches. Keeping the drawer and its base/utility classes one level in lets the
     scoped sheet style them. -->
<div data-theme={theme} bind:this={rootEl}>
  <div class="drawer lg:drawer-open min-h-screen bg-base-200 text-base-content">
    <input id="cairn-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />

    <div class="drawer-content flex flex-col">
      <!-- The topbar is a flat, opaque continuation of the sidebar's brand band: same surface and the
           same hairline, no shadow, so the two form one clean header strip across the sidebar seam. -->
      <div class="navbar bg-base-100 border-b border-[var(--cairn-card-border)] sticky top-0 z-30 gap-2 px-4 lg:px-8">
        <div class="flex-none lg:hidden">
          <label for="cairn-drawer" aria-label="Open menu" class="btn btn-square btn-ghost">
            <MenuIcon class="h-5 w-5" />
          </label>
        </div>
        <!-- Context on the left: the breadcrumb trail inside an entry, the site name on a bare list.
             Hidden on small screens to leave room for the palette trigger. -->
        <div class="hidden min-w-0 max-w-[30%] flex-none truncate sm:block">
          {#if crumbs.length > 1}
            <nav aria-label="Breadcrumb" class="breadcrumbs text-sm">
              <ul>
                {#each crumbs as crumb (crumb.href ?? crumb.label)}
                  <li>{#if crumb.href}<a href={crumb.href}>{crumb.label}</a>{:else}{crumb.label}{/if}</li>
                {/each}
              </ul>
            </nav>
          {:else}
            <span class="font-semibold tracking-tight">{data.siteName}</span>
          {/if}
        </div>
        <!-- The command-palette trigger fills the center: a quick jump-to over the admin, opened here
             or with Cmd/Ctrl+K. -->
        <div class="flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            onclick={openPalette}
            class="flex w-full max-w-md items-center gap-2 rounded-field border border-[var(--cairn-card-border)] bg-base-200/70 px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-base-200 hover:text-base-content"
          >
            <SearchIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="truncate">Search or jump to&hellip;</span>
            <kbd class="ml-auto hidden rounded border border-[var(--cairn-card-border)] px-1.5 text-[0.6875rem] font-medium sm:inline">&#8984;K</kbd>
          </button>
        </div>
        {#if pendingCount > 0}
          <div class="flex-none">
            <button type="button" class="btn btn-primary btn-sm" aria-haspopup="dialog" onclick={() => publishAllDialog?.showModal()}>
              Publish site ({pendingCount})
            </button>
          </div>
        {/if}
        <div class="flex-none">
          <button type="button" class="btn btn-square btn-ghost" aria-label="Toggle theme" onclick={toggleTheme}>
            {#if theme === 'cairn-admin'}<MoonIcon class="h-5 w-5" />{:else}<SunIcon class="h-5 w-5" />{/if}
          </button>
        </div>
      </div>

      <main class="flex-1 p-4 lg:p-8">
        {@render children()}
      </main>

      <dialog bind:this={paletteDialog} class="modal" aria-label="Search or jump to">
        <div class="modal-box max-w-xl self-start p-0 sm:mt-[12vh]">
          <div class="flex items-center gap-2 border-b border-[var(--cairn-card-border)] px-4">
            <SearchIcon class="h-4 w-4 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
            <input
              bind:value={paletteQuery}
              type="text"
              aria-label="Search or jump to"
              placeholder="Search or jump to…"
              class="w-full bg-transparent py-3.5 text-sm outline-hidden placeholder:text-[var(--color-muted)]"
              onkeydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitPalette();
                }
              }}
            />
          </div>
          {#if paletteResults.length}
            <ul bind:this={paletteList} class="menu max-h-[60vh] w-full gap-0.5 overflow-y-auto p-2">
              {#each paletteResults as cmd (cmd.label)}
                <li>
                  {#if cmd.href}
<!-- An internal link navigates and the pathname effect closes the palette once the route lands,
                       so it carries no onclick (closing here would cancel the navigation). An external link
                       opens a new tab and leaves this page, so it closes the palette itself. -->
                    <a
                      href={cmd.href}
                      target={cmd.external ? '_blank' : undefined}
                      rel={cmd.external ? 'noopener' : undefined}
                      onclick={cmd.external ? () => paletteDialog?.close() : undefined}
                    >
                      <cmd.icon class="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
                      {cmd.label}
                      {#if cmd.external}<ExternalLinkIcon class="ml-auto h-3.5 w-3.5 opacity-50" aria-hidden="true" />{/if}
                    </a>
                  {:else}
                    <button type="button" onclick={() => runCommand(cmd)}>
                      <cmd.icon class="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
                      {cmd.label}
                    </button>
                  {/if}
                </li>
              {/each}
            </ul>
          {:else}
            <p class="px-4 py-6 text-center text-sm text-[var(--color-muted)]">No matches for "{paletteQuery}".</p>
          {/if}
        </div>
        <form method="dialog" class="modal-backdrop"><button tabindex="-1" aria-label="Close">close</button></form>
      </dialog>

      {#if pendingCount > 0}
        <dialog bind:this={publishAllDialog} class="modal" aria-labelledby="cairn-publish-all-title">
          <div class="modal-box">
            <div class="mb-3 flex items-center justify-between">
              <h2 id="cairn-publish-all-title" class="text-base font-semibold">Publish the whole site?</h2>
              <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={() => publishAllDialog?.close()}>✕</button>
            </div>
            <p class="text-sm">Every entry below goes live in one step.</p>
            {#each pendingGroups as group, i (group.label)}
              <p id={`cairn-publish-group-${i}`} class="mt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{group.label}</p>
              <ul class="mt-1 text-sm" aria-labelledby={`cairn-publish-group-${i}`}>
                {#each group.ids as id (id)}
                  <li>{id}</li>
                {/each}
              </ul>
            {/each}
            <!-- The publishAll named action is valid on every authed admin view, so the confirm
                 posts to the current page and the topbar works from anywhere. -->
            <form method="POST" action="?/publishAll" class="mt-4 flex justify-end gap-2">
              <CsrfField token={data.csrf} />
              <button type="button" class="btn btn-sm" onclick={() => publishAllDialog?.close()}>Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary">Publish site</button>
            </form>
          </div>
          <form method="dialog" class="modal-backdrop"><button tabindex="-1" aria-label="Close">close</button></form>
        </dialog>
      {/if}
    </div>

    <div class="drawer-side">
      <label for="cairn-drawer" aria-label="Close menu" class="drawer-overlay"></label>
      <nav class="bg-base-100 flex min-h-full w-64 flex-col border-r border-[var(--cairn-card-border)]" aria-label="Site content">
        <!-- Brand band, the same height as the topbar. The mark sits in a filled "app-icon" tile, which
             anchors the corner as a deliberate brand object rather than a washed box. The logo and
             wordmark link to the admin home. -->
        <div class="flex h-16 flex-none items-center border-b border-[var(--cairn-card-border)] px-3">
          <a href="/admin" aria-label="Cairn admin home" class="flex items-center gap-2.5 rounded-field px-2 py-1.5 transition-colors hover:bg-base-content/[0.05]">
            <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-content shadow-sm">
              <CairnLogo class="h-5 w-5" />
            </span>
            <span class="text-xl font-bold tracking-[-0.01em] font-[family-name:var(--font-display)]">Cairn</span>
            <span class="rounded-md border border-base-300 px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">CMS</span>
          </a>
        </div>

        <div class="flex-1 space-y-1 overflow-y-auto py-4">
          {#snippet navSection(label: string, items: NavItem[])}
            <details class="px-2" open={!collapsed.has(label)} ontoggle={(e) => onToggleSection(label, e.currentTarget.open)}>
              <summary class="group/sec flex cursor-pointer select-none items-center gap-2 rounded-field bg-base-content/[0.04] py-2 pl-5 pr-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)] transition-colors hover:bg-base-content/[0.08] hover:text-base-content">
                <span class="truncate">{label}</span>
                <ChevronRightIcon class="cairn-caret ml-auto h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover/sec:opacity-90" aria-hidden="true" />
              </summary>
              <ul class="menu menu-sm mt-1 w-full gap-0.5 p-0">
                {#each items as item (item.href ?? item.label)}
                  <li>
                    {#if item.href}
                      <a
                        href={item.href}
                        class={isActive(item.href)
                          ? 'bg-primary/10 font-semibold text-primary'
                          : 'font-medium text-[var(--color-subtle)]'}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                      >
                        <item.icon class="h-4 w-4" aria-hidden="true" />
                        {item.label}
                      </a>
                    {:else}
                      <span
                        class="cursor-default font-medium text-[var(--color-muted)] opacity-60"
                        aria-disabled="true"
                        title="A slot for a site developer's own admin tool. Not wired yet."
                      >
                        <item.icon class="h-4 w-4" aria-hidden="true" />
                        {item.label}
                      </span>
                    {/if}
                  </li>
                {/each}
              </ul>
            </details>
          {/snippet}

          <!-- Core is the built-in Cairn functions; each developer group sits at the same level. All
               are peer collapsible sections. The extension groups are inert stubs until the
               CairnExtension seam supplies them. -->
          {@render navSection('Core', coreItems)}
          {#each extensionGroups as group (group.name)}
            {@render navSection(group.name, group.items)}
          {/each}
        </div>

        <div class="flex-none border-t border-[var(--cairn-card-border)] px-5 py-4">
          <div class="flex items-center gap-3">
            <div class="avatar avatar-placeholder">
              <div class="bg-neutral text-neutral-content w-9 rounded-full">
                <span class="text-sm">{initials}</span>
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium">{data.user.displayName}</div>
              <div class="truncate text-xs text-[var(--color-muted)]">{data.user.email}</div>
              <div class="text-xs capitalize text-[var(--color-subtle)]">{data.user.role}</div>
            </div>
          </div>
          <form method="POST" action="?/logout" class="mt-4">
            <CsrfField token={data.csrf} />
            <button type="submit" class="btn btn-ghost btn-sm btn-block justify-start">
              <LogOutIcon class="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </nav>
    </div>
  </div>
</div>

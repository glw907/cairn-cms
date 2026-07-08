<!--
@component
The admin shell: a DaisyUI drawer-and-navbar that wraps every `/admin/**` route through the shared
`/admin/+layout.svelte`. It takes the shell payload and a `children` snippet. A public (login/auth)
payload renders the children bare with no chrome; an authed payload renders the data-driven nav
(concepts, custom entries, the owner-only manage-editors entry), the topbar, the command palette, and
the streamed publish-all count. The root sets `data-theme` to the resolved light or dark theme on a
bare wrapper (never a styled element), so the admin looks identical on every host. It hands descendant
forms a CSRF-token getter through context, so a bare `<CsrfField />` works tokenless. The two global
actions (logout, publish-all) post to the absolute `/admin?/...` catch-all, so they resolve from any
route. Failure mode: a public payload that carried chrome fields would still render bare (the
discriminant, not the fields, gates the chrome).
-->
<script lang="ts">
  import { onMount, setContext, untrack, type Component, type Snippet } from 'svelte';
  import type { AdminShellData } from '../sveltekit/content-routes.js';
  import CsrfField from './CsrfField.svelte';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import { provideTopbar, type TopbarHolder } from './topbar-context.js';
  import { MenuIcon, LogOutIcon, SunIcon, MoonIcon, ChevronRightIcon, SearchIcon } from './admin-icons.js';
  import CairnLogo from './CairnLogo.svelte';
  import { cairnFaviconHref } from './cairn-favicon.js';
  import { warnIfChromeWrapped } from './chrome-guard.js';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import SignpostIcon from '@lucide/svelte/icons/signpost';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import UsersIcon from '@lucide/svelte/icons/users';
  import ImageIcon from '@lucide/svelte/icons/image';
  import TagIcon from '@lucide/svelte/icons/tag';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import HelpCircleIcon from '@lucide/svelte/icons/circle-help';
  import { ADMIN_NAV_ICONS, ADMIN_NAV_FALLBACK_ICON } from './admin-nav-icons.js';
  import { isResolvedNavSection, isResolvedNavEntry, flattenNavEntries, type ResolvedNavEntry } from '../sveltekit/admin-nav.js';
  import './cairn-admin.css';

  interface Props {
    /** The shell payload: bare for a public path, the full authed chrome data otherwise. */
    data: AdminShellData;
    /** The page body. */
    children: Snippet;
  }

  let { data, children }: Props = $props();

  // The authed member, narrowed once. Every chrome read below goes through `shell`, which is null on
  // a public payload (the template renders only the children then, so the chrome never reads it). The
  // authed-branch template guards on `data.public`, so `shell` is non-null wherever the chrome reads.
  const shell = $derived(data.public ? null : data);

  // Hand descendant forms a live getter for the CSRF token the shell load issued, so the field stays
  // correct even if the token ever rotates mid-session. A public payload has no token, so the getter
  // yields the empty string (no descendant form renders on the bare login/confirm pages anyway).
  setContext(CSRF_CONTEXT_KEY, () => (data.public ? '' : data.csrf));

  // Persist an admin preference for a year, path-scoped to /admin so the cookie never reaches the
  // host's own pages.
  function writeAdminCookie(name: string, value: string) {
    document.cookie = `${name}=${value}; path=/admin; max-age=31536000; samesite=lax`;
  }

  // A nav entry: a labeled, icon-bearing link.
  interface NavItem {
    label: string;
    icon: Component;
    href: string;
  }

  // Resolve one custom-nav entry's bundled icon name through the allowlist map, falling back to a
  // list glyph for any unmapped name.
  function navItemOf(e: ResolvedNavEntry): NavItem {
    return { label: e.label, icon: ADMIN_NAV_ICONS[e.iconName] ?? ADMIN_NAV_FALLBACK_ICON, href: e.href };
  }

  // The developer's custom nav, split by shape: a flat entry folds into Core (below, unchanged
  // placement), a section renders as its own named group. Empty on a public payload.
  const customFlatEntries = $derived(shell ? shell.customNav.filter(isResolvedNavEntry) : []);
  const customSections = $derived(
    shell
      ? shell.customNav.filter(isResolvedNavSection).map((s) => ({ label: s.label, items: s.children.map(navItemOf) }))
      : [],
  );

  // The core Cairn functions, all in one group: the content concepts, the nav-menu editor (when the
  // site configures one; a signpost, kept distinct from the Settings gear), the site Settings, and
  // the owner-only Editors. Empty on a public payload (the nav never renders there).
  const coreItems: NavItem[] = $derived(
    shell
      ? [
          ...shell.concepts.map((c) => ({ label: c.label, icon: FileTextIcon, href: `/admin/${c.id}` })),
          // The developer's custom flat screens, right after the concepts. A custom section (grouped
          // separately below) never folds in here.
          ...customFlatEntries.map(navItemOf),
          // Library is a content peer, immediately after the concepts (the media screen; the route
          // stays /admin/media, but the settled editor-facing label is Library, not Media).
          { label: 'Library', icon: ImageIcon, href: '/admin/media' },
          // Tags is the shared tag-vocabulary screen, after Library.
          { label: 'Tags', icon: TagIcon, href: '/admin/vocabulary' },
          ...(shell.navLabel ? [{ label: shell.navLabel, icon: SignpostIcon, href: '/admin/nav' }] : []),
          { label: 'Settings', icon: SettingsIcon, href: '/admin/settings' },
          ...(shell.canManageEditors ? [{ label: 'Editors', icon: UsersIcon, href: '/admin/editors' }] : []),
        ]
      : [],
  );

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

  const initials = $derived(initialsOf(shell?.user.displayName ?? ''));

  function isActive(href: string): boolean {
    const pathname = shell?.pathname ?? '';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Which nav groups are collapsed. Seeded once from the SSR'd cookie (so a collapsed group renders
  // collapsed with no flash), then owned by the toggle below, which mirrors each change to the cookie.
  let collapsed = $state(new Set(untrack(() => (data.public ? [] : data.collapsedNav))));

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
    shell?.pathname;
    drawerOpen = false;
    paletteDialog?.close();
    publishAllDialog?.close();
  });

  // Seed from the SSR'd theme once. The live theme is owned by this state and the toggle, so the
  // initial read of data.theme is intentional and untracked to keep it out of any reactive graph.
  let theme = $state<'cairn-admin' | 'cairn-admin-dark'>(
    untrack(() => (data.public ? 'cairn-admin' : data.theme)),
  );

  // First mount with no persisted choice follows the OS preference. A returning user's cookie was
  // already honored by the shell load (data.theme), so this only fires on a first-ever visit.
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

  // The site-wide publish action. The trigger and its confirm render only while entries are pending;
  // the count streams as a deferred promise, so the topbar resolves it through an `{#await}` block
  // rather than a synchronous derived (a null resolution hides the action rather than lying).
  let publishAllDialog = $state<HTMLDialogElement>();

  // Group the pending ids under their concept's nav label, in first-seen order. A ref whose concept
  // is not in the nav (an unconfigured key) falls back to the raw key. Called from the await block
  // with the resolved list, so the chrome never reads the promise synchronously.
  function groupPending(pending: { concept: string; id: string }[]): { label: string; ids: string[] }[] {
    const groups = new Map<string, string[]>();
    for (const entry of pending) {
      const label = shell?.concepts.find((c) => c.id === entry.concept)?.label ?? entry.concept;
      groups.set(label, [...(groups.get(label) ?? []), entry.id]);
    }
    return [...groups.entries()].map(([label, ids]) => ({ label, ids }));
  }

  // The bare data-theme wrapper is the admin root the dev chrome-guard measures from.
  let rootEl = $state<HTMLElement>();
  onMount(() => {
    if (rootEl) warnIfChromeWrapped(rootEl);
  });

  const paletteCommands = $derived<Command[]>([
    ...coreItems.map((item) => ({ label: item.label, icon: item.icon, href: item.href })),
    { label: 'Help', icon: HelpCircleIcon, href: '/admin/help' },
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
    const segs = (shell?.pathname ?? '').split('/').filter(Boolean); // ['admin', concept, id?]
    if (segs.length < 2 || segs[0] !== 'admin') return [];
    const conceptId = segs[1];
    const concept = shell?.concepts.find((c) => c.id === conceptId);
    // A custom screen carries no concept, so resolve its href to the developer's nav label too; the
    // raw segment is the fallback when neither a concept nor a custom entry claims it.
    const custom = shell && flattenNavEntries(shell.customNav).find((e) => e.href === `/admin/${conceptId}`);
    const out: Crumb[] = [
      { label: concept?.label ?? custom?.label ?? conceptId, href: `/admin/${conceptId}` },
    ];
    if (segs[2]) out.push({ label: decodeURIComponent(segs[2]) });
    return out;
  });

  // The browser-tab title: the deepest breadcrumb (the active concept or entry), then the brand.
  const pageTitle = $derived(crumbs.length ? crumbs[crumbs.length - 1].label : 'Admin');

  // A desk route is an open document (/admin/<concept>/<id>): the third path segment is the entry.
  // The band has one job there, so the topbar drops the palette trigger and the site-wide Publish
  // button and renders the document's own desk controls instead. The second segment must name a
  // real content concept, not merely sit three-deep: a developer's own custom nav can route just as
  // deep (a section entry like /admin/club/events) without opening a document, and treating path
  // depth alone as the signal wrongly receded the persistent desktop sidebar on that navigation (it
  // fell back to the mobile-drawer's toggle-controlled visibility, which read as the sidebar
  // sliding away, since only a genuine desk route needs that recede).
  const isDeskRoute = $derived.by(() => {
    const segs = (shell?.pathname ?? '').split('/').filter(Boolean);
    return segs.length > 2 && segs[0] === 'admin' && (shell?.concepts.some((c) => c.id === segs[1]) ?? false);
  });

  // The topbar context portal: a reactive holder a descendant document fills with its desk snippet.
  // EditPage registers on mount and nulls it on teardown; the office routes leave it null.
  let topbar = $state<TopbarHolder>({ desk: null, zen: false });
  provideTopbar(topbar);
</script>

<svelte:head>
  <title>{pageTitle} · {data.siteName}</title>
  <link rel="icon" href={cairnFaviconHref} />
</svelte:head>

<svelte:window onkeydown={onKeydown} />

{#if data.public}
  {@render children()}
{:else}
<!-- data-theme sits on a bare wrapper, not on the drawer itself: every admin rule is scoped as a
     descendant of the theme root (`:where([data-theme]) .drawer`), so a class on the theme element
     itself never matches. Keeping the drawer and its base/utility classes one level in lets the
     scoped sheet style them. -->
<div data-theme={theme} bind:this={rootEl}>
  <!-- The persistent desktop sidebar (lg:drawer-open) recedes inside an open document: a desk route
       renders the drawer shell without it, so the nav starts closed at desktop width and the
       manuscript takes the shell. This resolves at SSR from data.pathname (isDeskRoute), never in an
       effect, so the chrome-free state does not flash. The checkbox still governs the overlay, so the
       toggle (and Cmd/Ctrl+B) reopens the nav over the document on demand.
       At desktop width the sidebar is `position: fixed` (cairn-admin.css overrides daisyUI's own
       `position: sticky` for `.lg:drawer-open`'s persistent sidebar; see the load-bearing rules
       there), not sticky: a host that omits Preflight (the embed-anywhere default this admin
       targets) leaves the UA's default body margin in place, and sticky computes its "before it
       sticks" travel from the sidebar's static offset in the document, so an unreset body margin
       gave the sidebar a few visible pixels of travel at the top and bottom of a page scroll. Fixed
       positioning is anchored to the viewport outright, the same mechanism the mobile overlay
       already uses, so it carries no such drift and needs no document-level change. -->
  <div class="drawer min-h-screen bg-base-200 text-base-content" class:lg:drawer-open={!isDeskRoute}>
    <input id="cairn-shell-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />

    <div class="drawer-content flex flex-col" class:lg:ml-56={!isDeskRoute}>
      <!-- Zen (rung 4) drops the whole topbar element, not just its contents: a desk document
           registers zen through the topbar holder and the band slides away entirely. The desk's
           three clusters include shell-owned chrome (the drawer toggle, the breadcrumb), so
           emptying the band would leave that chrome behind; the band must be GONE. The manuscript
           and EditPage's own floating zen chip carry on below. -->
      {#if !topbar.zen}
      <!-- The topbar is a flat, opaque continuation of the sidebar's brand band: same surface and the
           same hairline, no shadow, so the two form one clean header strip across the sidebar seam.
           The height is pinned to the brand band's h-16 (a content-driven navbar drifts with font
           metrics, and the two border-bottoms stop meeting at the seam). -->
      <div class="navbar bg-base-100 border-b border-[var(--cairn-card-border)] sticky top-0 z-30 h-16 min-h-16 gap-2 px-4 py-0 lg:px-8">
        <!-- The drawer toggle is hidden at desktop width on the office routes (the persistent sidebar
             stands in for it); on a desk route the sidebar is closed, so the toggle stays visible and
             reopens the nav as an overlay. -->
        <div class="flex-none" class:lg:hidden={!isDeskRoute}>
          <label for="cairn-shell-drawer" aria-label="Open menu" class="btn btn-square btn-ghost">
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
        {#if isDeskRoute}
          <!-- An open document takes the band: the registered desk snippet (the status and action
               clusters) fills the row to the right of the breadcrumb. The palette trigger and the
               site-wide Publish button stand down so the band has one job here. -->
          {@render topbar.desk?.()}
        {:else}
          <!-- The command-palette trigger fills the center: a quick jump-to over the admin, opened
               here or with Cmd/Ctrl+K. -->
          <div class="flex min-w-0 flex-1 justify-center">
            <button
              type="button"
              onclick={openPalette}
              class="flex w-full max-w-md items-center gap-2 rounded-field border border-[var(--cairn-card-border)] bg-base-200/70 px-3 py-1.5 text-sm text-muted transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <SearchIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
              <span class="truncate">Search or jump to&hellip;</span>
              <kbd class="ml-auto hidden rounded border border-[var(--cairn-card-border)] px-1.5 text-[0.6875rem] font-medium sm:inline">&#8984;K</kbd>
            </button>
          </div>
          {#await data.pendingEntries then pending}
            {#if pending && pending.length > 0}
              <div class="flex-none">
                <button type="button" class="btn btn-primary btn-sm" aria-haspopup="dialog" onclick={() => publishAllDialog?.showModal()}>
                  Publish site ({pending.length})
                </button>
              </div>
            {/if}
          {/await}
        {/if}
        <div class="flex-none">
          <button type="button" class="btn btn-square btn-ghost" aria-label="Toggle theme" onclick={toggleTheme}>
            {#if theme === 'cairn-admin'}<MoonIcon class="h-5 w-5" />{:else}<SunIcon class="h-5 w-5" />{/if}
          </button>
        </div>
      </div>
      {/if}

      <main class="flex-1 p-4 lg:px-10 lg:py-8">
        {@render children()}
      </main>

      <dialog bind:this={paletteDialog} class="modal" aria-label="Search or jump to">
        <div class="modal-box max-w-xl self-start p-0 sm:mt-[12vh]">
          <div class="flex items-center gap-2 border-b border-[var(--cairn-card-border)] px-4">
            <SearchIcon class="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              bind:value={paletteQuery}
              type="text"
              aria-label="Search or jump to"
              placeholder="Search or jump to…"
              class="w-full bg-transparent py-3.5 text-sm outline-hidden placeholder:text-muted"
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
                      <cmd.icon class="h-4 w-4 text-muted" aria-hidden="true" />
                      {cmd.label}
                      {#if cmd.external}<ExternalLinkIcon class="ml-auto h-3.5 w-3.5 opacity-50" aria-hidden="true" />{/if}
                    </a>
                  {:else}
                    <button type="button" onclick={() => runCommand(cmd)}>
                      <cmd.icon class="h-4 w-4 text-muted" aria-hidden="true" />
                      {cmd.label}
                    </button>
                  {/if}
                </li>
              {/each}
            </ul>
          {:else}
            <p class="px-4 py-6 text-center text-sm text-muted">No matches for "{paletteQuery}".</p>
          {/if}
        </div>
        <form method="dialog" class="modal-backdrop"><button tabindex="-1" aria-label="Close">close</button></form>
      </dialog>

      {#await data.pendingEntries then pending}
        {#if pending && pending.length > 0}
          {@const groups = groupPending(pending)}
          <dialog bind:this={publishAllDialog} class="modal" aria-labelledby="cairn-shell-publish-all-title">
            <div class="modal-box">
              <div class="mb-3 flex items-center justify-between">
                <h2 id="cairn-shell-publish-all-title" class="text-base font-semibold">Publish the whole site?</h2>
                <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={() => publishAllDialog?.close()}>✕</button>
              </div>
              <p class="text-sm">Every entry below goes live in one step.</p>
              {#each groups as group, i (group.label)}
                <p id={`cairn-publish-group-${i}`} class="mt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">{group.label}</p>
                <ul class="mt-1 text-sm" aria-labelledby={`cairn-publish-group-${i}`}>
                  {#each group.ids as id (id)}
                    <li>{id}</li>
                  {/each}
                </ul>
              {/each}
              <!-- The publishAll named action posts to the absolute /admin catch-all, so the shell's
                   confirm works from every /admin/** route, not just the office views. -->
              <form method="POST" action="/admin?/publishAll" class="mt-4 flex justify-end gap-2">
                <CsrfField token={data.csrf} />
                <button type="button" class="btn btn-sm" onclick={() => publishAllDialog?.close()}>Cancel</button>
                <button type="submit" class="btn btn-sm btn-primary">Publish site</button>
              </form>
            </div>
            <form method="dialog" class="modal-backdrop"><button tabindex="-1" aria-label="Close">close</button></form>
          </dialog>
        {/if}
      {/await}
    </div>

    <div class="drawer-side">
      <label for="cairn-shell-drawer" aria-label="Close menu" class="drawer-overlay"></label>
      <nav class="bg-base-100 flex min-h-full w-56 flex-col border-r border-[var(--cairn-card-border)]" aria-label="Site content">
        <!-- Brand band, the same height as the topbar. The mark sits in a filled "app-icon" tile, which
             anchors the corner as a deliberate brand object rather than a washed box. The logo and
             wordmark link to the admin home. -->
        <div class="flex h-16 flex-none items-center border-b border-[var(--cairn-card-border)] px-3">
          <a href="/admin" aria-label="Cairn admin home" class="flex items-center gap-2.5 rounded-field px-2 py-1.5 transition-colors hover:bg-base-content/[0.05]">
            <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-content shadow-sm">
              <CairnLogo class="h-5 w-5" />
            </span>
            <span class="text-xl font-bold tracking-[-0.01em] font-[family-name:var(--font-display)]">Cairn</span>
            <span class="rounded-md border border-base-300 px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted">CMS</span>
          </a>
        </div>

        <div class="flex-1 space-y-1 overflow-y-auto py-4">
          {#snippet navSection(label: string, items: NavItem[])}
            <details class="px-2" open={!collapsed.has(label)} ontoggle={(e) => onToggleSection(label, e.currentTarget.open)}>
              <summary class="group/sec flex cursor-pointer select-none items-center gap-2 rounded-field bg-base-content/[0.04] py-2 pl-5 pr-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted transition-colors hover:bg-base-content/[0.08] hover:text-base-content">
                <span class="truncate">{label}</span>
                <ChevronRightIcon class="cairn-caret ml-auto h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover/sec:opacity-90" aria-hidden="true" />
              </summary>
              <ul class="menu menu-sm mt-1 w-full gap-0.5 p-0">
                {#each items as item (item.href)}
                  <li>
                    <a
                      href={item.href}
                      class={isActive(item.href)
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'font-medium text-subtle'}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                    >
                      <item.icon class="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </a>
                  </li>
                {/each}
              </ul>
            </details>
          {/snippet}

          <!-- Core is the built-in Cairn functions, a collapsible section of the content concepts,
               the nav and settings editors, and the owner-only Editors entry. -->
          {@render navSection('Core', coreItems)}
          <!-- A developer's custom adminNav sections render as their own collapsible groups, after
               Core, in declaration order (a section joins the nav beside Content/Media/Settings). -->
          {#each customSections as section (section.label)}
            {@render navSection(section.label, section.items)}
          {/each}
        </div>

        <!-- Help is a standing utility destination, pinned at the foot of the nav and set apart from
             the content concepts by a top hairline. It is always present, labeled in plain text, and
             styled as a peer of the nav items above it. -->
        <div class="flex-none border-t border-[var(--cairn-card-border)] px-2 py-2">
          <ul class="menu menu-sm w-full gap-0.5 p-0">
            <li>
              <a
                href="/admin/help"
                class={isActive('/admin/help')
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'font-medium text-subtle'}
                aria-current={isActive('/admin/help') ? 'page' : undefined}
              >
                <HelpCircleIcon class="h-4 w-4" aria-hidden="true" />
                Help
              </a>
            </li>
          </ul>
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
              <div class="truncate text-xs text-muted">{data.user.email}</div>
              <div class="text-xs capitalize text-subtle">{data.user.role}</div>
            </div>
          </div>
          <!-- Logout posts to the absolute /admin catch-all, so the shell signs out from every
               /admin/** route, not just the office views. -->
          <form method="POST" action="/admin?/logout" class="mt-4">
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
{/if}

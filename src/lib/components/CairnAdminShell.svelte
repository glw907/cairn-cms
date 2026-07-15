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
  import { onMount, setContext, tick, untrack, type Component, type Snippet } from 'svelte';
  import type { AdminShellData } from '../sveltekit/content-routes.js';
  import CsrfField from './CsrfField.svelte';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import { provideTopbar, type TopbarHolder } from './topbar-context.js';
  import { MenuIcon, LogOutIcon, SunIcon, MoonIcon, ChevronRightIcon, SearchIcon } from './admin-icons.js';
  import CairnLogo from './CairnLogo.svelte';
  import { cairnFaviconHref } from './cairn-favicon.js';
  import { warnIfChromeWrapped } from './chrome-guard.js';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import {
    ADMIN_NAV_ICONS,
    ADMIN_NAV_FALLBACK_ICON,
    ENGINE_NAV_ICONS,
    ENGINE_NAV_FALLBACK_ICON,
  } from './admin-nav-icons.js';
  import type {
    ResolvedNavEntry,
    ResolvedEngineNavEntry,
    ResolvedLayoutChild,
    ResolvedLayoutSection,
    ResolvedLayoutNode,
  } from '../sveltekit/admin-nav.js';
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

  // shell.nav mixes the engine's own screens (carry `screen`) with the site's own entries (carry
  // `iconName`); these two guards discriminate the resolved-layout shape the way
  // isResolvedNavSection/isResolvedNavEntry discriminated the retired customNav shape.
  function isEngineChild(node: ResolvedLayoutChild): node is ResolvedEngineNavEntry {
    return 'screen' in node;
  }
  function isLayoutSection(node: ResolvedLayoutNode): node is ResolvedLayoutSection {
    return 'children' in node;
  }
  function layoutChildItem(node: ResolvedLayoutChild): NavItem {
    return isEngineChild(node)
      ? { label: node.label, icon: ENGINE_NAV_ICONS[node.screen] ?? ENGINE_NAV_FALLBACK_ICON, href: node.href }
      : navItemOf(node);
  }

  // One rendered group of the sidebar's scroll area: a named, collapsible section, or a batch of
  // top-level loose nodes (site entries or engine references placed outside any section) rendered
  // as a plain, header-less list between the sections around them.
  type NavGroup = { kind: 'section'; label: string; items: NavItem[] } | { kind: 'loose'; items: NavItem[] };

  // shell.nav.items is the whole arranged, filtered scroll-area tree the resolver produced, in
  // declaration order: a declared navLayout as written, or, absent one, today's default arrangement
  // through the same resolver, which synthesizes no section at all: the concepts, the legacy flat
  // adminNav entries, and the engine screens arrive as loose top-level nodes rendered in a plain,
  // header-less list, and each legacy adminNav section still renders as its own collapsible group
  // after them. Consecutive loose top-level nodes batch into one group so they render together,
  // without opening a collapsible section of their own.
  const navGroups: NavGroup[] = $derived.by(() => {
    if (!shell) return [];
    const groups: NavGroup[] = [];
    let loose: NavItem[] = [];
    for (const node of shell.nav.items) {
      if (isLayoutSection(node)) {
        if (loose.length > 0) {
          groups.push({ kind: 'loose', items: loose });
          loose = [];
        }
        groups.push({ kind: 'section', label: node.label, items: node.children.map(layoutChildItem) });
      } else {
        loose.push(layoutChildItem(node));
      }
    }
    if (loose.length > 0) groups.push({ kind: 'loose', items: loose });
    return groups;
  });

  // The fallback foot band: the engine screens the arrangement never referenced (locked call 5),
  // rendered in the same slot and styling as today's standalone Help foot. Empty (no engine screen
  // omitted, or every one gated out by capability) renders nothing.
  const fallbackItems: NavItem[] = $derived(shell ? shell.nav.fallback.map(layoutChildItem) : []);

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

  // The drawer's own nav region: the focus-in effect below (keyed on isDrawerOverlay) finds its
  // first focusable child here, and the close-side restore effect checks whether focus is still
  // inside it.
  let drawerNavEl = $state<HTMLElement>();

  // Where focus was before the overlay opened, so the close-side restore effect below (or an
  // overlay backdrop close while focus never left the drawer) can put it back. Captured by the
  // focus-in effect keyed on isDrawerOverlay, so every open method carries the same contract:
  // Ctrl+B, the hamburger label, and the checkbox itself.
  let drawerRestoreFocusEl: HTMLElement | null = null;

  // Whether the viewport currently sits at each route kind's persistent-sidebar breakpoint (lg for
  // an office route, xl for a desk route, per the context model), tracked live so the APG treatment
  // below can tell an overlay drawer from a persistent one after a resize, not just at mount.
  let matchesLg = $state(false);
  let matchesXl = $state(false);

  $effect(() => {
    if (!window.matchMedia) return;
    const lgQuery = window.matchMedia('(min-width: 1024px)');
    const xlQuery = window.matchMedia('(min-width: 1280px)');
    matchesLg = lgQuery.matches;
    matchesXl = xlQuery.matches;
    const onLgChange = () => (matchesLg = lgQuery.matches);
    const onXlChange = () => (matchesXl = xlQuery.matches);
    lgQuery.addEventListener('change', onLgChange);
    xlQuery.addEventListener('change', onXlChange);
    return () => {
      lgQuery.removeEventListener('change', onLgChange);
      xlQuery.removeEventListener('change', onXlChange);
    };
  });

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

  // Restores focus once the drawer closes, for whatever method opened it (the focus-in effect
  // below captures drawerRestoreFocusEl for every overlay open, not just the shortcut): only when
  // focus never left the drawer's own nav in the meantime.
  $effect(() => {
    if (drawerOpen || !drawerRestoreFocusEl || !drawerNavEl?.contains(document.activeElement)) return;
    drawerRestoreFocusEl.focus();
    drawerRestoreFocusEl = null;
  });

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

  // Every visible item in the resolved layout, sections' children included (locked call 10), plus
  // the fallback foot group (so an unreferenced Help still surfaces here, the way it did as a
  // hard-coded palette entry before this task): a section's own label never becomes a command, only
  // its leaves do.
  const paletteNavItems: NavItem[] = $derived([
    ...navGroups.flatMap((group) => group.items),
    ...fallbackItems,
  ]);

  const paletteCommands = $derived<Command[]>([
    ...paletteNavItems.map((item) => ({ label: item.label, icon: item.icon, href: item.href })),
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

  // Flatten the resolved nav's site entries (section children included, engine doors skipped): a
  // custom route's crumb label below comes from its own declared entry, never an engine screen.
  function flattenSiteEntries(nodes: ResolvedLayoutNode[]): ResolvedNavEntry[] {
    return nodes.flatMap((node) => {
      if (isLayoutSection(node)) return node.children.filter((c): c is ResolvedNavEntry => !isEngineChild(c));
      return isEngineChild(node) ? [] : [node];
    });
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
    const custom = shell && flattenSiteEntries(shell.nav.items).find((e) => e.href === `/admin/${conceptId}`);
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

  // Mirror the live theme and its toggle into the holder so a desk document's own overflow menu
  // can fold the standalone theme toggle in below the width cutoff where this shell hides it (the
  // desk band collision fix, admin-papercuts pass): the direction reverses from desk/zen above,
  // the shell writes and EditPage reads through the same portal. toggleTheme is stable for the
  // component's life, so it is assigned once here; only the live theme value is reactive, so the
  // effect below tracks it alone rather than rewriting the stable function on every theme flip.
  topbar.toggleTheme = toggleTheme;
  $effect(() => {
    topbar.theme = theme;
  });

  // Whether the drawer currently renders as the persistent sidebar rather than an overlay: the same
  // route-kind breakpoint its own lg:/xl:drawer-open classes key off above, with zen forcing it
  // closed at every width (it recedes the sidebar regardless of route kind).
  const isPersistentSidebar = $derived(!topbar.zen && (isDeskRoute ? matchesXl : matchesLg));

  // The APG modal-dialog treatment, the focus trap, the inert background, role="dialog" plus
  // aria-modal, and Escape closing independently, applies only while the drawer is open AND acting
  // as an overlay: at the persistent breakpoint the sidebar sits beside the document rather than
  // over it, so none of the modal contract belongs there (the lg+/xl persistent modes are untouched).
  const isDrawerOverlay = $derived(drawerOpen && !isPersistentSidebar);

  // Moves focus into the drawer nav, and captures where focus was so the restore effect above can
  // put it back, for every way the overlay can open: Ctrl+B, the hamburger label, or the checkbox
  // itself. Keyed on isDrawerOverlay rather than drawerOpen, so a persistent (lg/xl) open, which is
  // not a modal, never receives this focus management, and re-runs only on the true/false edge
  // (isDrawerOverlay is a boolean $derived, so an unrelated dependency change with the same value
  // does not re-fire it).
  $effect(() => {
    if (!isDrawerOverlay) return;
    drawerRestoreFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    tick().then(() => {
      drawerNavEl?.querySelector<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]')?.focus();
    });
  });

  // Cycles Tab/Shift+Tab within the drawer's own nav while it is an open overlay, so a keyboard user
  // can never tab out into the inert document behind it. Redirects into the trap even when focus
  // currently sits outside drawerNavEl (a defensive fallback for the moment before the focus-in
  // effect above lands), the same fallback MediaInsertPopover's trap uses.
  function trapDrawerTab(e: KeyboardEvent) {
    if (!drawerNavEl) return;
    const focusables = drawerNavEl.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !drawerNavEl.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !drawerNavEl.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }

  // A capture-phase listener so the drawer's own Escape and Tab handling always runs ahead of any
  // other window keydown listener, most importantly EditPage's zen/details Escape handler, which
  // listens in the bubble phase. Stopping propagation here (capture) keeps the drawer's Escape and
  // every other Escape-driven affordance (zen, the details panel, a dialog) independent in both
  // directions: a dialog's own Escape is the browser's native close-the-topmost-dialog default
  // action, which fires regardless of script-level propagation, so it is unaffected either way.
  function onDrawerOverlayKeydownCapture(e: KeyboardEvent) {
    if (!isDrawerOverlay) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      drawerOpen = false;
      return;
    }
    if (e.key === 'Tab') trapDrawerTab(e);
  }
</script>

<svelte:head>
  <title>{pageTitle} · {data.siteName}</title>
  <link rel="icon" href={cairnFaviconHref} />
</svelte:head>

<svelte:window onkeydown={onKeydown} onkeydowncapture={onDrawerOverlayKeydownCapture} />

{#if data.public}
  {@render children()}
{:else}
<!-- data-theme sits on a bare wrapper, not on the drawer itself: every admin rule is scoped as a
     descendant of the theme root (`:where([data-theme]) .drawer`), so a class on the theme element
     itself never matches. Keeping the drawer and its base/utility classes one level in lets the
     scoped sheet style them. -->
<div data-theme={theme} bind:this={rootEl}>
  <!-- The persistent desktop sidebar persists at a route-kind-specific breakpoint: office routes at
       lg (1024px), desk routes at xl (1280px, the desk rider, spec §5). A desk route recedes the
       sidebar behind the toggle through the lg-xl tablet band instead of dropping it outright, since
       the wider desk layout needs the room the office layout does not. This resolves at SSR from
       data.pathname (isDeskRoute), never in an effect, so the recede never flashes. The checkbox
       still governs the overlay at every width below each route's persist breakpoint, so the toggle
       (and Cmd/Ctrl+B) reopens the nav over the document on demand.
       Zen recedes the sidebar too, at every width regardless of route kind (plan-locked call 1,
       docs/superpowers/plans/2026-07-15-admin-reorganization.md): it is an explicit, reversible
       editor choice, so the persistent breakpoint never overrides it. The checkbox-driven overlay
       still governs the whole sidebar under zen, so the toggle (and Cmd/Ctrl+B) never traps an
       editor away from the nav.
       At its persist breakpoint the sidebar is `position: fixed` (cairn-admin.css overrides daisyUI's
       own `position: sticky` for `.lg:drawer-open` and its `.xl:drawer-open` companion; see the
       load-bearing rules there), not sticky: a host that omits Preflight (the embed-anywhere default
       this admin targets) leaves the UA's default body margin in place, and sticky computes its
       "before it sticks" travel from the sidebar's static offset in the document, so an unreset body
       margin gave the sidebar a few visible pixels of travel at the top and bottom of a page scroll.
       Fixed positioning is anchored to the viewport outright, the same mechanism the mobile overlay
       already uses, so it carries no such drift and needs no document-level change. -->
  <div
    class="drawer min-h-screen bg-base-200 text-base-content"
    class:lg:drawer-open={!isDeskRoute && !topbar.zen}
    class:xl:drawer-open={isDeskRoute && !topbar.zen}
  >
    <!-- tabindex="-1" and aria-hidden pull this checkbox out of the tab order and the a11y tree: it
         is DaisyUI's drawer-state mechanism (the for=/id= label toggle and the lg:/xl:drawer-open
         responsive open all key off it), not an affordance an editor should ever land keyboard
         focus on with no accessible name. The hamburger label and Ctrl/Cmd+B are the real triggers. -->
    <input
      id="cairn-shell-drawer"
      type="checkbox"
      class="drawer-toggle"
      tabindex="-1"
      aria-hidden="true"
      bind:checked={drawerOpen}
    />

    <!-- Inert while the drawer is open as an overlay, so the document behind it is unreachable to
         pointer, keyboard, and assistive tech (the APG modal-dialog contract, Task 8). Never inert
         at the persistent breakpoint, where the sidebar sits beside the document, not over it. -->
    <div
      class="drawer-content flex flex-col"
      class:lg:ml-56={!isDeskRoute && !topbar.zen}
      class:xl:ml-56={isDeskRoute && !topbar.zen}
      inert={isDrawerOverlay}
    >
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
      <div
        class="navbar bg-base-100 border-b border-[var(--cairn-card-border)] sticky top-0 z-30 h-16 min-h-16 gap-2 px-4 py-0 lg:px-8"
        class:max-sm:px-2={isDeskRoute}
      >
        <!-- The drawer toggle hides once the persistent sidebar stands in for it: at lg on the office
             routes, at xl on a desk route (which keeps the toggle visible through the lg-xl tablet
             band, where the desk sidebar is receded). -->
        <div class="flex-none" class:lg:hidden={!isDeskRoute} class:xl:hidden={isDeskRoute}>
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
            <span class="font-semibold">{data.siteName}</span>
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
              <!-- The keyboard shortcut hint is meaningless on a touch device (no ⌘K to press), so
                   it gates on pointer:fine, not only the sm width breakpoint: a touch tablet at or
                   above sm would otherwise still show it. -->
              <kbd class="ml-auto hidden rounded border border-[var(--cairn-card-border)] px-1.5 text-[0.6875rem] font-medium sm:pointer-fine:inline">&#8984;K</kbd>
            </button>
          </div>
          {#await data.pendingEntries then pending}
            {#if pending && pending.length > 0}
              <div class="flex-none">
                <button type="button" class="btn btn-sm border-transparent bg-primary/10 text-primary shadow-none hover:bg-primary/15" aria-haspopup="dialog" onclick={() => publishAllDialog?.showModal()}>
                  Publish site ({pending.length})
                </button>
              </div>
            {/if}
          {/await}
        {/if}
        <!-- Below the sm cutoff a desk route folds this into EditPage's own overflow menu instead
             of shrinking it in place (the desk band collision fix, audit finding 2): the office
             routes keep it visible at every width, since only the desk band runs out of room. -->
        <div class="flex-none" class:max-sm:hidden={isDeskRoute}>
          <button type="button" class="btn btn-square btn-ghost" aria-label="Toggle theme" onclick={toggleTheme}>
            {#if theme === 'cairn-admin'}<MoonIcon class="h-5 w-5" />{:else}<SunIcon class="h-5 w-5" />{/if}
          </button>
        </div>
      </div>
      {/if}

      <main class="flex-1 p-4 lg:px-10 lg:py-8">
        {#if isDeskRoute}
          {@render children()}
        {:else}
          <!-- Office screens (posts, media, editors, settings, help) share one content-width cap,
               so a wide viewport does not stretch the list rows into a dead band (audit finding 8).
               The desk manages its own manuscript width (EditPage's own max-w-[49rem]/[56rem]), so
               the cap applies only off the desk route. -->
          <div class="mx-auto w-full max-w-5xl">
            {@render children()}
          </div>
        {/if}
      </main>

      <dialog bind:this={paletteDialog} class="modal" aria-label="Search or jump to">
        <div class="modal-box max-w-xl self-start mt-4 p-0 sm:mt-[12vh]">
          <div class="flex items-center gap-2 border-b border-[var(--cairn-card-border)] px-4">
            <SearchIcon class="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              bind:value={paletteQuery}
              type="text"
              aria-label="Search or jump to"
              placeholder="Search or jump to…"
              class="w-full bg-transparent py-3.5 text-sm placeholder:text-muted"
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
              {#each paletteResults as cmd, i (i)}
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
      <!-- role="dialog"/aria-modal only while the drawer is genuinely an overlay (Task 8's APG
           treatment): at the persistent breakpoint this is a plain nav landmark beside the document,
           never a modal, so the two attributes stay conditional rather than standing. -->
      <nav
        bind:this={drawerNavEl}
        class="bg-base-100 flex min-h-full w-56 flex-col border-r border-[var(--cairn-card-border)]"
        aria-label="Site content"
        role={isDrawerOverlay ? 'dialog' : undefined}
        aria-modal={isDrawerOverlay ? 'true' : undefined}
      >
        <!-- Brand band, the same height as the topbar. The mark sits in a filled "app-icon" tile, which
             anchors the corner as a deliberate brand object rather than a washed box. The logo and
             wordmark link to the admin home. -->
        <div class="flex h-16 flex-none items-center border-b border-[var(--cairn-card-border)] px-3">
          <a href="/admin" aria-label="Cairn admin home" class="flex items-center gap-2.5 rounded-field px-2 py-1.5 transition-colors hover:bg-base-content/[0.05]">
            <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-content shadow-sm">
              <CairnLogo class="h-5 w-5" />
            </span>
            <span class="text-[1.375rem] font-semibold font-[family-name:var(--font-display)]">Cairn</span>
            <span class="rounded-md border border-base-300 px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted">CMS</span>
          </a>
        </div>

        {#snippet navItemList(items: NavItem[], extraClass: string = '')}
          <ul class={`menu menu-sm w-full gap-0.5 p-0 ${extraClass}`}>
            {#each items as item, i (i)}
              <li>
                <a
                  href={item.href}
                  class={isActive(item.href)
                    ? 'text-[0.9375rem] bg-primary/10 font-semibold text-primary'
                    : 'text-[0.9375rem] font-medium text-subtle'}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <item.icon class="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </a>
              </li>
            {/each}
          </ul>
        {/snippet}

        {#snippet navSection(label: string, items: NavItem[])}
          <details class="px-2" open={!collapsed.has(label)} ontoggle={(e) => onToggleSection(label, e.currentTarget.open)}>
            <summary class="group/sec flex cursor-pointer select-none items-center gap-2 rounded-field bg-base-content/[0.04] py-2 pl-5 pr-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted transition-colors hover:bg-base-content/[0.08] hover:text-base-content">
              <span class="truncate">{label}</span>
              <ChevronRightIcon class="cairn-caret ml-auto h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover/sec:opacity-90" aria-hidden="true" />
            </summary>
            {@render navItemList(items, 'mt-1')}
          </details>
        {/snippet}

        <div class="flex-1 space-y-1 overflow-y-auto py-4">
          <!-- shell.nav.items is the whole arranged, filtered scroll area in declaration order: a
               section renders as its own collapsible group (a site's own declared navLayout
               section, or a legacy adminNav section); the zero-config default synthesizes no
               section at all, so its concepts, legacy flat entries, and engine screens arrive as
               loose top-level nodes. A loose node batches with its neighbors into a plain,
               header-less list rather than opening a group of its own. -->
          <!-- Index-keyed on purpose: a label-keyed each would crash on a duplicate (the legacy
               adminNav path can synthesize two same-labeled groups, e.g. two legacy adminNav
               sections both named "Club"; validateNavLayout cannot retroactively reject that
               path). This list is fully derived and stateless, and the collapsed-group open state
               derives from the label-keyed `collapsed` Set, not DOM identity, so index keys never
               desync a group's open/closed state from its content. -->
          {#each navGroups as group, i (i)}
            {#if group.kind === 'section'}
              {@render navSection(group.label, group.items)}
            {:else}
              <div class="px-2">
                {@render navItemList(group.items)}
              </div>
            {/if}
          {/each}
        </div>

        <!-- The fallback foot: the engine screens the arrangement never referenced (an undeclared
             navLayout deliberately leaves Help unreferenced, reproducing today's standing Help
             foot), pinned below a hairline and styled as a peer of the nav items above it. Every
             engine screen here is already capability-gated by the resolver, so a none-capability
             session (which strips every engine screen) renders no foot band at all. -->
        {#if fallbackItems.length > 0}
        <div class="flex-none border-t border-[var(--cairn-card-border)] px-2 py-2" data-testid="cairn-nav-fallback">
          {@render navItemList(fallbackItems)}
        </div>
        {/if}

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

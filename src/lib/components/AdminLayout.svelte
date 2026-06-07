<!--
@component
The admin shell: a DaisyUI drawer-and-navbar that wraps every authed admin page. The nav is
data-driven from the enabled concepts and role-gated (owners see the manage-editors entry). The
root sets `data-theme` to the resolved light or dark theme (seeded from the SSR'd cookie choice,
flipped by the topbar toggle) and imports the self-contained Warm Stone theme, so the admin looks
identical on every host regardless of the site's own theme.
-->
<script lang="ts">
  import { untrack, type Component, type Snippet } from 'svelte';
  import type { LayoutData } from '../sveltekit/content-routes.js';
  import { MenuIcon, LogOutIcon, SunIcon, MoonIcon } from './admin-icons.js';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import UsersIcon from '@lucide/svelte/icons/users';
  import './cairn-admin.css';

  interface Props {
    /** The layout load's data: site name, user, nav concepts, active path, owner capability. */
    data: LayoutData;
    /** The page body. */
    children: Snippet;
  }

  let { data, children }: Props = $props();

  interface NavItem {
    href: string;
    label: string;
    icon: Component;
    owner?: boolean;
  }

  const navItems: NavItem[] = $derived([
    ...data.concepts.map((c) => ({ href: `/admin/${c.id}`, label: c.label, icon: FileTextIcon })),
    ...(data.navLabel ? [{ href: '/admin/nav', label: data.navLabel, icon: SettingsIcon }] : []),
    { href: '/admin/editors', label: 'Editors', icon: UsersIcon, owner: true },
  ]);

  const visibleNav = $derived(navItems.filter((item) => !item.owner || data.canManageEditors));

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

  let drawerOpen = $state(false);

  function onKeydown(e: KeyboardEvent) {
    if (e.key.toLowerCase() === 'b' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      drawerOpen = !drawerOpen;
    }
  }

  // Close the mobile drawer whenever the active path changes (a nav click navigated).
  $effect(() => {
    data.pathname;
    drawerOpen = false;
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
    // 1 year, path-scoped to the admin so the cookie never reaches the host's pages.
    document.cookie = `cairn-admin-theme=${theme}; path=/admin; max-age=31536000; samesite=lax`;
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
</script>

<svelte:window onkeydown={onKeydown} />

<!-- data-theme sits on a bare wrapper, not on the drawer itself: every admin rule is scoped as a
     descendant of the theme root (`:where([data-theme]) .drawer`), so a class on the theme element
     itself never matches. Keeping the drawer and its base/utility classes one level in lets the
     scoped sheet style them. -->
<div data-theme={theme}>
  <div class="drawer lg:drawer-open min-h-screen bg-base-200 text-base-content">
    <input id="cairn-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />

    <div class="drawer-content flex flex-col">
      <div class="navbar bg-base-100/95 border-b border-base-300 sticky top-0 z-30 shadow-sm backdrop-blur">
        <div class="flex-none lg:hidden">
          <label for="cairn-drawer" aria-label="Open menu" class="btn btn-square btn-ghost">
            <MenuIcon class="h-5 w-5" />
          </label>
        </div>
        <div class="flex-1 px-2">
          {#if crumbs.length > 1}
            <!-- Show the trail only inside an entry (concept then id). A bare concept list shows the
                 site name instead, since the lone concept crumb would just echo the sidebar and the
                 page heading. -->
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
        <div class="flex-none">
          <button type="button" class="btn btn-square btn-ghost" aria-label="Toggle theme" onclick={toggleTheme}>
            {#if theme === 'cairn-admin'}<MoonIcon class="h-5 w-5" />{:else}<SunIcon class="h-5 w-5" />{/if}
          </button>
        </div>
      </div>

      <main class="flex-1 p-4 lg:p-8">
        {@render children()}
      </main>
    </div>

    <div class="drawer-side">
      <label for="cairn-drawer" aria-label="Close menu" class="drawer-overlay"></label>
      <nav class="bg-base-100 flex min-h-full w-64 flex-col border-r border-base-300 p-4" aria-label="Site content">
        <div class="menu-title mb-2 px-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">Content</div>
        <ul class="menu menu-md w-full gap-0.5">
          {#each visibleNav as item (item.href)}
            <li>
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
            </li>
          {/each}
        </ul>
        <div class="mt-auto border-t border-base-300 pt-3">
          <div class="flex items-center gap-3 px-2">
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
          <form method="POST" action="/admin/auth/logout" class="mt-3 px-2">
            <button type="submit" class="btn btn-ghost btn-sm btn-block justify-start">
              <LogOutIcon class="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </nav>
    </div>
  </div>
</div>

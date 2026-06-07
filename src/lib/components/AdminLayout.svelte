<!--
@component
The admin shell: a DaisyUI drawer-and-navbar that wraps every authed admin page. The nav is
data-driven from the enabled concepts and role-gated (owners see the manage-editors entry). The
root sets `data-theme="cairn-admin"` and imports the self-contained Warm Stone theme, so the
admin looks identical on every host regardless of the site's own theme.
-->
<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import type { LayoutData } from '../sveltekit/content-routes.js';
  import { MenuIcon, LogOutIcon } from './admin-icons.js';
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

  const initials = $derived(
    data.user.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?',
  );

  function isActive(href: string): boolean {
    return data.pathname === href || data.pathname.startsWith(`${href}/`);
  }
</script>

<div data-theme="cairn-admin" class="drawer lg:drawer-open min-h-screen bg-base-200 text-base-content">
  <input id="cairn-drawer" type="checkbox" class="drawer-toggle" />

  <div class="drawer-content flex flex-col">
    <div class="navbar bg-base-100 border-b border-base-300">
      <div class="flex-none lg:hidden">
        <label for="cairn-drawer" aria-label="Open menu" class="btn btn-square btn-ghost">
          <MenuIcon class="h-5 w-5" />
        </label>
      </div>
      <div class="flex-1 px-2 font-semibold">{data.siteName}</div>
    </div>

    <main class="flex-1 p-4 lg:p-8">
      {@render children()}
    </main>
  </div>

  <div class="drawer-side">
    <label for="cairn-drawer" aria-label="Close menu" class="drawer-overlay"></label>
    <nav class="bg-base-100 flex min-h-full w-64 flex-col border-r border-base-300 p-4" aria-label="Site content">
      <div class="menu-title mb-2 px-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">Content</div>
      <ul class="menu menu-lg w-full">
        {#each visibleNav as item (item.href)}
          <li>
            <a href={item.href} class:menu-active={isActive(item.href)} aria-current={isActive(item.href) ? 'page' : undefined}>
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

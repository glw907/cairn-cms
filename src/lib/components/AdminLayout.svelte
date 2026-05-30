<!--
@component
The admin shell: a DaisyUI drawer-and-navbar that wraps every authed admin page. The nav is
data-driven from the enabled concepts and role-gated (owners see the manage-editors entry). The
root sets `data-theme="cairn-admin"` and imports the self-contained Warm Stone theme, so the
admin looks identical on every host regardless of the site's own theme.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LayoutData } from '../sveltekit/content-routes.js';
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
    owner?: boolean;
  }

  const navItems: NavItem[] = $derived([
    ...data.concepts.map((c) => ({ href: `/admin/${c.id}`, label: c.label })),
    ...(data.navLabel ? [{ href: '/admin/nav', label: data.navLabel }] : []),
    { href: '/admin/editors', label: 'Editors', owner: true },
  ]);

  const visibleNav = $derived(navItems.filter((item) => !item.owner || data.canManageEditors));

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
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
      </div>
      <div class="flex-1 px-2 font-semibold">{data.siteName}</div>
      <div class="flex-none px-2 text-sm text-[var(--color-muted)]">{data.user.displayName}</div>
    </div>

    <main class="flex-1 p-4 lg:p-8">
      {@render children()}
    </main>
  </div>

  <div class="drawer-side">
    <label for="cairn-drawer" aria-label="Close menu" class="drawer-overlay"></label>
    <nav class="bg-base-100 min-h-full w-64 border-r border-base-300 p-4" aria-label="Site content">
      <div class="menu-title mb-2 px-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">Content</div>
      <ul class="menu menu-lg w-full">
        {#each visibleNav as item (item.href)}
          <li>
            <a href={item.href} class:menu-active={isActive(item.href)} aria-current={isActive(item.href) ? 'page' : undefined}>
              {item.label}
            </a>
          </li>
        {/each}
      </ul>
      <form method="POST" action="/admin/auth/logout" class="mt-6 px-2">
        <button type="submit" class="btn btn-ghost btn-sm btn-block">Sign out</button>
      </form>
    </nav>
  </div>
</div>

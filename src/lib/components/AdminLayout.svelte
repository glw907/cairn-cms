<script lang="ts">
  // Neutral admin chrome, shared across sites so the tool looks identical everywhere (only the
  // adapter's siteName varies). When signed in it's a responsive DaisyUI drawer+navbar shell
  // (`drawer lg:drawer-open`, sidebar pinned on desktop, slide-over + hamburger on mobile),
  // patterned on scosman/CMSaasStarter's `(admin)/(menu)` layout. The nav is data-driven and
  // role-gated, so a new surface is one entry in `nav` (plus its route + component). Signed out
  // (the login page lives under this layout) it falls back to a minimal centered shell.
  // Each site's `admin/+layout.svelte` is a one-line shim that forwards `data` + `children`.
  import type { Snippet } from 'svelte';
  import type { CairnUser } from '../auth';

  let {
    data,
    children,
  }: {
    data: { siteName: string; user: CairnUser | null; pathname: string };
    children: Snippet;
  } = $props();

  interface NavItem {
    href: string;
    label: string;
    icon: Snippet;
    active: boolean;
    /** Owner-only surface; hidden from regular editors. */
    owner?: boolean;
  }

  const nav = $derived<NavItem[]>([
    {
      href: '/admin',
      label: 'Content',
      icon: contentIcon,
      active: data.pathname === '/admin' || data.pathname.startsWith('/admin/edit'),
    },
    {
      href: '/admin/admins',
      label: 'Editors',
      icon: editorsIcon,
      owner: true,
      active: data.pathname.startsWith('/admin/admins'),
    },
  ]);
  const visibleNav = $derived(nav.filter((item) => !item.owner || data.user?.role === 'owner'));

  // Close the slide-over after a nav tap on mobile (no-op on desktop where it's pinned open).
  function closeDrawer(): void {
    const toggle = document.getElementById('admin-drawer');
    if (toggle instanceof HTMLInputElement) toggle.checked = false;
  }
</script>

{#snippet contentIcon()}
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
{/snippet}

{#snippet editorsIcon()}
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3.5-2.1" />
  </svg>
{/snippet}

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if data.user}
  <div class="drawer min-h-screen bg-base-200 lg:drawer-open" data-pagefind-ignore>
    <input id="admin-drawer" type="checkbox" class="drawer-toggle" />

    <div class="drawer-content">
      <!-- Mobile top bar; the desktop sidebar replaces this at lg. -->
      <div class="navbar bg-base-100 lg:hidden">
        <div class="flex-1">
          <span class="px-2 text-xl font-bold">{data.siteName} CMS</span>
        </div>
        <div class="flex-none">
          <label for="admin-drawer" class="btn btn-square btn-ghost" aria-label="Open menu">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </label>
        </div>
      </div>

      <main class="container px-4 py-6 lg:px-8">
        {@render children()}
      </main>
    </div>

    <div class="drawer-side z-10">
      <label for="admin-drawer" class="drawer-overlay" aria-label="Close menu"></label>
      <div class="flex min-h-full w-80 flex-col bg-base-100 lg:border-r lg:border-base-300">
        <ul class="menu menu-lg grow p-4">
          <li class="menu-title flex flex-row items-center text-xl font-bold text-base-content">
            <span class="grow">{data.siteName} CMS</span>
            <label for="admin-drawer" class="ml-3 cursor-pointer lg:hidden" aria-label="Close menu">✕</label>
          </li>
          {#each visibleNav as item (item.href)}
            <li>
              <a href={item.href} class={item.active ? 'active' : ''} onclick={closeDrawer}>
                {@render item.icon()}
                {item.label}
              </a>
            </li>
          {/each}
        </ul>

        <div class="border-t border-base-300 p-4">
          <p class="text-sm font-medium">{data.user.name}</p>
          <p class="text-xs opacity-60">{data.user.email}</p>
          <form method="POST" action="/admin/auth/logout" class="mt-3">
            <button type="submit" class="btn btn-ghost btn-sm btn-block justify-start">Sign out</button>
          </form>
        </div>
      </div>
    </div>
  </div>
{:else}
  <!-- Signed out (login page): no nav, just a centered surface. -->
  <div class="min-h-screen bg-base-200" data-pagefind-ignore>
    <div class="mx-auto max-w-3xl px-4 py-8">
      {@render children()}
    </div>
  </div>
{/if}

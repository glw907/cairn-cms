<script lang="ts">
  // Neutral admin chrome shared across sites. Signed in: DaisyUI drawer+navbar shell (sidebar
  // pinned on desktop, slide-over on mobile). Signed out: minimal centered shell. The
  // `cairn-admin` class on both roots scopes the "Warm Stone" theme; see the style block.
  import type { Snippet } from 'svelte';
  import type { CairnUser } from '../auth';

  let {
    data,
    children,
  }: {
    data: {
      siteName: string;
      user: CairnUser | null;
      pathname: string;
      collections: { type: string; label: string }[];
      navMenus: { name: string; label: string }[];
      canManageNav: boolean;
    };
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
    ...data.collections.map((collection) => ({
      href: `/admin/${collection.type}`,
      label: collection.label,
      icon: contentIcon,
      active:
        data.pathname === `/admin/${collection.type}` ||
        data.pathname.startsWith(`/admin/edit/${collection.type}/`),
    })),
    ...(data.canManageNav && data.navMenus.length
      ? [{ href: '/admin/nav', label: 'Navigation', icon: navIcon, active: data.pathname.startsWith('/admin/nav') }]
      : []),
    {
      href: '/admin/admins',
      label: 'Editors',
      icon: editorsIcon,
      owner: true,
      active: data.pathname.startsWith('/admin/admins'),
    },
  ]);
  const visibleNav = $derived(nav.filter((item) => !item.owner || data.user?.role === 'owner'));

  // Close the slide-over after a nav tap on mobile.
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

{#snippet navIcon()}
  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M4 6h16M4 12h16M4 18h16" />
  </svg>
{/snippet}

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if data.user}
  <div class="cairn-admin drawer min-h-screen bg-base-200 lg:drawer-open" data-pagefind-ignore>
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
  <div class="cairn-admin min-h-screen bg-base-200" data-pagefind-ignore>
    <div class="mx-auto max-w-3xl px-4 py-8">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  /* Warm Stone: a neutral, fully self-contained admin theme (R6), light-only. Overriding the
     DaisyUI v5 tokens + font on this root re-skins the whole admin subtree by inheritance, so
     the tool looks identical on every host regardless of the site's own theme. Values are OKLCH
     (no hex/rgb, per the design-system rule). Warm-gray neutrals (hue ~75), violet accent. */
  .cairn-admin {
    color-scheme: light;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

    --color-base-100: oklch(98.5% 0.004 75);
    --color-base-200: oklch(96% 0.005 75);
    --color-base-300: oklch(92% 0.008 75);
    --color-base-content: oklch(28% 0.012 75);

    --color-primary: oklch(52% 0.20 293);
    --color-primary-content: oklch(98% 0.012 293);
    --color-secondary: oklch(45% 0.02 75);
    --color-secondary-content: oklch(98% 0.004 75);
    --color-accent: oklch(58% 0.16 300);
    --color-accent-content: oklch(98% 0.012 300);
    --color-neutral: oklch(32% 0.012 75);
    --color-neutral-content: oklch(96% 0.004 75);

    --color-info: oklch(60% 0.12 240);
    --color-info-content: oklch(98% 0.01 240);
    --color-success: oklch(58% 0.12 150);
    --color-success-content: oklch(98% 0.01 150);
    --color-warning: oklch(75% 0.15 70);
    --color-warning-content: oklch(25% 0.02 70);
    --color-error: oklch(58% 0.20 25);
    --color-error-content: oklch(98% 0.01 25);

    --radius-selector: 0.5rem;
    --radius-field: 0.5rem;
    --radius-box: 0.75rem;
    --size-selector: 0.25rem;
    --size-field: 0.25rem;
    --border: 1px;
  }
</style>

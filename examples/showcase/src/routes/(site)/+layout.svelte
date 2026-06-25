<!-- @component The public chrome for the showcase: an owned, token-driven header, main, and footer in a
     (site) route group. The group is URL-transparent, so these pages keep their paths, and the chrome
     never wraps /admin, which lives outside the group. The chrome is built from `SiteHeader` and
     `SiteFooter`, copy-in components a site owner edits, styled on the public theme (`theme.css`,
     DaisyUI/Tailwind on the cairn token layer); the admin self-styles independently with its own scoped
     sheet. Both stylesheets link by their ?url-resolved URL rather than a static import, so the editor's
     preview frame can link the very same assets (the header comment in site.css explains why a static
     import would break that). -->
<script lang="ts">
  import themeCss from '$lib/theme.css?url';
  import siteCss from '$lib/site.css?url';
  import SiteHeader from '$lib/components/SiteHeader.svelte';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  let { children } = $props();
</script>

<svelte:head>
  <link rel="stylesheet" href={themeCss} />
  <link rel="stylesheet" href={siteCss} />
</svelte:head>

<div
  class="min-h-screen bg-base-100 font-[family-name:var(--font-body)] text-base-content"
>
  <a
    href="#main"
    class="skip-link absolute left-[var(--cairn-space-s)] top-[-3rem] z-50 rounded-[var(--radius-field)] bg-primary px-[0.9rem] py-[0.5rem] font-semibold text-primary-content no-underline focus:top-[var(--cairn-space-s)]"
  >
    Skip to content
  </a>

  <SiteHeader />

  <main id="main" class="site-main">
    {@render children()}
  </main>

  <SiteFooter />
</div>

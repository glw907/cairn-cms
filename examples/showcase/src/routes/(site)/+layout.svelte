<!-- @component The public chrome for the showcase: an owned, token-driven header, main, and footer in a
     (site) route group. The group is URL-transparent, so these pages keep their paths, and the chrome
     never wraps /admin, which lives outside the group. The chrome is built from `SiteHeader` and
     `SiteFooter`, copy-in components a site owner edits, styled on the public theme (`theme.css`,
     DaisyUI/Tailwind on the cairn token layer); the admin self-styles independently with its own scoped
     sheet. Both stylesheets link by their ?url-resolved URL rather than a static import, so the editor's
     preview frame can link the very same assets (the header comment in site.css explains why a static
     import would break that). -->
<script lang="ts">
  import themeCss from '$theme/theme.css?url';
  import siteCss from '$theme/site.css?url';
  import SiteHeader from '$theme/components/SiteHeader.svelte';
  import SiteFooter from '$theme/components/SiteFooter.svelte';
  let { children } = $props();
</script>

<svelte:head>
  <link rel="stylesheet" href={themeCss} />
  <link rel="stylesheet" href={siteCss} />
</svelte:head>

<div
  class="min-h-screen bg-base-100 font-body text-base-content"
>
  <a
    href="#main"
    class="skip-link absolute left-s top-[-3rem] z-50 rounded-field bg-primary px-[0.9rem] py-[0.5rem] font-semibold text-primary-content no-underline focus:top-s"
  >
    Skip to content
  </a>

  <SiteHeader />

  <!-- `tabindex="-1"` makes the skip-link target programmatically focusable, so activating "Skip to
       content" moves keyboard focus here, not only the scroll position (WCAG 2.4.1; Firefox and Safari
       move focus to a non-interactive target only when it is focusable). The focus is programmatic, so
       the ring is suppressed below; real controls keep their `:focus-visible` rings. -->
  <main id="main" tabindex="-1" class="site-main">
    {@render children()}
  </main>

  <SiteFooter />
</div>

<style>
  /* The skip-link target is focused programmatically, never tabbed to, so it shows no focus ring. This
     does not touch `:focus-visible` on real controls (links, buttons), which keep their rings. */
  main:focus {
    outline: none;
  }
</style>

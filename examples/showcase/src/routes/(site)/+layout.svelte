<!-- @component The public chrome for the showcase: an owned, token-driven header, main, and footer in a
     (site) route group. The group is URL-transparent, so these pages keep their paths, and the chrome
     never wraps /admin, which lives outside the group. The chrome is built from `SiteHeader` and
     `SiteFooter`, copy-in components a site owner edits, styled on the public theme (`theme.css`,
     DaisyUI/Tailwind on the cairn token layer); the admin self-styles independently with its own scoped
     sheet. Both stylesheets link by their ?url-resolved URL rather than a static import, so the editor's
     preview frame can link the very same assets (the header comment in site.css explains why a static
     import would break that).

     The `.site-shell` wrapper is a flex column at least the viewport tall, and `<main>` grows to fill
     it (`flex-1`), so a short page (About, a 404, a stub) still pushes the footer to the viewport
     bottom instead of leaving its own background exposed as a seam below it; a long page simply grows
     past the viewport and the footer follows the content as usual.

     `onNavigate` below wires SvelteKit's documented View Transitions recipe: a plain root cross-fade
     (~180ms, theme.css's `::view-transition-old/new(root)` rule) on every internal navigation,
     no-op where the browser has no `document.startViewTransition` and skipped outright under
     `prefers-reduced-motion` (the CSS rule's own media query is the second, independent guard). This
     lives only in the (site) group's layout, so the admin never cross-fades. -->
<script lang="ts">
  import { onNavigate } from '$app/navigation';
  import themeCss from '$theme/theme.css?url';
  import siteCss from '$theme/site.css?url';
  import SiteHeader from '$theme/components/SiteHeader.svelte';
  import SiteFooter from '$theme/components/SiteFooter.svelte';
  let { children } = $props();

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<svelte:head>
  <link rel="stylesheet" href={themeCss} />
  <link rel="stylesheet" href={siteCss} />
</svelte:head>

<div class="site-shell flex min-h-screen flex-col bg-base-100 font-body text-base-content">
  <a
    href="#main"
    class="skip-link absolute left-s -top-xl z-50 rounded-field bg-primary px-xs py-2xs font-semibold text-primary-content no-underline focus:top-s"
  >
    Skip to content
  </a>

  <SiteHeader />

  <!-- `tabindex="-1"` makes the skip-link target programmatically focusable, so activating "Skip to
       content" moves keyboard focus here, not only the scroll position (WCAG 2.4.1; Firefox and Safari
       move focus to a non-interactive target only when it is focusable). The focus is programmatic, so
       the ring is suppressed below; real controls keep their `:focus-visible` rings. -->
  <main id="main" tabindex="-1" class="site-main flex-1">
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

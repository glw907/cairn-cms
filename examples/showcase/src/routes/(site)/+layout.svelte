<!-- examples/showcase/src/routes/(site)/+layout.svelte -->
<!-- @component The public chrome for the showcase: a plain-CSS nav and footer in a (site) route group.
     The group is URL-transparent, so these pages keep their paths, and the chrome never wraps /admin,
     which lives outside the group. This proves the admin self-styles: it renders fully styled on a site
     whose own pages use neither Tailwind nor DaisyUI. The stylesheet links by its ?url-resolved URL
     rather than a static import, so the editor's preview frame can link the very same asset (the
     header comment in site.css explains why the static import would break that). -->
<script lang="ts">
  import themeCss from '$lib/theme.css?url';
  import siteCss from '$lib/site.css?url';
  let { children } = $props();
</script>

<svelte:head>
  <link rel="stylesheet" href={themeCss} />
  <link rel="stylesheet" href={siteCss} />
</svelte:head>

<header class="site-header">
  <nav aria-label="Site">
    <a href="/">cairn showcase</a>
    <a href="/calendar">Calendar</a>
    <a href="/admin">Admin</a>
  </nav>
</header>
<main class="site-main">
  {@render children()}
</main>
<footer class="site-footer">A cairn-cms showcase site.</footer>

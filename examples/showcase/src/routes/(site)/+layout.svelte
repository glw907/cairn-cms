<!-- examples/showcase/src/routes/(site)/+layout.svelte -->
<!-- @component The public chrome for the showcase: a plain-CSS nav and footer in a (site) route group.
     The group is URL-transparent, so these pages keep their paths, and the chrome never wraps /admin,
     which lives outside the group. This proves the admin self-styles: it renders fully styled on a site
     whose own pages use neither Tailwind nor DaisyUI. -->
<script lang="ts">
  import './site.css';
  let { children } = $props();
</script>

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

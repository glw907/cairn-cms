<script lang="ts">
  // Bare passthrough. The admin shell wraps only the authed (app) group, so login and auth
  // pages render without it.
  let { children } = $props();
</script>

{@render children()}

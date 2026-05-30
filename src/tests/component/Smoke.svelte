<!-- @component A trivial component proving the browser test project renders Svelte 5. -->
<script lang="ts">
  let { label }: { label: string } = $props();
  let count = $state(0);
</script>

<button onclick={() => count++}>{label}: {count}</button>

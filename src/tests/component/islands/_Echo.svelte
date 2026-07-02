<script lang="ts">
  let { label = '' }: { label?: string } = $props();
</script>

<span data-testid="echo">{label}</span>

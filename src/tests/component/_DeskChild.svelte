<!--
@component
Test stand-in for EditPage's topbar registration: a descendant of CairnAdminShell that fills the
topbar holder with a desk snippet, so the shell's desk-route band rendering can be exercised without
mounting the whole editor. The optional `zen` prop also registers the holder's zen flag, standing in
for EditPage's own zen toggle, so a zen-recede test can drive the shell without mounting EditPage.
-->
<script lang="ts">
  import { useTopbar } from '../../lib/components/topbar-context.js';

  let { zen = false }: { zen?: boolean } = $props();

  const topbar = useTopbar();
  $effect(() => {
    if (!topbar) return;
    topbar.desk = deskControl;
    topbar.zen = zen;
    return () => {
      topbar.desk = null;
      topbar.zen = false;
    };
  });
</script>

{#snippet deskControl()}
  <span data-testid="desk-control">desk controls</span>
{/snippet}

<p>page body</p>

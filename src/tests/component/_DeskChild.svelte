<!--
@component
Test stand-in for EditPage's topbar registration: a descendant of CairnAdminShell that fills the
topbar holder with a desk snippet, so the shell's desk-route band rendering can be exercised without
mounting the whole editor.
-->
<script lang="ts">
  import { useTopbar } from '../../lib/components/topbar-context.js';

  const topbar = useTopbar();
  $effect(() => {
    if (!topbar) return;
    topbar.desk = deskControl;
    return () => {
      topbar.desk = null;
    };
  });
</script>

{#snippet deskControl()}
  <span data-testid="desk-control">desk controls</span>
{/snippet}

<p>page body</p>

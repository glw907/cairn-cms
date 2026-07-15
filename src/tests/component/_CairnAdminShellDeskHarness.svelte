<!--
@component
Test harness: CairnAdminShell with a descendant (DeskChild) that registers a desk snippet through the
topbar context portal, the way EditPage does. It exercises the shell's desk-route band rendering
(the registered snippet shows after the breadcrumb; the palette trigger and the site Publish button
stand down) without mounting the whole editor. The harness forwards the shell's data prop and an
optional zen prop, which DeskChild registers on the topbar holder the same way EditPage's own zen
toggle would.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import CairnAdminShell from '../../lib/components/CairnAdminShell.svelte';
  import DeskChild from './_DeskChild.svelte';

  let { data, zen = false }: { data: ComponentProps<typeof CairnAdminShell>['data']; zen?: boolean } = $props();
</script>

<CairnAdminShell {data}>
  <DeskChild {zen} />
</CairnAdminShell>

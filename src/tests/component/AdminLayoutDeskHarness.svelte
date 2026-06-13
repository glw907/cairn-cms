<!--
@component
Test harness: AdminLayout with a descendant (DeskChild) that registers a desk snippet through the
topbar context portal, the way EditPage does. It exercises AdminLayout's desk-route band rendering
(the registered snippet shows after the breadcrumb; the palette trigger and the site Publish button
stand down) without mounting the whole editor. The harness forwards AdminLayout's data prop.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import AdminLayout from '../../lib/components/AdminLayout.svelte';
  import DeskChild from './DeskChild.svelte';

  let { data }: { data: ComponentProps<typeof AdminLayout>['data'] } = $props();
</script>

<AdminLayout {data}>
  <DeskChild />
</AdminLayout>

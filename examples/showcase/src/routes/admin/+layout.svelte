<!--
@component
Admin layout shim: wraps every authed admin page in the engine's AdminLayout shell.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AdminLayout } from '@glw907/cairn-cms/components';
  import type { LayoutData } from '@glw907/cairn-cms/sveltekit';

  interface Props {
    /** The layout load's data. */
    data: LayoutData;
    /** The page body passed by SvelteKit. */
    children: Snippet;
  }

  let { data, children }: Props = $props();
</script>

<AdminLayout {data}>
  {@render children()}
</AdminLayout>

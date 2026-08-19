<!--
@component
Test harness: CairnAdminShell wrapping a MediaPicker descendant, the way the real admin composes a
media surface inside the shell's chrome. It proves the shell itself provides the media-base context
(rather than a component test mounting MediaPicker bare, which proves only that MediaPicker HONORS an
injected value, never that the real shell INJECTS one).
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import CairnAdminShell from '../../lib/components/CairnAdminShell.svelte';
  import MediaPicker, { type MediaLibraryEntry } from '../../lib/components/MediaPicker.svelte';

  let {
    data,
    library,
  }: {
    data: ComponentProps<typeof CairnAdminShell>['data'];
    library: Record<string, MediaLibraryEntry>;
  } = $props();
</script>

<CairnAdminShell {data}>
  <MediaPicker {library} onselect={() => {}} />
</CairnAdminShell>

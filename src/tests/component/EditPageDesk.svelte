<!--
@component
Test harness: mounts EditPage the way CairnAdmin does, joined to a topbar through the same context
portal AdminLayout uses. EditPage registers its desk snippet into the shared holder; this harness
renders that snippet inside a stand-in band, so a single render tree carries both the document body
and the band controls (Save, Publish, the status badge, the overflow) the way the running admin
does. The band is a plain wrapper, not AdminLayout's full chrome, to keep the component tests fast
and focused on EditPage's own behavior.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import { provideTopbar, type TopbarHolder } from '../../lib/components/topbar-context.js';
  import EditPage from '../../lib/components/EditPage.svelte';

  let props: ComponentProps<typeof EditPage> = $props();

  let holder = $state<TopbarHolder>({ desk: null });
  provideTopbar(holder);
</script>

<div data-testid="cairn-band" class="navbar">
  {@render holder.desk?.()}
</div>
<main>
  <EditPage {...props} />
</main>

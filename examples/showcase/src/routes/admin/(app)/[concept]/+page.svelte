<!--
@component
Concept list shim: renders the engine's ConceptList for one content type.
-->
<script lang="ts">
  import { ConceptList } from '@glw907/cairn-cms/components';
  import type { ListData } from '@glw907/cairn-cms/sveltekit';

  interface Props {
    /** The list load's data. */
    data: ListData;
  }

  let { data }: Props = $props();
</script>

<ConceptList {data} />

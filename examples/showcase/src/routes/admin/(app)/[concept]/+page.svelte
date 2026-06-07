<!--
@component
Concept list shim: renders the engine's ConceptList for one content type.
-->
<script lang="ts">
  import { ConceptList } from '@glw907/cairn-cms/components';
  import type { ListData } from '@glw907/cairn-cms/sveltekit';
  import type { ActionData } from './$types';

  interface Props {
    /** The list load's data. */
    data: ListData;
    /** The `?/delete` action result, forwarded so a refused delete surfaces in the list. */
    form: ActionData;
  }

  let { data, form }: Props = $props();
</script>

<ConceptList {data} {form} />

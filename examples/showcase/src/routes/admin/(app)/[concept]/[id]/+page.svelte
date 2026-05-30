<!--
@component
Edit page shim: renders the engine's EditPage with the showcase adapter's renderPreview.
The [type] param is the concept id and [id] is the entry slug (aliased to params.concept
and params.id by the server shim so the engine resolves the right concept).
-->
<script lang="ts">
  import { EditPage } from '@glw907/cairn-cms/components';
  import type { EditData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '$lib/cairn.config.js';

  interface Props {
    /** The edit load's data, merged with siteName for the EditPage heading. */
    data: EditData;
  }

  let { data }: Props = $props();
</script>

<EditPage data={{ ...data, siteName: cairn.siteName }} renderPreview={cairn.renderPreview} />

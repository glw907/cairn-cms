<!--
@component
Test harness: two RepeatableField instances on one page, the showcase posts shape (an
array(object) FAQ list and an array(image) gallery). It proves the focus queries are scoped to
each instance's own fieldset, so a structural mutation in one list never moves focus into the
other. The harness forwards the same pass-through props each container caller threads down.
-->
<script lang="ts">
  import RepeatableField from '../../lib/components/RepeatableField.svelte';
  import type { NamedField } from '../../lib/content/types.js';
  import type { ArrayField } from '../../lib/content/fields.js';

  interface Props {
    /** The first list's descriptor (array(object) FAQ). */
    fieldA: NamedField & ArrayField;
    /** The first list's seed rows. */
    rowsA: unknown[];
    /** The second list's descriptor (array(image) gallery, or another array). */
    fieldB: NamedField & ArrayField;
    /** The second list's seed rows. */
    rowsB: unknown[];
  }

  let { fieldA, rowsA, fieldB, rowsB }: Props = $props();

  const shared = {
    targets: [],
    markFieldsDirty: () => {},
    mediaLibrary: {},
    conceptId: 'posts',
    id: '2026-05-hello',
    heroFieldRefs: {},
    onuploaded: () => {},
    onheroneedsalt: () => {},
  };
</script>

<div data-list="a">
  <RepeatableField field={fieldA} name={fieldA.name} rows={rowsA} {...shared} />
</div>
<div data-list="b">
  <RepeatableField field={fieldB} name={fieldB.name} rows={rowsB} {...shared} />
</div>

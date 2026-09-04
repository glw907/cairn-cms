<!--
@component
Test harness reproducing DetailsPanel's real hero-ref ownership shape: a locally-owned ref map
written only through the registerHeroField callback the image arm reports itself through,
never a prop FieldInput mutates by reference. Proves the field-input hero-ref test against the
same registration contract DetailsPanel itself uses, not a bare inline callback.
-->
<script lang="ts">
  import FieldInput from '../../lib/components/FieldInput.svelte';
  import type MediaHeroField from '../../lib/components/MediaHeroField.svelte';
  import type { NamedField } from '../../lib/content/types.js';

  const field: NamedField = { type: 'image', name: 'cover', label: 'Cover' };
  let refs: Record<string, MediaHeroField> = {};

  function registerHeroField(name: string, ref: MediaHeroField | null): void {
    if (ref) refs[name] = ref;
    else delete refs[name];
  }
</script>

<FieldInput
  {field}
  name="cover"
  frontmatter={{}}
  targets={[]}
  markFieldsDirty={() => {}}
  mediaLibrary={{}}
  conceptId="posts"
  id="2026-05-hello"
  {registerHeroField}
  onuploaded={() => {}}
  onheroneedsalt={() => {}}
/>

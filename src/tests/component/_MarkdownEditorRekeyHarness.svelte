<!--
@component
Test harness reproducing EditPage's own literal composition of the revocation seam:
`{#key k}<MarkdownEditor registerEditor={bindEditorGrant()} />{/key}`. EditPage's identity-guarded
revocation (`bindEditorGrant`, EditPage.svelte) relies on Svelte treating `bindEditorGrant()` as a
non-reactive expression, evaluated once per mount rather than re-invoked on every unrelated
re-render, so the SAME closure that registered a grant is the one that later revokes it. That is
undocumented compiler behavior, not a contract; this harness pins it against a real `{#key}`
remount, the shape EditPage actually uses, rather than asserting it indirectly.
-->
<script lang="ts">
  import MarkdownEditor, { type EditorApi } from '../../lib/components/MarkdownEditor.svelte';

  interface Props {
    /** The `{#key}` block's own key; changing it destroys and recreates the MarkdownEditor mount. */
    k: string;
    /** Called with the held grant on every register/revoke delivery, mirroring EditPage's `editor`. */
    onheld: (api: EditorApi | null) => void;
  }
  let { k, onheld }: Props = $props();

  // Verbatim copy of EditPage's own bindEditorGrant: one closure per mount, remembering only the
  // api it personally granted, revoking the shared holder only when that reference is still the
  // one held.
  let held: EditorApi | null = null;
  function bindEditorGrant(): (api: EditorApi | null) => void {
    let granted: EditorApi | null = null;
    return (api) => {
      if (api) {
        granted = api;
        held = api;
      } else if (granted && held === granted) {
        held = null;
      }
      onheld(held);
    };
  }
</script>

{#key k}
  <MarkdownEditor value="" name="body" registerEditor={bindEditorGrant()} />
{/key}

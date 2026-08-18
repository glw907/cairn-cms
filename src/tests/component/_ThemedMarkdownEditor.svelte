<!--
@component
Test harness: mounts `MarkdownEditor` under a bare `data-theme` wrapper whose value the test
drives, the way `CairnAdminShell` renders its own theme root around the editing surface. The
wrapper is the element `MarkdownEditor` resolves its dark flag from, so flipping the `theme` prop
here is exactly what a mounting context's theme change does in the running admin.
-->
<script lang="ts">
  import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';

  interface Props {
    /** The admin theme the wrapper carries, flipped by the test through a prop update. */
    theme: 'cairn-admin' | 'cairn-admin-dark';
  }

  let { theme }: Props = $props();

  let value = $state('A paragraph of prose.');
</script>

<div data-theme={theme}>
  <MarkdownEditor bind:value name="body" spellcheck={false} />
</div>

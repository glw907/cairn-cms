<!--
@component
The shared admin shell mount: every /admin/** route renders inside CairnAdminShell, fed the shell
payload from the sibling +layout.server.ts. The catch-all view page and any custom /admin route the
site adds render as the shell's children.
-->
<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/components';
  import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';
  import type { Snippet } from 'svelte';

  interface Props {
    /** The shell payload from the sibling +layout.server.ts load. */
    data: { shell: AdminShellData };
    /** The catch-all view page, or a custom /admin route the site adds. */
    children: Snippet;
  }

  let { data, children }: Props = $props();
</script>

<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>

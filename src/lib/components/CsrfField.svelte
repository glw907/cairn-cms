<!--
@component
A hidden CSRF double-submit field for an admin form. Pass `token` directly (the pre-auth pages do),
or omit it inside the authed shell, where AdminLayout provides the token through context. A form that
omits this field fails the guard's token check, which is the intended fail-closed signal.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';

  interface Props {
    /** The CSRF token. Falls back to the admin context when omitted. */
    token?: string;
  }
  let { token }: Props = $props();
  const fromContext = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);
  const value = $derived(token ?? fromContext?.() ?? '');
</script>

<input type="hidden" name="csrf" value={value} />

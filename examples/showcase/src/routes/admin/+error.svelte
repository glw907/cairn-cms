<!--
@component
The admin's error page: a failure in any /admin/** page renders inside the shell and its theme
wrapper, so a refusal or an unknown address reads as the admin's page, not the public site's.
A 403 and a 404 carry their calm copy; any other status falls back to the thrown message.

SvelteKit renders a route's `+error.svelte` inside the layouts above it, which is why the shell
frames this page. A failure in the admin layout's load has no layout above it to render
inside, so it falls to the root error page. SvelteKit requires that, and this file cannot change it.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { EmptyState } from '@glw907/cairn-cms/admin-toolkit';

  const copy = $derived(
    page.status === 403
      ? {
          heading: "You don't have access to this page.",
          message: "Your role doesn't include this page. Ask the site owner if you need access.",
        }
      : page.status === 404
        ? {
            heading: "This page doesn't exist.",
            message: 'Check the address, or go back to the dashboard.',
          }
        : {
            heading: 'Something went wrong.',
            message: page.error?.message ?? 'Try again, or go back to the dashboard.',
          },
  );
</script>

<EmptyState heading={copy.heading} headingLevel="h1" message={copy.message}>
  {#snippet action()}
    <a href="/admin" class="btn btn-neutral btn-sm">Back to the dashboard</a>
  {/snippet}
</EmptyState>

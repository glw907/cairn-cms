<!--
@component
The showcase's gated members page: renders the load's resolved subject and offers sign-out.
Reachable only once `memberChannel.resolveSubject` confirms a live session; an unauthenticated
visit is redirected to `/members/login` before this component ever renders (see the sibling
`+page.server.ts`, whose `prerender = false` also matters here: a prerendered copy of this page
would be served by the asset layer with the Worker, and therefore the guard, never running).
-->
<script lang="ts">
  import themeCss from '$theme/theme.css?url';
  import type { PageData } from './$types';

  interface Props {
    /** The load's payload; its `subject` is the opaque roster id `resolveSubject` returned. */
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <link rel="stylesheet" href={themeCss} />
  <title>Member account</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-base-200 p-4 text-base-content">
  <div class="card w-full max-w-sm bg-base-100 shadow">
    <div class="flex flex-col gap-4 p-6">
      <h1 class="text-lg font-semibold">Signed in</h1>
      <p class="text-sm">
        You are signed in as <span class="font-mono">{data.subject}</span>.
      </p>
      <form method="POST" action="?/logout">
        <button type="submit" class="btn btn-outline w-full">Sign out</button>
      </form>
    </div>
  </div>
</div>

<script lang="ts">
  // The scanner-safe confirm surface (C2). A GET renders this static page — nothing is consumed.
  // The token rides in a hidden field; only the explicit form POST (the route's default action →
  // confirmSignIn) verifies it. Mail scanners GET URLs but don't submit forms, so prefetch can't
  // burn the link. JS-free by design.
  interface Props {
    data: { token: string; siteName: string; error: string | null };
  }
  let { data }: Props = $props();
</script>

<svelte:head>
  <title>Confirm sign-in · {data.siteName} CMS</title>
</svelte:head>

<div class="mx-auto mt-16 max-w-md rounded-box border border-base-300 bg-base-100 p-8">
  <h1 class="text-2xl font-bold">Confirm sign-in</h1>
  <p class="mt-1 text-sm opacity-70">to {data.siteName} CMS</p>

  {#if data.error || !data.token}
    <div class="alert alert-error mt-6">
      <span>This sign-in link is invalid or expired. Request a new one.</span>
    </div>
    <a href="/admin/login" class="btn btn-primary mt-6">Back to sign-in</a>
  {:else}
    <form method="POST" class="mt-6 flex flex-col gap-3">
      <input type="hidden" name="token" value={data.token} />
      <button type="submit" class="btn btn-primary">Confirm sign-in</button>
    </form>
  {/if}
</div>

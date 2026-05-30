<!--
@component
The scanner-safe confirm page. A GET renders this static "Confirm sign-in" button with the token
in a hidden field and consumes nothing; only the explicit POST verifies (spec §7.1). JS-free.
-->
<script lang="ts">
  import './cairn-admin.css';

  interface Props {
    /** The confirm load's data: the token to submit, the site name, and an optional error. */
    data: { token: string; siteName: string; error: string | null };
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div data-theme="cairn-admin" class="bg-base-200 text-base-content flex min-h-screen items-center justify-center p-4">
  <div class="rounded-box border border-base-300 bg-base-100 w-full max-w-sm p-6 text-center shadow">
    <h1 class="mb-4 text-lg font-semibold">Sign in to {data.siteName}</h1>
    {#if data.error || !data.token}
      <div role="alert" class="alert alert-error text-sm">This sign-in link is invalid or expired.</div>
      <a href="/admin/login" class="btn btn-ghost btn-sm mt-4">Request a new link</a>
    {:else}
      <form method="POST">
        <input type="hidden" name="token" value={data.token} />
        <button type="submit" class="btn btn-primary btn-block">Confirm sign-in</button>
      </form>
    {/if}
  </div>
</div>

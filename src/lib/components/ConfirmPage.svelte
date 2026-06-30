<!--
@component
The scanner-safe confirm page. A GET renders this static "Confirm sign-in" button with the token
in a hidden field and consumes nothing; only the explicit POST verifies (spec §7.1). JS-free.
-->
<script lang="ts">
  import './cairn-admin.css';
  import CairnLogo from './CairnLogo.svelte';
  import CsrfField from './CsrfField.svelte';
  import { cairnFaviconHref } from './cairn-favicon.js';

  interface Props {
    /** The confirm load's data: the token to submit, the site name, an optional error, the CSRF token. */
    data: { token: string; siteName: string; error: string | null; csrf: string };
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>Confirm sign-in · Cairn</title>
  <link rel="icon" href={cairnFaviconHref} />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- data-theme on a bare wrapper: the scoped sheet styles descendants, so the layout classes go one
     level in (a class on the theme element itself would not match). -->
<div data-theme="cairn-admin">
  <div class="flex min-h-screen flex-col items-center justify-center gap-6 bg-base-200 p-4 text-base-content">
  <div class="w-full max-w-sm rounded-box border border-[var(--cairn-card-border)] bg-base-100 p-7 text-center shadow-[var(--cairn-shadow)]">
    <div class="mb-6 flex items-center justify-center gap-2">
      <CairnLogo class="h-8 w-8 text-primary" />
      <span class="text-xl font-bold tracking-[-0.01em] font-[family-name:var(--font-display)]">Cairn</span>
    </div>

    {#if data.error || !data.token}
      <h1 class="mb-2 text-lg font-semibold">This link didn't work</h1>
      <div role="alert" class="alert alert-error text-sm">This sign-in link is invalid or expired.</div>
      <a href="/admin/login" class="btn btn-ghost btn-sm mt-4">Request a new link</a>
    {:else}
      <h1 class="text-lg font-semibold">Almost there</h1>
      <p class="mt-1 mb-5 text-sm text-muted">Confirm to finish signing in to {data.siteName}.</p>
      <form method="POST" action="?/confirm">
        <input type="hidden" name="token" value={data.token} />
        <CsrfField token={data.csrf} />
        <button type="submit" class="btn btn-primary btn-block">Confirm sign-in</button>
      </form>
    {/if}
  </div>

  <p class="text-xs text-muted">Powered by Cairn</p>
  </div>
</div>

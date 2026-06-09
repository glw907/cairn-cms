<!--
@component
The magic-link sign-in page. A plain form POST to the page's default action (the engine's
`requestAction`); no client SDK. The success message is identical whether or not the email is on
the allowlist, so the page never leaks membership (spec §7.1).
-->
<script lang="ts">
  import './cairn-admin.css';
  import { onMount } from 'svelte';
  import MailCheckIcon from '@lucide/svelte/icons/mail-check';
  import CairnLogo from './CairnLogo.svelte';
  import CsrfField from './CsrfField.svelte';
  import { cairnFaviconHref } from './cairn-favicon.js';
  import { warnIfChromeWrapped } from './chrome-guard.js';

  interface Props {
    /** The login load's data: the site name, an optional error, and the CSRF token. */
    data: { siteName: string; error: string | null; csrf: string };
    /** The action result: `sent` is true once a request was accepted. */
    form: { sent?: boolean } | null;
  }

  let { data, form }: Props = $props();

  let rootEl = $state<HTMLElement>();
  // Lets a mistyped address go back to the form without a reload, even though the server still
  // reports `sent`. The success copy never reveals whether the email was on the allowlist.
  let dismissed = $state(false);
  onMount(() => {
    if (rootEl) warnIfChromeWrapped(rootEl);
  });
</script>

<svelte:head>
  <title>Sign in · Cairn</title>
  <link rel="icon" href={cairnFaviconHref} />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- data-theme on a bare wrapper: the scoped sheet styles descendants, so the layout classes go one
     level in (a class on the theme element itself would not match). -->
<div data-theme="cairn-admin" bind:this={rootEl}>
  <div class="flex min-h-screen flex-col items-center justify-center gap-6 bg-base-200 p-4 text-base-content">
  <div class="w-full max-w-sm rounded-box border border-[var(--cairn-card-border)] bg-base-100 p-7 shadow-[var(--cairn-shadow)]">
    <div class="mb-6 flex items-center gap-2">
      <CairnLogo class="h-8 w-8 text-primary" />
      <span class="text-xl font-bold tracking-[-0.01em] font-[family-name:var(--font-display)]">Cairn</span>
    </div>

    <h1 class="text-lg font-semibold">Sign in to {data.siteName}</h1>

    {#if form?.sent && !dismissed}
      <div role="status" class="mt-5 flex flex-col items-center text-center">
        <div
          class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-success)]"
          style="background-color: color-mix(in oklch, var(--color-success) 16%, transparent);"
        >
          <MailCheckIcon class="h-6 w-6" />
        </div>
        <h2 class="text-lg font-semibold">Check your email</h2>
        <p class="mt-1 text-sm text-[var(--color-muted)]">
          We sent a sign-in link to your inbox. Open it within 10 minutes to finish signing in.
        </p>
        <div class="mt-5 w-full border-t border-[var(--cairn-card-border)] pt-4 text-left">
          <p class="text-sm text-[var(--color-muted)]">
            No link after a minute or two? Check your spam folder first. If it still hasn't arrived,
            double-check the address. It has to match the one your site owner added.
          </p>
          <button
            type="button"
            class="btn btn-ghost btn-sm mt-3 -ml-2 text-primary"
            onclick={() => (dismissed = true)}
          >
            Use a different email
          </button>
        </div>
      </div>
    {:else}
      <p class="mt-1 mb-5 text-sm text-[var(--color-muted)]">Enter your email. We'll send a one-time sign-in link.</p>
      {#if data.error}
        <div role="alert" class="alert alert-error mb-3 text-sm">That link expired. Request a new one below.</div>
      {/if}
      <form method="POST" class="flex flex-col gap-3">
        <CsrfField token={data.csrf} />
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autocomplete="email"
            aria-label="Email"
            class="input w-full"
            placeholder="you@example.com"
          />
        </label>
        <button type="submit" class="btn btn-primary">Send sign-in link</button>
      </form>
    {/if}
  </div>

  <p class="text-xs text-[var(--color-muted)]">Powered by Cairn</p>
  </div>
</div>

<!--
@component
The magic-link sign-in page. A plain form POST to the named `?/request` action (the engine's
`requestAction`); no client SDK. The success message is identical whether or not the email is on
the allowlist, so the page never leaks membership (spec §7.1).
-->
<script lang="ts">
  import './cairn-admin.css';
  import { onMount } from 'svelte';
  import MailCheckIcon from '@lucide/svelte/icons/mail-check';
  import InfoIcon from '@lucide/svelte/icons/info';
  import CairnLogo from './CairnLogo.svelte';
  import CsrfField from './CsrfField.svelte';
  import { cairnFaviconHref } from './cairn-favicon.js';
  import { warnIfChromeWrapped } from './chrome-guard.js';

  interface Props {
    /** The login load's data: the site name, an optional error, the CSRF token, and the SSR-resolved
     * admin theme (the persisted cookie choice, or the light default; the cookie carries no auth,
     * so it applies before sign-in too). Optional so a test render need not supply it; the real
     * shell payload always does. */
    data: { siteName: string; error: string | null; csrf: string; theme?: 'cairn-admin' | 'cairn-admin-dark' };
    /** The action result. `sent` is true once a request was accepted; `status` discriminates the
     * neutral, send-error, and throttled outcomes. */
    form: { sent?: boolean; status?: 'sent' | 'send_error' | 'throttled' } | null;
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

<!-- The brand mark renders in both states; the parent container sets its alignment (left for the
     form, centered for the confirmation), so one snippet covers both. -->
{#snippet brand()}
  <div class="flex items-center gap-2">
    <CairnLogo class="h-8 w-8 text-primary" />
    <span class="text-[1.375rem] font-semibold font-[family-name:var(--font-display)]">Cairn</span>
  </div>
{/snippet}

<!-- data-theme on a bare wrapper: the scoped sheet styles descendants, so the layout classes go one
     level in (a class on the theme element itself would not match). -->
<div data-theme={data.theme ?? 'cairn-admin'} bind:this={rootEl}>
  <div class="flex min-h-screen flex-col items-center justify-center gap-6 bg-base-200 p-4 text-base-content">
  <div class="w-full max-w-sm rounded-box border border-[var(--cairn-card-border)] bg-base-100 p-7 shadow-[var(--cairn-shadow)]">
    {#if (form?.status === 'sent' || form?.sent) && !dismissed}
      <!-- The confirmation is a centered moment: brand, then the mail mark, heading, and one line of
           instruction. The fallback help sits in a gentle inset note below. -->
      <div role="status" class="flex flex-col items-center text-center">
        <div class="mb-7">{@render brand()}</div>
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl text-[var(--color-success)]"
          style="background-color: color-mix(in oklch, var(--color-success) 15%, transparent); box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--color-success) 22%, transparent);"
        >
          <MailCheckIcon class="h-6 w-6" />
        </div>
        <h1 class="mt-5 text-xl font-semibold tracking-tight">Check your email</h1>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          We sent a sign-in link to your inbox. Open it within 10 minutes to finish signing in.
        </p>
        <div class="mt-6 flex w-full items-start gap-2.5 rounded-[var(--radius-field)] bg-base-content/[0.04] p-3.5 text-left">
          <InfoIcon class="mt-px h-4 w-4 shrink-0 text-muted" />
          <p class="text-[0.8125rem] leading-relaxed text-subtle">
            No link after a minute or two? Check your spam folder first. If it still hasn't arrived, the
            address may not match the one your site owner added.
          </p>
        </div>
        <button
          type="button"
          class="mt-5 cursor-pointer appearance-none border-none bg-transparent p-0 text-sm font-medium text-primary hover:underline"
          onclick={() => (dismissed = true)}
        >
          Use a different email
        </button>
      </div>
    {:else}
      <div class="mb-6 flex justify-center">{@render brand()}</div>
      <h1 class="text-center text-lg font-semibold">Sign in to {data.siteName}</h1>
      <p class="mt-1 mb-5 text-center text-sm text-muted">Enter your email. We’ll send a one-time sign-in link.</p>
      {#if form?.status === 'send_error'}
        <div role="alert" class="alert alert-warning mb-3 text-sm">
          We're having trouble sending sign-in links right now. Please contact the site owner.
        </div>
      {:else if form?.status === 'throttled'}
        <div role="status" class="alert mb-3 text-sm">
          You requested a link recently. Check your inbox, or wait a minute and try again.
        </div>
      {/if}
      <!-- A fresh action result supersedes the GET-time error, so a resubmit into a throttle or a
           send failure never shows the stale expired-link alert alongside the new state. -->
      {#if data.error && !form?.status}
        <div role="alert" class="alert alert-error mb-3 text-sm">That link expired. Request a new one below.</div>
      {/if}
      <form method="POST" action="?/request" class="flex flex-col gap-3">
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

  <p class="text-xs text-muted">Powered by Cairn</p>
  </div>
</div>

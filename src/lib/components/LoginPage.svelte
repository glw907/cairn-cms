<!--
@component
The magic-link sign-in page. A plain form POST to the page's default action (the engine's
`requestAction`); no client SDK. The success message is identical whether or not the email is on
the allowlist, so the page never leaks membership (spec §7.1).
-->
<script lang="ts">
  import './cairn-admin.css';

  interface Props {
    /** The login load's data: the site name and an optional error. */
    data: { siteName: string; error: string | null };
    /** The action result: `sent` is true once a request was accepted. */
    form: { sent?: boolean } | null;
  }

  let { data, form }: Props = $props();
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div data-theme="cairn-admin" class="bg-base-200 text-base-content flex min-h-screen items-center justify-center p-4">
  <div class="rounded-box border border-base-300 bg-base-100 w-full max-w-sm p-6 shadow">
    <h1 class="mb-1 text-lg font-semibold">Sign in to {data.siteName}</h1>
    <p class="mb-4 text-sm text-[var(--color-muted)]">Enter your email and we'll send a sign-in link.</p>

    {#if form?.sent}
      <div role="status" class="alert alert-success text-sm">
        Check your email for a sign-in link. It expires in 10 minutes.
      </div>
    {:else}
      {#if data.error}
        <div role="alert" class="alert alert-error mb-3 text-sm">That link expired. Request a new one.</div>
      {/if}
      <form method="POST" class="flex flex-col gap-3">
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
</div>

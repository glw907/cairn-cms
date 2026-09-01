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
  import { NO_PENDING_REQUEST_ERROR } from '../sveltekit/auth-error-codes.js';

  interface Props {
    /** The confirm load's data: the token to submit, the site name, an optional error, the CSRF
     * token, and the SSR-resolved admin theme (the persisted cookie choice, or the light default;
     * the cookie carries no auth, so it applies before sign-in too). Optional so a test render
     * need not supply it; the real shell payload always does. */
    data: { token: string; siteName: string; error: string | null; csrf: string; theme?: 'cairn-admin' | 'cairn-admin-dark' };
    /** The confirm action's result: `error` on an unexpected failure (viewAction's generic
     * fail(500)), so it renders in place of the generic expired-link copy. Optional so a test
     * render need not supply it. */
    form?: { error?: string } | null;
  }

  let { data, form = null }: Props = $props();
</script>

<svelte:head>
  <title>Confirm sign-in · Cairn</title>
  <link rel="icon" href={cairnFaviconHref} />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- data-theme on a bare wrapper: the scoped sheet styles descendants, so the layout classes go one
     level in (a class on the theme element itself would not match). -->
<div data-theme={data.theme ?? 'cairn-admin'}>
  <div class="flex min-h-screen flex-col items-center justify-center gap-section bg-base-200 p-4 text-base-content">
  <div class="w-full max-w-sm card-shell p-7 text-center card-shadow">
    <div class="mb-6 flex items-center justify-center gap-2">
      <CairnLogo class="h-8 w-8 text-primary" />
      <!-- cairn-audit-disable-next-line type-scale -- the K4 keming fix raised the wordmark off text-xl because the rn pair merged and "Cairn" read "Caim"; the recipe is documented in docs/internal/admin-design-system.md. -->
      <span class="text-[1.375rem] font-semibold font-[family-name:var(--font-display)]">Cairn</span>
    </div>

    {#if form?.error}
      <h1 class="mb-2 type-heading font-bold font-[family-name:var(--font-display)]">This didn’t work</h1>
      <div role="alert" class="alert alert-error type-body">{form.error}</div>
      <a href="/admin/login" class="btn btn-ghost btn-sm mt-4">Back to sign in</a>
    {:else if data.error === NO_PENDING_REQUEST_ERROR}
      <!-- The confirm refused because this browser carries no pending sign-in, so the fix is to
           start over here rather than to request another link somewhere else. The heading states
           only what the engine knows: a cleared cookie jar and a second device look alike to it,
           so it never asserts which one happened. -->
      <h1 class="mb-2 type-heading font-bold font-[family-name:var(--font-display)]">This browser has no pending sign-in</h1>
      <div role="alert" tabindex="-1" class="alert alert-error type-body">
        Request a new sign-in link and open it in this browser.
      </div>
      <a href="/admin/login" class="btn btn-ghost btn-sm mt-4">Back to sign in</a>
    {:else if data.error || !data.token}
      <h1 class="mb-2 type-heading font-bold font-[family-name:var(--font-display)]">This link didn’t work</h1>
      <div role="alert" class="alert alert-error type-body">This sign-in link is invalid or expired.</div>
      <a href="/admin/login" class="btn btn-ghost btn-sm mt-4">Request a new link</a>
    {:else}
      <h1 class="type-heading font-bold font-[family-name:var(--font-display)]">Almost there</h1>
      <p class="mt-1 mb-5 type-body text-muted">Confirm to finish signing in to {data.siteName}.</p>
      <form method="POST" action="?/confirm">
        <input type="hidden" name="token" value={data.token} />
        <CsrfField token={data.csrf} />
        <button type="submit" class="btn btn-primary btn-block">Confirm sign-in</button>
      </form>
    {/if}
  </div>

  <p class="type-meta text-muted">Powered by Cairn</p>
  </div>
</div>

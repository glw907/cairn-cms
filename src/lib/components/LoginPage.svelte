<script lang="ts">
  // The magic-link sign-in page. Posts the email to /admin/auth/request; `sent`/`error` come
  // from `loginLoad` (querystring) merged with `adminLayoutLoad` (siteName).
  interface Props {
    data: { siteName: string; sent: boolean; error: string | null };
  }
  let { data }: Props = $props();

  const errorMessages: Record<string, string> = {
    invalid: 'Please enter a valid email address.',
    denied: 'That email is not on the editor allowlist.',
    expired: 'That sign-in link has expired or was already used. Request a new one.',
    config: 'Sign-in is not configured. Contact the site admin.',
  };
</script>

<svelte:head>
  <title>Sign in · {data.siteName} CMS</title>
</svelte:head>

<div class="mx-auto mt-16 max-w-md rounded-box border border-base-300 bg-base-100 p-8">
  <h1 class="text-2xl font-bold">{data.siteName} CMS</h1>
  <p class="mt-1 text-sm opacity-70">Sign in with your editor email.</p>

  {#if data.sent}
    <div class="alert alert-success mt-6">
      <span>Check your inbox — a sign-in link is on its way. It expires in 10 minutes.</span>
    </div>
  {:else}
    {#if data.error}
      <div class="alert alert-error mt-6">
        <span>{errorMessages[data.error] ?? 'Something went wrong. Try again.'}</span>
      </div>
    {/if}
    <form method="POST" action="/admin/auth/request" class="mt-6 flex flex-col gap-3">
      <input
        type="email"
        name="email"
        required
        autocomplete="email"
        placeholder="you@example.com"
        class="input w-full"
      />
      <button type="submit" class="btn btn-primary">Email me a sign-in link</button>
    </form>
  {/if}
</div>

<script lang="ts">
  // The magic-link sign-in page. Requests a link via the better-auth client (client-side, same
  // origin). To avoid enumeration the UI shows the same neutral copy whether or not the email is
  // on the allowlist. The server only emails actual editors (see auth/config.ts send gate).
  import { createAuthClient } from 'better-auth/svelte';
  import { magicLinkClient } from 'better-auth/client/plugins';

  // The browser client lives in the one component that needs it (requesting a link). Sign-out
  // and editor management go through server endpoints, so no shared client module is needed.
  // A component-local const keeps better-auth's deep client types out of the packaged .d.ts.
  const authClient = createAuthClient({ plugins: [magicLinkClient()] });

  interface Props {
    data: { siteName: string };
  }
  let { data }: Props = $props();

  let email = $state('');
  let requested = $state(false);
  let busy = $state(false);

  async function request(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    // The magic-link email points at our /admin/auth/confirm page (built in config.ts), not a
    // GET-verify URL, so the result is the same regardless of allowlist membership.
    await authClient.signIn.magicLink({ email });
    busy = false;
    requested = true;
  }
</script>

<svelte:head>
  <title>Sign in · {data.siteName} CMS</title>
</svelte:head>

<div class="mx-auto mt-16 max-w-md rounded-box border border-base-300 bg-base-100 p-8">
  <h1 class="text-2xl font-bold">{data.siteName} CMS</h1>
  <p class="mt-1 text-sm opacity-70">Sign in with your editor email.</p>

  {#if requested}
    <div class="alert alert-success mt-6">
      <span>
        If that address is on the editor list, a sign-in link is on its way. It expires in 10
        minutes.
      </span>
    </div>
  {:else}
    <form onsubmit={request} class="mt-6 flex flex-col gap-3">
      <input
        type="email"
        name="email"
        bind:value={email}
        required
        autocomplete="email"
        placeholder="you@example.com"
        class="input w-full"
      />
      <button type="submit" class="btn btn-primary" disabled={busy}>
        {busy ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
  {/if}
</div>

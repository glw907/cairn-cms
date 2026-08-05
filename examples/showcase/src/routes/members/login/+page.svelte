<!--
@component
The showcase's member login page: a request form (contact to code) and a confirm form (code to
session), the guide's worked exemplar rendered (docs/guides/add-a-login-channel.md). Both forms
embed `insecureTestChallenge`'s static token; see `members/channel.ts`'s header comment for why
this fixture cannot reach challenges.cloudflare.com, and wire a real Turnstile widget in the same
slot on a real site instead. The confirm form carries no `contact` field on purpose: `confirm`
reads the pending code by its nonce cookie alone, so a member must confirm in the same browser
that requested the code (the guide's "same browser" rule; a cross-browser confirm answers
`no-pending-request`). The request form doubles as its own resend control: a second submission
inside the cooldown still answers `sent`, so the button's label is the only thing that changes.
-->
<script lang="ts">
  import themeCss from '$theme/theme.css?url';
  import { INSECURE_TEST_CHALLENGE_FIELD, INSECURE_TEST_CHALLENGE_TOKEN } from '../../../members/channel.js';
  import type { ActionData } from './$types';

  interface Props {
    /** The last action's result: whichever of the two named forms (`request`, `confirm`) posted. */
    form: ActionData;
  }

  let { form }: Props = $props();
</script>

<svelte:head>
  <link rel="stylesheet" href={themeCss} />
  <title>Member sign in</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-base-200 p-4 text-base-content">
  <div class="card w-full max-w-sm bg-base-100 shadow">
    <div class="card-body gap-5">
      <h1 class="card-title">Member sign in</h1>

      <form method="POST" action="?/request" class="flex flex-col gap-3">
        <input type="hidden" name={INSECURE_TEST_CHALLENGE_FIELD} value={INSECURE_TEST_CHALLENGE_TOKEN} />
        <fieldset class="flex flex-col gap-1">
          <legend class="text-sm font-medium">Email</legend>
          <label class="sr-only" for="member-contact">Email</label>
          <input
            id="member-contact"
            name="contact"
            type="email"
            class="input w-full"
            placeholder="you@showcase.test"
            value={(form && 'contact' in form && form.contact) || ''}
            required
          />
        </fieldset>
        <button type="submit" class="btn btn-primary">
          {form && 'requested' in form && form.requested ? 'Resend code' : 'Send code'}
        </button>
      </form>

      {#if form && 'requestError' in form}
        <div role="alert" class="alert alert-error text-sm">Could not send a code. Try again.</div>
      {:else if form && 'requested' in form && form.requested}
        <div role="status" class="alert alert-success text-sm">A code was sent. Check the inbox.</div>
      {/if}

      <form method="POST" action="?/confirm" class="flex flex-col gap-3">
        <input type="hidden" name={INSECURE_TEST_CHALLENGE_FIELD} value={INSECURE_TEST_CHALLENGE_TOKEN} />
        <fieldset class="flex flex-col gap-1">
          <legend class="text-sm font-medium">Code</legend>
          <label class="sr-only" for="member-code">Code</label>
          <input
            id="member-code"
            name="code"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            class="input w-full"
            placeholder="12345678"
            required
          />
        </fieldset>
        <button type="submit" class="btn btn-outline">Confirm code</button>
      </form>

      {#if form && 'confirmError' in form}
        <div role="alert" class="alert alert-error text-sm">That code did not work. Try again.</div>
      {/if}
    </div>
  </div>
</div>

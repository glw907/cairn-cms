<!--
@component
The Share preview group inside the edit page's slide-over (spec part 3, "Public preview for
a non-editor"): mint a link so someone who is not an editor can read the pending draft, and
revoke every outstanding link in one move. It renders as a sibling of `DetailsPanel`, not
inside it. Renders nothing when the mounting admin facade does not expose the
`previewMint`/`previewRevoke` actions.

The minted URL is a bearer credential (anyone holding it can read the draft with no
session), so it lives only in this component's transient state, never in localStorage or a
query param. The host mounts this panel inside its `{#key entryKey}` block, so an entry hop
destroys and recreates the instance; that remount, not an explicit reset, is what keeps one
entry's minted link from surviving onto another entry's panel.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { postFormAction, type ActionOutcome } from './client-action.js';

  interface Props {
    /** The entry's concept id, for the action URL. */
    conceptId: string;
    /** The entry's id, for the action URL. */
    entryId: string;
    /** The CSRF token getter from the admin layout context. */
    csrf: (() => string) | undefined;
    /** Whether the mounting admin facade exposes the preview actions at all. */
    previewMint: boolean;
  }
  let { conceptId, entryId, csrf, previewMint }: Props = $props();

  const eyebrowClass = 'mb-2 type-label font-semibold uppercase tracking-[0.08em] text-muted';

  let shareBusy = $state(false);
  let shareResult = $state<{ url: string; expiresAt: number } | null>(null);
  let shareError = $state<string | null>(null);
  let shareCopied = $state(false);
  let shareUrlInput = $state<HTMLInputElement | null>(null);
  let revokeBusy = $state(false);
  let revokeCount = $state<number | null>(null);
  let revokeError = $state<string | null>(null);

  const MINT_FAILED = 'Could not create a preview link. Try again.';
  const REVOKE_FAILED = 'Could not revoke preview links. Try again.';

  /** Render a preview link's millisecond expiry as a human date and time (the store's own unit,
   *  an epoch-ms `expires_at`). */
  function formatExpiry(expiresAt: number): string {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(expiresAt));
  }

  /** The POST both preview round trips make: an empty body, the CSRF header, and `redirect:
   *  'manual'` so the guard's expired-session 303 arrives as `sessionExpired` instead of a
   *  followed redirect (the tidy and dictionary calls the shell makes post the same way). */
  function postPreviewAction<T>(action: 'previewMint' | 'previewRevoke'): Promise<ActionOutcome<T>> {
    return postFormAction<T>(`/admin/${conceptId}/${entryId}?/${action}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'text/plain', 'X-Cairn-CSRF': csrf?.() ?? '' },
      body: '',
    });
  }

  /** The message a refused preview round trip shows: the expired-session line, else the server's
   *  own actionable refusal when it sent one, else `generic`. A bare `'csrf'` is the guard's
   *  diagnostic code rather than author-facing copy, so it falls through to `generic` too. */
  function previewFailureMessage(outcome: { data?: unknown; sessionExpired?: boolean }, expired: string, generic: string): string {
    if (outcome.sessionExpired) return expired;
    const failure = outcome.data as { error?: unknown } | undefined;
    if (typeof failure?.error === 'string' && failure.error !== 'csrf') return failure.error;
    return generic;
  }

  /** Mint a preview link for this entry's pending draft. A refusal (no draft to share, the
   *  migration not yet applied) shows the server's own actionable message; a network failure or an
   *  expired session shows a generic retry line. */
  async function mintPreview() {
    if (shareBusy) return;
    shareBusy = true;
    shareError = null;
    try {
      const outcome = await postPreviewAction<{ url?: unknown; expiresAt?: unknown }>('previewMint');
      if (!outcome.ok) {
        shareError = previewFailureMessage(
          outcome,
          'Your session expired. Sign in again to share a preview link.',
          MINT_FAILED,
        );
        return;
      }
      const url = typeof outcome.data.url === 'string' ? outcome.data.url : '';
      const expiresAt = typeof outcome.data.expiresAt === 'number' ? outcome.data.expiresAt : 0;
      if (!url) {
        shareError = MINT_FAILED;
        return;
      }
      shareResult = { url, expiresAt };
      shareCopied = false;
      // The store now holds a live link; drop any revoke result still on screen so the panel
      // never implies the store is empty right under a URL that says otherwise.
      revokeCount = null;
      revokeError = null;
      // Focus the URL field once it renders, so a keyboard or screen-reader author lands on the
      // result without hunting for it.
      void tick().then(() => shareUrlInput?.focus());
    } catch {
      shareError = MINT_FAILED;
    } finally {
      shareBusy = false;
    }
  }

  // The copy confirmation's own auto-dismiss: shareCopied already resets on a fresh mint or a
  // revoke, but a copy with no further action must also stop claiming "Copied" after a few
  // seconds, both on the button's own label and the role="status" line below.
  const COPIED_RESET_MS = 2000;
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    return () => clearTimeout(copiedTimer);
  });

  /** Copy the minted URL to the clipboard. A denied or unavailable clipboard falls back to selecting
   *  the field's text, so a manual copy still works. The Media Library's own copy affordance answers
   *  the same failure with a notice instead, since the reference it copies sits in no field. */
  function copyShareUrl() {
    if (!shareResult) return;
    const url = shareResult.url;
    void navigator.clipboard?.writeText(url).then(
      () => {
        shareCopied = true;
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => (shareCopied = false), COPIED_RESET_MS);
      },
      () => shareUrlInput?.select(),
    );
  }

  /** Revoke every outstanding preview link for this entry. Always clears any minted URL still on
   *  screen, whether or not the count was zero: a revoked link cannot be recovered (the store
   *  holds only its hash), so this affordance never leaves a stale URL implying otherwise. */
  async function revokePreview() {
    if (revokeBusy) return;
    revokeBusy = true;
    revokeError = null;
    try {
      const outcome = await postPreviewAction<{ count?: unknown }>('previewRevoke');
      if (!outcome.ok) {
        revokeError = previewFailureMessage(
          outcome,
          'Your session expired. Sign in again to revoke preview links.',
          REVOKE_FAILED,
        );
        return;
      }
      revokeCount = typeof outcome.data.count === 'number' ? outcome.data.count : 0;
      // The store now holds nothing for this entry; drop any minted URL or stale mint error
      // still on screen so the panel never shows a link (or a share refusal) the store can no
      // longer stand behind.
      shareResult = null;
      shareCopied = false;
      shareError = null;
    } catch {
      revokeError = REVOKE_FAILED;
    } finally {
      revokeBusy = false;
    }
  }
</script>

{#if previewMint}
  <fieldset class="m-0 flex min-w-0 flex-col gap-label border-0 p-0">
    <legend class={eyebrowClass}>Share preview</legend>
    <p class="type-meta text-muted">
      Share a private link so someone who is not an editor can read this draft before it publishes.
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <!-- aria-disabled, not the native attribute (the repo's guarded-control pattern,
           EditPage.svelte's Publish button): the control stays focusable and mintPreview's own
           early return (`if (shareBusy) return;`) makes the busy click inert, so no extra
           onclick wrapper is needed here the way the form-submitting Publish button needs one. -->
      <button
        type="button"
        class="btn btn-ghost btn-sm cairn-btn-guarded"
        class:cursor-not-allowed={shareBusy}
        aria-disabled={shareBusy ? true : undefined}
        onclick={mintPreview}
      >
        {#if shareBusy}<span class="loading loading-spinner loading-xs" aria-hidden="true"></span> Minting…{:else}Share preview link{/if}
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm cairn-btn-guarded"
        class:cursor-not-allowed={revokeBusy}
        aria-disabled={revokeBusy ? true : undefined}
        onclick={revokePreview}
      >
        {#if revokeBusy}<span class="loading loading-spinner loading-xs" aria-hidden="true"></span> Revoking…{:else}Revoke all links{/if}
      </button>
    </div>
    {#if shareResult}
      <!-- The Copy button is a real interactive control, so it stays OUT of the role="status"
           region below: AT support for a control inside a live region is inconsistent, and the
           button's own label mutation would otherwise re-trigger the whole region's announcement
           on every copy. Its "Copied to clipboard" confirmation instead renders as a plain text
           line inside the region. -->
      <div class="flex flex-col gap-1.5">
        <label class="type-meta font-medium" for="cairn-preview-share-url">Preview link</label>
        <div class="flex items-center gap-1.5">
          <input
            bind:this={shareUrlInput}
            id="cairn-preview-share-url"
            type="text"
            readonly
            autocomplete="off"
            class="input input-sm min-w-0 flex-1 font-mono type-meta"
            value={shareResult.url}
            onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
          />
          <button type="button" class="btn btn-ghost btn-sm shrink-0" onclick={copyShareUrl}>
            {shareCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    {/if}
    <!-- One always-mounted role="status" region, so a later first result still announces (the
         needs-alt notice's live-region rule). Text only: the mint/expiry confirmation, the copy
         confirmation, and the revoke count; errors below are separate role="alert" lines,
         following ComponentForm's inline validation-message idiom. -->
    <div role="status" aria-live="polite" class="flex flex-col gap-2">
      {#if shareResult}
        <p class="type-meta text-muted">Expires {formatExpiry(shareResult.expiresAt)}.</p>
      {/if}
      {#if shareCopied}
        <p class="type-meta text-muted">Copied to clipboard.</p>
      {/if}
      {#if revokeCount !== null}
        <p class="type-meta text-muted">
          {revokeCount === 0 ? 'No preview links to revoke.' : `Revoked ${revokeCount} ${revokeCount === 1 ? 'link' : 'links'}.`}
        </p>
      {/if}
    </div>
    <!-- Two always-mounted role="alert" wrappers (present and empty at load), the EditPage
         role="status" region's own recipe: a region conditionally mounted with its first content
         may not be observed by assistive tech (WCAG 4.1.3). Each message gates on its own
         presence inside, so an empty wrapper shows nothing. -->
    <div role="alert">
      {#if shareError}<p class="text-error type-meta">{shareError}</p>{/if}
    </div>
    <div role="alert">
      {#if revokeError}<p class="text-error type-meta">{revokeError}</p>{/if}
    </div>
  </fieldset>
{/if}

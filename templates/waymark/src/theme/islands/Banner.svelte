<!--
@component
Showcase island: the expiring-announcement banner mounted over its static fallback by the cairn
islands runtime. Props are the `:::banner` directive's scalar attributes. Mounts over the
build()-emitted fallback and re-checks the expiry on its own, at hydration, rather than trusting the
server's snapshot: a statically built or long-cached page can outlive its `expires` date, so the
reader must never see a banner the author meant to have disappeared by now. Uses `$derived` (never
`$effect`), so the check runs once, lazily, on first read, with no interval; a banner does not need
to vanish mid-visit, only stay correct across a fresh mount. Every prop is author-controlled and
untrusted, so `message` only ever reaches a text binding, never `{@html}`.
-->
<script lang="ts">
  import { isBannerExpired } from './banner-expiry.js';

  interface Props {
    /** The announcement text. */
    message?: string;
    /** The last date (`YYYY-MM-DD`) the banner shows, inclusive. Missing or unparsable hides it. */
    expires?: string;
  }

  let { message = '', expires }: Props = $props();
  const expired = $derived(isBannerExpired(expires));
</script>

{#if !expired}
  <div class="banner" role="status" data-testid="banner-live">
    <p class="banner-message">{message}</p>
  </div>
{/if}

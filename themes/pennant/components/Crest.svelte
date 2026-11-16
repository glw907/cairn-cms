<!-- @component
The club's crest: a shield in color 2 (`--color-secondary`) holding up to three initials from the
site name, set in `--font-brand`. The header and the home hero both place it. The shield is drawn
with `clip-path`, so it scales with the surrounding font size; set `font-size` on a parent to size
it. A name with no letters gives an empty shield, never a missing one. The initials are
decorative beside the site name, so the shield is hidden from assistive technology.
-->
<script lang="ts">
  import { crestInitials } from './crest.js';

  interface Props {
    /** The site name the initials come from. */
    siteName: string;
  }

  let { siteName }: Props = $props();

  const initials = $derived(crestInitials(siteName));
</script>

<span class="crest" aria-hidden="true">{initials}</span>

<style>
  .crest {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 2.1em;
    height: 2.35em;
    padding-bottom: 0.3em;
    clip-path: polygon(0 0, 100% 0, 100% 68%, 50% 100%, 0 68%);
    background: var(--color-secondary);
    color: var(--color-secondary-content);
    font-family: var(--font-brand);
    font-weight: 800;
    line-height: 1;
    letter-spacing: var(--tracking-display);
  }
</style>

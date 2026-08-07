<!--
@component
A design-agnostic status notice for a shared preview link, driven only by the `preview` field
`previewLoad` (`/sveltekit`) adds to its data. It renders one of two states and nothing else: no
fetch, no internal state, no interactivity. A site may ignore this component entirely and render
its own banner from the same metadata; this is only the default treatment a getting-started site
mounts.

`state: 'draft'` names the expiry so a holder knows the link ages out. `state: 'published'`
reports only that the preview has ended: a discarded edit and a published one both reach this
state, so the copy never claims the draft went live, which would be false for the discard case.
When `published` is set (the branch is gone because the entry shipped) the copy links the live
permalink; when it is `null` (a discarded new entry, which never had a live page) no link renders.

Marked up as an `<aside>` with an explicit `aria-label`, not `role="status"`: the props are fixed
at mount (this component holds no state and never receives a change from within the page), so
there is nothing for a live region to announce, and `role="status"`'s implicit
`aria-live="polite"` exists for exactly that dynamic case. An `aside` landmark instead makes the
notice discoverable through landmark navigation, the honest fit for a static, supplementary piece
of page status.

Ships with a small scoped default, legible in both colour schemes via `prefers-color-scheme`, with
no DaisyUI or Tailwind class dependency (a consuming site may have neither) and no bundled font
choice to fight. Every visual value reads a CSS custom property with a fallback
(`var(--cairn-preview-bg, <default>)` and friends); it never declares one on the scoped element, since
Svelte's scoping class would raise a declared property's own specificity past a plain `:root` rule,
making a site's override silently lose. Reading the property instead lets a site set
`--cairn-preview-bg` and friends on `:root` or any ancestor and win, no `:global` or specificity fight
required.
-->
<script lang="ts">
  import type { PreviewData } from '../sveltekit/preview.js';

  interface Props {
    /** The preview metadata `previewLoad` returns alongside the page's own entry data. */
    preview: PreviewData['preview'];
  }
  let { preview }: Props = $props();

  // The visitor's own locale, not a fixed one: unlike the admin's editor-facing surfaces, this
  // component renders on a public page for whoever holds the link.
  const expiryText = $derived(
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(preview.expiresAt),
    ),
  );
</script>

<aside class="cairn-preview-banner" data-state={preview.state} aria-label="Preview status">
  {#if preview.state === 'draft'}
    <p>Draft preview &middot; expires {expiryText}</p>
  {:else}
    <p>
      This preview has ended.
      {#if preview.published}
        <a href={preview.published.permalink}>View the published page</a>
      {/if}
    </p>
  {/if}
</aside>

<style>
  /* Every colour below is a literal fallback inside a var(), not a palette token, and the
     `token-colors` suppressions that follow all rest on this one reason: PreviewBanner is the only
     component in this barrel that renders on a PUBLIC page, where a site may load neither
     cairn-admin.css nor Tailwind, so a token reference would resolve to nothing and ship an
     unstyled notice. Each literal is a fallback for a custom property a site overrides from its own
     stylesheet (`:root`, an ancestor, or the class below), never a declaration on this scoped
     element: Svelte's scoping class would raise a declared property's own specificity past a plain
     `:root` rule, making a site's override silently lose. */

  /* cairn-audit-disable-next-line token-colors -- the public-page default palette, see above */
  .cairn-preview-banner {
    box-sizing: border-box;
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--cairn-preview-border, #e6cf8a);
    border-radius: var(--cairn-preview-radius, 0.5rem);
    background: var(--cairn-preview-bg, #fff6dd);
    color: var(--cairn-preview-fg, #3a2f12);
    font: 0.9375rem/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
  }

  /* cairn-audit-disable-next-line token-colors -- the public-page default palette, see above */
  .cairn-preview-banner[data-state='published'] {
    border-color: var(--cairn-preview-border, #cdd3d9);
    background: var(--cairn-preview-bg, #eef0f2);
    color: var(--cairn-preview-fg, #2c333a);
  }

  .cairn-preview-banner p {
    margin: 0;
  }

  /* Underlined, not colour alone (WCAG 1.4.1): Tailwind Preflight strips the UA underline on a
     consuming site, which would otherwise leave the link distinguished only by its `--cairn-preview-link`
     colour against the surrounding text. */
  /* cairn-audit-disable-next-line token-colors -- the public-page default palette, see above */
  .cairn-preview-banner a {
    color: var(--cairn-preview-link, #7a4f00);
    text-decoration: underline;
  }

  /* cairn-audit-disable-next-line token-colors -- the public-page default palette, see above */
  .cairn-preview-banner[data-state='published'] a {
    color: var(--cairn-preview-link, #1f4fd8);
  }

  @media (prefers-color-scheme: dark) {
    /* cairn-audit-disable-next-line token-colors -- the public-page default palette, see above */
    .cairn-preview-banner {
      border-color: var(--cairn-preview-border, #6b5420);
      background: var(--cairn-preview-bg, #3a2f12);
      color: var(--cairn-preview-fg, #f5e7bc);
    }

    /* cairn-audit-disable-next-line token-colors -- the public-page default palette, see above */
    .cairn-preview-banner[data-state='published'] {
      border-color: var(--cairn-preview-border, #444b52);
      background: var(--cairn-preview-bg, #23262a);
      color: var(--cairn-preview-fg, #dfe3e7);
    }

    /* cairn-audit-disable-next-line token-colors -- the public-page default palette, see above */
    .cairn-preview-banner a {
      color: var(--cairn-preview-link, #ffd066);
    }

    /* cairn-audit-disable-next-line token-colors -- the public-page default palette, see above */
    .cairn-preview-banner[data-state='published'] a {
      color: var(--cairn-preview-link, #8fb4ff);
    }
  }
</style>

<!--
@component
A design-agnostic status notice for a shared preview link, driven only by the `preview` field
`loadPreview` (`/sveltekit`) adds to its data. It renders one of two states and nothing else: no
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

Ships with a small scoped default that reads the site's theme tokens: daisyUI's role colors
(`--color-base-100`, `--color-base-200`, `--color-base-content`, `--color-warning`,
`--color-info`) and the `--cairn-warning-ink` and `--cairn-info-ink` roles `cairn-public.css`
defines. The draft state paints the `base-200` surface under a `warning` border and the ended state
paints `base-100` under an `info` border, so the two stay distinct in every scheme the site's theme
supports, with no `prefers-color-scheme` block of its own. It uses no DaisyUI component class and no
Tailwind class (a consuming site may have neither) and no bundled font choice to fight. Every
visual value reads a CSS custom property with a token fallback
(`var(--cairn-preview-bg, var(--color-base-200))` and friends); it never declares one on the scoped
element, since Svelte's scoping class would raise a declared property's own specificity past a
plain `:root` rule, making a site's override silently lose. Reading the property instead lets a site
set `--cairn-preview-bg` and friends on `:root` or any ancestor and win, no `:global` or specificity
fight required.

The five custom properties, `--cairn-preview-bg`, `--cairn-preview-fg`, `--cairn-preview-border`,
`--cairn-preview-link`, and `--cairn-preview-radius`, are the intended site-override seam, not an
implementation detail. A site that sets a color property applies it to both states, since each
property replaces the default for the whole banner. A worked `data-theme` example lives in
docs/extend/share-a-draft-preview.md ("Override the banner's palette").
-->
<script lang="ts">
  import type { PreviewData } from '../sveltekit/preview.js';

  /** `expiresAt`'s default rendering: a fixed, locale-independent `YYYY-MM-DD HH:MM UTC` string. */
  function defaultFormatExpiry(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  }

  interface Props {
    /** The preview metadata `loadPreview` returns alongside the page's own entry data. */
    preview: PreviewData['preview'];
    /**
     * Format `preview.expiresAt` for display. Defaults to a fixed `YYYY-MM-DD HH:MM UTC` string,
     *  deliberately not the visitor's own locale: this renders identically during SSR and
     *  hydration, so a Worker whose runtime locale or timezone differs from the browser's own
     *  cannot produce two different strings and a hydration mismatch. Pass a formatter to render
     *  the expiry in a site's own fixed date vocabulary instead.
     */
    formatExpiry?: (iso: string) => string;
  }
  let { preview, formatExpiry = defaultFormatExpiry }: Props = $props();

  const expiryText = $derived(formatExpiry(preview.expiresAt));
</script>

<aside class="cairn-preview-banner" data-state={preview.state} aria-label="Preview status">
  {#if preview.state === 'draft'}
    <p>Draft preview &middot; expires <time datetime={preview.expiresAt}>{expiryText}</time></p>
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
  /* Every color is a token read: a daisyUI role, or a `cairn-public.css` role that carries a
     daisyUI-variable fallback so the notice paints legibly on a site that has not yet imported
     that sheet. Each `--cairn-preview-*` property is read here, never declared on this scoped
     element: Svelte's scoping class would raise a declared property's own specificity past a plain
     `:root` rule, making a site's override silently lose. */

  .cairn-preview-banner {
    box-sizing: border-box;
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--cairn-preview-border, var(--color-warning));
    border-radius: var(--cairn-preview-radius, var(--radius-box, 0.5rem));
    background: var(--cairn-preview-bg, var(--color-base-200));
    color: var(--cairn-preview-fg, var(--color-base-content));
    font: 0.9375em/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
  }

  .cairn-preview-banner[data-state='published'] {
    border-color: var(--cairn-preview-border, var(--color-info));
    background: var(--cairn-preview-bg, var(--color-base-100));
  }

  .cairn-preview-banner p {
    margin: 0;
  }

  /* Underlined, not colour alone (WCAG 1.4.1): Tailwind Preflight strips the UA underline on a
     consuming site, which would otherwise leave the link distinguished only by its
     `--cairn-preview-link` colour against the surrounding text. */
  .cairn-preview-banner a {
    color: var(--cairn-preview-link, var(--cairn-warning-ink, var(--color-base-content)));
    text-decoration: underline;
  }

  .cairn-preview-banner[data-state='published'] a {
    color: var(--cairn-preview-link, var(--cairn-info-ink, var(--color-base-content)));
  }
</style>

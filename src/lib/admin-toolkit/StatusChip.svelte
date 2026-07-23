<!--
@component
The admin toolkit's one surface allowed a semantic status color, graduated from
aksailingclub-org's `src/admin-club/toolkit/StatusChip.svelte`. `tone` carries the full daisyUI
semantic vocabulary (neutral/info/success/warning/danger); the tone-to-standing mapping (which
standing reads `warning`, which reads `neutral`) lives with the consumer, never inside this
component.

Assembles from two daisyUI 5 primitives already in cairn's admin CSS build: `badge` (the pill
shape) carries no tone color of its own here, since `badge-error`/`badge-success` do not compile
in the packaged `cairn-admin.css` while every `status-<tone>` modifier does. The small `status`
dot carries the actual color signal instead, one consistent mechanism across all five tones
rather than four covered by a badge fill plus a gap.

`badge-outline`, not `badge-ghost`: `badge-ghost` compiles to an explicit background and border
color that matches one of AdminTable's own zebra stripe colors, so a ghost chip melts into
whichever row shares that color. `badge-outline` has no fill and sets no `--badge-color`, so its
border would otherwise resolve to the full-strength inherited text color, which reads as a
clickable button rather than a status marker. The scoped `<style>` below demotes it to
`color-mix(in oklab, currentColor 35%, transparent)`, a hairline adversarially verified against
both zebra stripes in both themes (22% sits at the visibility floor on the light zebra; 35%
survives).

Padding, truncation, and the min/max width live in this component's own scoped `<style>` rather
than a Tailwind utility string, since `/admin/**` routes load only cairn's precompiled admin CSS
and an arbitrary utility never reaches it.

The `sm` size keeps a `5rem` floor (comfortable next to a longer generic label, its first
consumer's own household-standing context; a min-width-free "hugging" alternative was tried and
adversarially refuted -- it produces a ragged column when chip labels vary in length); `xs`
carries no floor of its own (the admin-toolkit organization pass's T6 absorption: a dense table
column, ConceptList's publish-state cell and MediaLibrary's alt/usage cells, budgets its narrow-
viewport width against the chip's real content, not a fixed reservation sized for a longer label
the office's own three-word vocabulary never needs).
-->
<script module lang="ts">
  /** The chip's full semantic tone vocabulary. `danger` reads as daisyUI's `error` semantic under
   *  the hood; the toolkit's own public vocabulary stays framework-neutral. */
  export type StatusChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

  /** Two named sizes, matching AdminTable's own density tier names rather than a bespoke scale. */
  export type StatusChipSize = 'xs' | 'sm';

  /** The daisyUI `status-<tone>` suffix for each public tone. Exported so a future legend
   *  component renders the identical dot color beside its own explanatory text without
   *  duplicating this mapping, the toolkit's "legend hook". */
  export const STATUS_CHIP_DOT_CLASS: Record<StatusChipTone, string> = {
    neutral: 'status-neutral',
    info: 'status-info',
    success: 'status-success',
    warning: 'status-warning',
    danger: 'status-error',
  };
</script>

<script lang="ts">
  interface Props {
    /** The chip's semantic tone. The consumer maps its own vocabulary onto this one (a
     *  household's Current/Overdue/Former standing, say); StatusChip carries no domain
     *  knowledge. */
    tone: StatusChipTone;
    /** The chip's visible text. */
    label: string;
    /** Defaults to `'sm'`. */
    size?: StatusChipSize;
    /** Optional explanatory text for a tone a label alone does not fully carry (e.g. "full
     *  member benefits continue during the grace window"). Surfaces as a native tooltip and as a
     *  visually-hidden span read straight after the visible label, rather than an `aria-label` on
     *  the outer element (which some assistive technology exposes inconsistently); omit for a
     *  self-explanatory label. */
    legend?: string;
  }

  let { tone, label, size = 'sm', legend }: Props = $props();

  const dotSizeClass = $derived(size === 'xs' ? 'status-xs' : 'status-sm');
</script>

<span
  class="badge badge-outline {size === 'xs' ? 'badge-xs' : 'badge-sm'} status-chip {size === 'xs' ? 'status-chip-xs' : ''}"
  title={legend}
>
  <span class="status {STATUS_CHIP_DOT_CLASS[tone]} {dotSizeClass}" aria-hidden="true"></span>
  <span class="status-chip-label">{label}</span>{#if legend}<span class="sr-only">: {legend}</span>{/if}
</span>

<style>
  /* Layout only: shape and color come from the daisyUI badge/status classes above. Values stay
     literal (not design tokens) because this scoped block is the toolkit's one place free of the
     compiled-admin-CSS constraint documented above -- there is no shared token here that survives
     an /admin/** route. */
  .status-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 5rem;
    max-width: 10rem;
    /* Demoted from badge-outline's full-strength `border-color: currentColor` (reads as a
       button, not a status marker): a hairline at 35% of the tone color survives adversarial
       zebra-stripe testing on both themes (22% sat at the visibility floor on light zebra). */
    border-color: color-mix(in oklab, currentColor 35%, transparent);
  }

  /* xs carries no reserved floor: a dense table column budgets its own narrow-viewport width
     against the chip's real content, per the header comment above. */
  .status-chip-xs {
    min-width: 0;
  }

  .status-chip-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

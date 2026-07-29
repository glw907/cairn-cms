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

`badge-outline`, not `badge-ghost`: `badge-ghost` retired from cairn's own tree (design
infrastructure Pass 3, corpus C). It compiles to an explicit background and border color that can
match one of AdminTable's own zebra stripe colors, so a ghost chip melts into whichever row shares
that color, and neither it nor the un-tuned `badge-outline` clears the audit's own 3:1
border-contrast floor in both themes. `register` now carries two ratified recipes instead: the
default `'bounded'` demotes `badge-outline`'s full-strength inherited-text-color border (which
otherwise reads as a clickable button, not a status marker) to
`color-mix(in oklab, currentColor 55%, transparent)`, a hairline that clears 3:1 in both themes,
measured against both zebra stripes and both page grounds; `'quiet'` drops the border entirely and
tints the ground with `color-mix(in oklab, var(--color-base-content) 14%, var(--color-base-300))`
instead, for a settled state (a household's Published, say) that should recede rather than compete.
Both values are measured, not invented (docs/internal/probes/2026-07-28-chip-registers).

Padding, truncation, and the min/max width live in this component's own scoped `<style>` rather
than a Tailwind utility string. That was a hard constraint when this component was written, since
`/admin/**` routes load only cairn's precompiled admin CSS and `src/lib/admin-toolkit` was outside
the `@source` roots then. The directory joined those roots in `c21ac3b8`, so an arbitrary utility
written here does compile now; the scoped rules stay because they are settled, and the constraint
still binds a CONSUMER's own admin screen, which cairn never scans.

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

  /** The two ratified chip registers (design infrastructure Pass 3): `bounded`, a demoted-hairline
   *  border for a chip that must read as a discrete object, and `quiet`, a token-derived tinted
   *  ground with no border for a settled state that should recede. Named in the standard doc's
   *  chip-passivity register. */
  export type StatusChipRegister = 'bounded' | 'quiet';

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
    /** Which register the chip renders in. Defaults to `'bounded'`, the toolkit's original
     *  reading, a chip that must read as a discrete object; pass `'quiet'` for a settled state
     *  that should recede rather than compete (e.g. Published). */
    register?: StatusChipRegister;
    /** Optional explanatory text for a tone a label alone does not fully carry (e.g. "full
     *  member benefits continue during the grace window"). Surfaces as a native tooltip and as a
     *  visually-hidden span read straight after the visible label, rather than an `aria-label` on
     *  the outer element (which some assistive technology exposes inconsistently); omit for a
     *  self-explanatory label. */
    legend?: string;
  }

  let { tone, label, size = 'sm', register = 'bounded', legend }: Props = $props();

  const dotSizeClass = $derived(size === 'xs' ? 'status-xs' : 'status-sm');
  const registerClass = $derived(register === 'quiet' ? 'status-chip-quiet' : 'status-chip-bounded');
</script>

<span
  class="badge badge-outline {size === 'xs' ? 'badge-xs' : 'badge-sm'} status-chip {registerClass} {size === 'xs' ? 'status-chip-xs' : ''}"
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
  }

  /* BOUNDED (Task 1 ratified, docs/internal/probes/2026-07-28-chip-registers): demotes
     badge-outline's full-strength `border-color: currentColor` (reads as a button, not a status
     marker) to a hairline that clears the audit's own 3:1 border-contrast floor in both themes
     (light card 3.586, light page 3.513, dark card 4.959, dark page 5.263; measured against both
     zebra stripes and both page grounds). */
  .status-chip-bounded {
    border-color: color-mix(in oklab, currentColor 55%, transparent);
  }

  /* QUIET (Task 1 ratified): no border at all, and a ground tinted off the admin theme's own
     content/base-300 tokens rather than the tone color, for a settled state that should recede
     (Published) rather than read as an object (light card 1.804, light page 1.684, dark card
     1.703, dark page 2.026 -- the only family visibly present against all four theme-ground
     cells). Depends on the admin theme's `--color-base-content`/`--color-base-300`, the same
     constraint every other admin color token carries, so it resolves only inside the admin theme
     root; the layout rules above stay context-free by design, but a recipe that leans on the
     theme palette cannot also promise a literal outside it without inventing a value the probe
     never measured. */
  .status-chip-quiet {
    border-width: 0;
    background-color: color-mix(in oklab, var(--color-base-content) 14%, var(--color-base-300));
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

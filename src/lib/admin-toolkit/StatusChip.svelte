<!--
@component
The admin toolkit's one surface allowed a semantic status color, graduated from
aksailingclub-org's `src/admin-club/toolkit/StatusChip.svelte` and re-expressed for its second
generation (the 2026-08-24 owner probe, Geoff's own ratification:
docs/internal/probes/2026-08-26-chip-registers-v2). The first generation split a `tone` prop
(the color signal, carried by a small `status` dot) from a `bounded`/`quiet` register (the shape).
The probe measured the 6px dot illegible toolkit-wide across three consumer screens and ratified
fusing tone INTO the register instead: `register` alone now carries both shape and color, `tone`
retires with the dot, and the whole chip vocabulary is three registers, no more.

Assembles from one daisyUI 5 primitive already in cairn's admin CSS build: `badge` (the pill
shape), with `badge-outline` supplying the inherited-border box model every register composes on
top of. `badge-outline` retired from cairn's own tree on its own (design infrastructure Pass 3,
corpus C): it compiles to an explicit background and border color that can match one of
AdminTable's own zebra stripe colors, so a ghost chip melts into whichever row shares that color,
and neither it nor the un-tuned `badge-outline` clears the audit's own 3:1 border-contrast floor in
both themes. `register` supplies the three ratified recipes instead: `'quiet'` (the default) tints
the ground with a low-contrast wash off the admin theme's own content token, for a settled state
(a household's Published, say) that should recede rather than compete; `'warning'` tints the same
way but off `--color-warning`, carrying its own on-surface ink, for a state that needs
attention (an unpublished-changes marker, a needs-alt notice); `'outline'` drops the fill and
demotes `badge-outline`'s full-strength inherited-text-color border to
`color-mix(in oklab, currentColor 55%, transparent)`, a hairline that clears 3:1 in both themes, for
a transient or reversible absence (the successor of the first generation's `'bounded'`). Every
tinted fill is tuned to a 1.16-1.47:1 contrast band against its own row ground (plain and zebra,
both admin themes), deliberately low: a chip that competed at the old ghost badge's strength melted
into one ground or read as a clickable button on the other, and the ratified recipe is a quiet
presence, not a bounded object. All values are measured, not invented
(docs/internal/probes/2026-08-26-chip-registers-v2, the standing proof in
status-chip-register-tuning.test.ts).

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
  /** Two named sizes, matching AdminTable's own density tier names rather than a bespoke scale. */
  export type StatusChipSize = 'xs' | 'sm';

  /** The three ratified chip registers (second generation, docs/internal/probes/
   *  2026-08-26-chip-registers-v2): `quiet`, a token-derived tinted ground for a settled state
   *  that should recede; `warning`, the same tinted-ground shape off the warning tone, for a
   *  state that needs attention; and `outline`, a demoted hairline border with no fill, for a
   *  transient or reversible absence. The register alone carries both shape and color; there is
   *  no separate tone axis and no chip-level danger tier. */
  export type StatusChipRegister = 'quiet' | 'warning' | 'outline';
</script>

<script lang="ts">
  interface Props {
    /** The chip's visible text. */
    label: string;
    /** Defaults to `'sm'`. */
    size?: StatusChipSize;
    /** Which register the chip renders in. Defaults to `'quiet'`, a settled state that recedes
     *  rather than competes; pass `'warning'` for a state that needs attention, or `'outline'`
     *  for a transient or reversible absence (a removable tag, a not-yet-confirmed suggestion).
     *  `'quiet'`'s and `'warning'`'s tinted grounds resolve only inside the admin theme root and
     *  are unguarded against a base-300-derived ground (e.g. a `.table-zebra` row-hover), where
     *  they can drop under the 1.5 ground-collision advisory floor (chip-ground-collision.ts).
     *  `'outline'`'s hairline inherits its color from the chip's own ancestor, so it can drop
     *  under the audit's 3:1 border-contrast floor inside a muted-text ancestor (verify a new
     *  call site). */
    register?: StatusChipRegister;
    /** Optional explanatory text for a tone a label alone does not fully carry (e.g. "full
     *  member benefits continue during the grace window"). Surfaces as a native tooltip and as a
     *  visually-hidden span read straight after the visible label, rather than an `aria-label` on
     *  the outer element (which some assistive technology exposes inconsistently); omit for a
     *  self-explanatory label. When omitted, the tooltip falls back to the label itself, so a
     *  chip whose label ellipsizes still surfaces its full text on hover/focus. */
    legend?: string;
  }

  let { label, size = 'sm', register = 'quiet', legend }: Props = $props();

  function classFor(value: StatusChipRegister): string {
    if (value === 'warning') return 'status-chip-warning';
    if (value === 'outline') return 'status-chip-outline';
    return 'status-chip-quiet';
  }

  const registerClass = $derived(classFor(register));
  // The size picks a daisyUI badge tier and, at xs, the floor-free width rule, so both travel
  // together rather than as two separate tests of the same prop in the class attribute.
  const sizeClass = $derived(size === 'xs' ? 'badge-xs status-chip-xs' : 'badge-sm');
</script>

<span class="badge badge-outline status-chip {registerClass} {sizeClass}" title={legend ?? label}>
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

  /* OUTLINE (second generation, docs/internal/probes/2026-08-26-chip-registers-v2): demotes
     badge-outline's full-strength `border-color: currentColor` (reads as a button, not a status
     marker) to a hairline that clears the audit's own 3:1 border-contrast floor in both themes
     (light card 3.579, light page 3.506, dark card 4.951, dark page 5.254; measured against both
     zebra stripes and both page grounds). `background-color: transparent` is stated explicitly
     rather than left to badge-outline's own default, so this recipe matches cairn-admin.css's
     shared `.cairn-chip-outline` declaration for declaration, not merely in visible effect. The
     successor of the first generation's `bounded` register (same recipe, renamed). */
  .status-chip-outline {
    font-weight: 400;
    background-color: transparent;
    border-color: color-mix(in oklab, currentColor 55%, transparent);
  }

  /* QUIET (second generation): no border at all, and a ground tinted off the admin theme's own
     content token mixed into the base-200 row ground (the same ground this recipe is tuned
     against), for a settled state that should recede (Published) rather than read as an object.
     Measured fill-vs-ground contrast, plain/zebra: light 1.389/1.297, dark 1.182/1.407, all
     inside the ratified 1.16-1.47:1 band. Depends on the admin theme's `--color-base-content`/
     `--color-base-200`/`--cairn-chip-quiet-mix`, the same constraint every other admin color
     token carries, so it resolves only inside the admin theme root; the layout rules above stay
     context-free by design, but a recipe that leans on the theme palette cannot also promise a
     literal outside it without inventing a value the probe never measured. */
  .status-chip-quiet {
    font-weight: 400;
    border-width: 0;
    /* A literal fallback, before the token-derived line: `--color-base-content`/
       `--color-base-200`/`--cairn-chip-quiet-mix` are undefined outside the admin theme root,
       which makes the color-mix line invalid at computed-value time and, per the CSS
       custom-properties cascade, reverts to the declaration immediately before it in source
       order rather than to a transparent, unbounded default. This is what keeps a misplaced
       quiet chip visibly a chip instead of visibly nothing. */
    background-color: oklch(91% 0.009 75);
    background-color: color-mix(in oklab, var(--color-base-content) var(--cairn-chip-quiet-mix), var(--color-base-200));
  }

  /* WARNING (second generation, new): the same tinted-ground shape as quiet, off `--color-warning`
     instead of `--color-base-content`, mixed into the same base-200 anchor so the two registers
     differ only by hue and mix percentage. The text ink is the already-locked `--cairn-warning-ink`
     token (measured elsewhere in cairn-admin.css against base-100 and an 8% accent tint), reused
     here rather than re-derived. Measured fill-vs-ground contrast, plain/zebra: light
     1.283/1.198, dark 1.208/1.437, inside the same 1.16-1.47:1 band; measured ink-vs-fill
     contrast: light 4.648:1, dark 7.097:1, both clearing the >= 4.5:1 text floor (WCAG 1.4.3). */
  .status-chip-warning {
    font-weight: 400;
    border-width: 0;
    /* Same literal-fallback discipline as the quiet rule above, and for the same reason. */
    background-color: oklch(87% 0.026 70);
    background-color: color-mix(in oklab, var(--color-warning) var(--cairn-chip-warning-mix), var(--color-base-200));
    color: var(--cairn-warning-ink);
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

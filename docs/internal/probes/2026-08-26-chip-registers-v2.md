# Chip registers, second generation: the engine's own tuning

The 2026-08-24 owner probe (ASC `docs/design-benchmark/decisions.md`, Geoff's own ratification)
measured the first generation's 6px `status` tone dot illegible toolkit-wide and ratified a
three-register grammar in which the register itself carries the tone, replacing the
`bounded`/`quiet` register plus five-value `tone` prop the first generation shipped (precedent:
`docs/internal/probes/2026-07-28-chip-registers`, images only, no write-up). This document is the
engine's own re-derivation for cairn's own admin themes: the probe's numbers were ASC's measured
starting points, not values this engine copies verbatim.

## The grammar

Three registers, no more: `quiet` (neutral tint, a settled state that recedes), `warning`
(warning-toned tint, a state needing attention), `outline` (hairline border, transparent fill, a
transient or reversible absence; the successor of the first generation's `bounded`). There is no
chip-level danger tier; a state that must stand out beyond quiet is a `warning` chip.

## Method

Canvas readback, the same technique every rendered `cairn-audit` rule already uses
(`src/lib/audit/rendered.ts`'s `resolveColors`): paint a resolved color string into a 1x1 canvas,
then read the pixel back with `getImageData`. `getComputedStyle` alone hands back an unresolved
`oklch()`/`color-mix()` string no string comparison or regex can read; the canvas forces the
browser to resolve it to sRGB bytes. Every measurement below ran against the real compiled
`cairn-admin.css` (`buildAdminCss()`), inside a real Chromium page (`playwright`), not a hand-typed
token mock. The standing proof lives at `src/tests/unit/status-chip-register-tuning.test.ts`, which
runs this same method as a gate: 3 registers x 2 admin themes x 2 row grounds (plain, base-100;
zebra, base-200) = 12 fill/ink/border measurements, all asserted every `npm test` run.

## The measured values

Tinted-fill contrast against its own row ground (target band 1.16-1.47:1):

| Theme | Ground | Quiet | Warning |
| --- | --- | --- | --- |
| Light | Plain (base-100) | 1.389 | 1.283 |
| Light | Zebra (base-200) | 1.297 | 1.198 |
| Dark | Plain (base-100) | 1.182 | 1.208 |
| Dark | Zebra (base-200) | 1.407 | 1.437 |

Warning ink (`--cairn-warning-ink`) against its own tinted fill (floor >= 4.5:1, WCAG 1.4.3):
light 4.648:1, dark 7.097:1.

Outline border (`color-mix(in oklab, currentColor 55%, transparent)`, unchanged recipe from the
first generation) against its own row ground (floor >= 3:1, WCAG 1.4.11): light plain 3.579, light
zebra 3.506, dark plain 4.951, dark zebra 5.254.

## The tuning

Both tinted fills mix their tone color into the `base-200` row ground itself (not `base-300`, the
first generation's anchor): the fill starts already close to in-band against a real row ground, so
the mix percentage only nudges it, rather than needing to travel from a whole different surface's
lightness. One percentage per register per theme, declared as a Tier-2 custom property beside each
theme's own tokens (`--cairn-chip-quiet-mix`, `--cairn-chip-warning-mix`) and referenced by a
SINGLE shared rule per class, so `status-chip-register-parity.test.ts`'s declaration-for-declaration
proof (one rule per class name) still holds; a light-scoped and a dark-scoped literal rule for the
same class would have broken that proof. A single percentage does not land both themes in band
(their row grounds sit at different distances from the mix anchor relative to the theme's own
palette spread), which is why the two theme roots carry different percentages:

- Light: `--cairn-chip-quiet-mix: 12%`, `--cairn-chip-warning-mix: 27%`.
- Dark: `--cairn-chip-quiet-mix: 18%`, `--cairn-chip-warning-mix: 23%`.

The warning register's ink reuses the already-locked `--cairn-warning-ink` token
(`cairn-admin.css`), tuned elsewhere in the same file as small warning text on a light surface; a
chip's warning text is exactly that case, so no new ink was derived.

## Falsifiability

Proven by hand during tuning, not merely asserted: setting `--cairn-chip-quiet-mix` in the dark
theme root to 30% (well outside the ratified band) turned the standing test's two dark `quiet`
fill assertions red, measuring 2.358:1 (plain) and 2.805:1 (zebra) against the 1.16-1.47:1 band,
while every other assertion in the file stayed green. Restoring `18%` turned the suite green
again. `status-chip-register-tuning.test.ts` also carries a small synthetic-fixture test proving
the checking functions themselves (`contrastRatio`, `relativeLuminance`) can fail against a canned
out-of-band color pair, so the falsifiability proof survives a future re-tuning that happens to
land the real values back in band by coincidence.

## The known interaction with `chip-ground-collision`

The tinted band's own upper bound (1.47:1) sits under `chip-ground-collision`'s 1.5:1 advisory
floor (`chip-ground-collision.ts:102`). Every `quiet`/`warning` chip in this generation therefore
measures as an advisory "camouflaged" finding on some row/theme pairs by design, the same tension
the first generation already carried and documented at `StatusChip.svelte:84-86` (now the
`cairn-admin.css` header comment above the three chip rules). This is not treated as a defect to
fix in this pass: `chip-ground-collision` is already advisory rather than gating
(`audit-cli-chip-ground-collision-rendered-rule`, `engine-rulings.md`), pending a chroma-aware
repair that can tell a hue-distinct low-contrast tint from a truly invisible one, and that repair
is out of this task's scope. The position is recorded here so a measured "violation" from that
rule reads as expected, not as a regression this pass introduced.

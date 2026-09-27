# Theme identity arc log (2026-09-26)

Dose (Geoff, verbatim): "my goal is not to be dramatic, but rather to make cairn more coheriently
follow it's own design ideology and not appear 100% default DasiyUI."
Scope: admin theme + starter theme as a sibling identity (own palette and faces, shared levers).
Fixed: violet primary (July arc); the emphasis ladder and accent reservation (July arc, A3).
Levers: DaisyUI theme vars, component vars, scoped @layer components overrides. No markup changes
required of a developer.

- R1 material: A today / B flat-typographic / C warm material. Verdict: **B** (depth 0, noise 0,
  radii 0.375 / 0.5 / 0.75rem, faint warm lift on btn-primary only).
- R2 components (Geoff: "All recomendations look good."): **size up** (--size-field and
  --size-selector 0.28125rem), **hairline plain button** (base-100 fill, 22% base-content edge;
  join active segment base-200), **quiet alerts** (tinted panel, 30% hairline, dark on-surface ink;
  contrast to measure). Emphasis ladder encoded in theme (btn-neutral hover ink, btn-soft
  btn-primary tint) accepted as a no-visual-change move.
- R3 system read (light+dark): kit mostly already-right; dark join active segment read as a hole,
  fixed by a base-content 7% wash in both themes (correction, not a taste call). Steps = false
  alarm (HelpHome's own styles). Geoff: "Good so far."
- R4 (Geoff: "still seems just a tad too round"): three radius sources found (theme ladder ~85
  sites; ~80 hardcoded Tailwind radii ignoring the theme; 24 rounded-full). Ladder verdict: **B
  tight, 0.25 / 0.375 / 0.5rem**, applied to every framed element incl. brand tile; true circles
  (avatar, dots, spinner) stay round; never zero.
- R4 tweaks (Geoff: "All recomendations accepted."): **chips on --radius-selector** (pill family
  retired; true circles exempt); **calmer button type** (plain/ghost 500, ink/violet 600,
  --btn-p 0.875rem); **page heading 550**; **Lucide stroke 1.75**; **concentric corners** (item
  in a padded rounded panel = panel radius minus inset).
- Final render in Firefox, light+dark (Geoff: "Looks good!"); taken as approval of the design
  and the starter plan (shared 0.25 / 0.375 / 0.5rem ladder, hairline btn-outline/badge-outline).
- Switch (Geoff: "The Notify switch looks a little ... odd"): squared knob in a box, on-state by
  position only. Verdict **C**: switch exempt from the ladder (round, like avatar/dot), checked
  track fills with the neutral ink, knob base-100.

## Rulings after the four-lens spec review (Geoff: "yes to all", 2026-09-26)

Goals added mid-review (Geoff): "anybody extending the cairn admin interface should get a
consistant look by default"; "It should also be maximally easy for agents extending cairn to
create the same look and feel."

1. Architecture: the engine stays the single compiler of admin component CSS; the theme is
   authored as real `@plugin "daisyui/theme"` blocks (`cairn-admin`, `cairn-admin-dark`); every
   daisyUI component compiles in; cairn's idiom lives in a `cairn-theme` sublayer inside
   `utilities`, after daisyUI's. A spike proves it and measures the size cost before the fold.
2. F1: the starter takes the hairline outline as a shared family trait (confirmed, no longer
   inferred); `public-design-system.md`'s never-cross-over line is amended.
3. Sequencing: spike and fold now; the pass branches after draft docs pass 0+1 merges.
4. Soft-primary hover stays tinted (`primary/15`), the July tint rung.
5. Hand-authored inline SVGs at the default 2px stroke move to 1.75; deliberately heavier
   strokes keep their values.
6. The editor's 30px document title stays at 700; the settle audit grades it.

Rename after the fold verification (2026-09-26): ruling 1's sublayer `cairn-theme` is renamed
`cairn-idiom`. "The cairn theme" already names the public opt-in identity layer
(`examples/cairn-theme/`), and the names convention gives each part one name
(`docs/internal/docs-register.md`, "Names").

- Decisions after review (Geoff, 2026-09-26, verbatim: "This again comes down to good idiom and
  architectural best-practices"): D1, the theme roots are daisyUI theme blocks with split
  ownership; D2, every daisyUI component compiles in, calendar excluded.
- Ruling 3 reversed (Geoff, 2026-09-26, verbatim: "We can hold further docs work until we've
  completed this effort."): the theme identity pass goes first and branches from `main` now. Draft
  docs pass 0+1 pauses at its next gate-green segment boundary (Geoff chose "Pause at next green
  boundary"), keeps its work on `draft-docs-0` unmerged, and resumes after this effort merges.

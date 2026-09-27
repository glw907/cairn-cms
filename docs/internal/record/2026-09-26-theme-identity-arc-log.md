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

# Admin invisible-craft polish brief (2026-07-15)

Geoff's brief, filed mid-reorganization-pass: after the current design arc lands, the admin gets a
final polish pass across all UI/UX elements, covering "the changes that a truly great designer does
that an average user can't see, but definitely feels." His framing is the rubric: users experience
these details as gut-level judgments (professional, trustworthy, fast, cheap, off) because they
operate below conscious attention. The target is the difference between a design being **correct**
and being **resolved**.

## Sequencing

1. The reorganization pass (executing now).
2. The papercuts pass (audit routing: mechanical defects, copy, layout collisions). Prerequisite
   repairs, not polish.
3. The design-refinement arc with Geoff (color, type, phone-desk composition). The arc owns the
   MATERIAL system decisions: the accent budget, the base type scale, anything that visibly changes
   the admin's look.
4. **The invisible-craft polish pass (this brief):** everything below, run against the settled
   system — **including final color and typography refinements** (Geoff, 2026-07-15: "the final
   pass can and should make final color and typography refinements without changing the overall
   look"). The boundary is perceptual: the arc changes what a viewer would notice; the polish pass
   changes what they would only feel. A polish finding that WOULD change the overall look gets
   raised, not applied.
5. The component kit encodes the resolved idiom last.

## Method notes

Two workstreams, split by how each item verifies:

- **Mechanical (gate-able):** auditable by grep, computed style, or a test; many can become standing
  gates rather than one-time fixes (the watch-item doctrine: a code condition becomes a gate).
  Examples: spacing values off the scale, missing state variants, transition durations out of band,
  missing `autocomplete`/`inputmode`, non-tabular numerals in tables, faux bold, pure-black hexes.
- **Optical (eyes-required):** needs a rendered judgment, some with Geoff (optical centering,
  padding asymmetry, rag control, shadow believability, icon optical alignment). Render-based
  review, crops per device, the visual-fidelity discipline.

The existing system already claims several items (Warm Stone oklch tokens, `--cairn-shadow` layered
elevation, theme-adaptive hairlines, the styled `::selection` and `:focus-visible`, reduced-motion
guards, check-and-tint states). The pass AUDITS those claims against the rubric rather than assuming
them; a claim the render contradicts is a finding.

## The rubric (Geoff, 2026-07-15, verbatim in substance)

### Spacing and rhythm — POLISH

- Vertical rhythm: spacing values drawn from a consistent scale (4/8px grid), never arbitrary, so
  gaps relate proportionally. [mechanical: scan for arbitrary values]
- Proximity grouping: related elements closer than unrelated ones; structure perceived without
  borders or boxes. [optical]
- Optical vs. mathematical centering: icons and text nudged off true center to look centered (the
  play-triangle-in-a-circle case). [optical]
- Padding asymmetry: more horizontal than vertical padding on buttons; extra bottom padding on text
  containers because descenders make text sit low. [optical]
- Whitespace as hierarchy: breathing room signals importance without size or color. [optical]

### Typography — ARC sets the scale; POLISH makes the final refinements (look-preserving)

- Line height tuned to line length (longer lines need more leading).
- Measure: body text at roughly 45-75 characters per line.
- Tracking: tightened slightly on large headings, loosened on all-caps and small labels (the
  eyebrow recipe already tracks; audit the rest).
- Hierarchy from weight contrast (400 vs 600), not size alone.
- Optical sizing where the face supports it.
- Real typographic characters in UI copy: curly quotes, correct dashes, proper ellipses,
  non-breaking spaces before units. [mechanical in copy strings]
- Rag control: no orphans/widows, no single word on a heading's last line (`text-wrap: balance`
  candidates). [mechanical + optical]
- Font rendering: antialiasing settings; never faux bold or italic when the real weight is not
  loaded. [mechanical: loaded weights vs used weights]
- Tabular numerals in tables and counters so digits do not jiggle. [mechanical: `font-variant-numeric`
  on the list date/count surfaces, the word count, pagination]

### Color — ARC sets the system; POLISH makes the final refinements (look-preserving)

- Near-black, not pure black; off-white grounds (Warm Stone claims this; audit for stray hexes).
- Desaturated grays tinted with the brand hue so neutrals cohere.
- Borders as slightly darker versions of the background, not generic gray.
- Text hierarchy as lightness/opacity steps of one hue, never different hues (the
  muted/subtle role layer claims this; audit usage).
- Contrast at WCAG 4.5:1 without reading as "high contrast mode".
- Hover/active states shifted a consistent perceptual step in OKLCH, not eyeballed per element.
  [mechanical: enumerate hover states, compare deltas]

### Depth and surfaces — POLISH

- Layered shadows (two or three stacked, real light falloff) rather than one blob; audit
  `--cairn-shadow`'s composition against this.
- Shadow color tinted toward the ground or brand, never pure black.
- A defined elevation logic: modals, dropdowns, cards each at a named shadow level. [mechanical:
  inventory every shadow, map to levels]
- Border-radius consistency including nested radii (inner radius = outer minus padding).
  [mechanical: radius inventory; optical: the nested cases]
- 1px inner highlights or borders separating cards from grounds below conscious notice.

### Motion and interaction — POLISH

- Easing: ease-out entrances, ease-in exits, never linear. [mechanical: transition inventory]
- Duration discipline: 150-250ms for most transitions. [mechanical]
- Choreography: slight stagger on grouped entrances.
- Hover, focus, active, and disabled states defined for EVERY interactive element; absence reads as
  cheap. [mechanical: state-variant audit per control]
- Cursor matches interactivity (pointer only on truly clickable things). [mechanical]
- Scroll behavior: momentum, snap where earned, no scroll-jacking.
- Reduced-motion respected everywhere (the guard exists; audit coverage). [mechanical]

### Feedback and perceived performance — POLISH

- Skeletons over spinners, sized to the incoming content so nothing jumps.
- Layout-shift prevention: reserved space for images and async content. [mechanical: CLS check on
  admin routes]
- Optimistic UI where the model already supports it (the upload placeholder is the exemplar).
- Debounced inputs (the preview already debounces; audit search fields).
- Press states acknowledging the click within ~100ms even when the action runs longer.

### Forms and inputs — POLISH

- 44px touch targets even when the visible element is smaller (invisible padding). [mechanical;
  the audit already measured 31-32px on the desk band]
- Persistent labels, never placeholder-only. [mechanical]
- Focus rings visible but styled, never the UA default (the palette input at 390 is a known
  offender). [mechanical]
- Errors near the field, at the right moment (on blur, not per keystroke).
- Correct input types for mobile keyboards (`inputmode`, `type`). [mechanical]
- `autocomplete` attributes so browsers fill correctly (the login email field first). [mechanical]

### Content and micro-details — POLISH

- Deliberate truncation: ellipses, fades, or line clamps, never overflow chaos (the audit's 320
  findings are the repair; this pass sets the standard).
- Empty states designed, never blank (recipes exist; audit coverage).
- Icon optical alignment with adjacent text: baseline and visual weight, not just vertical
  centering. [optical]
- Icon stroke weights and corner radii matching the typeface's character (Lucide default vs IBM
  Plex; audit the pairing). [optical]
- Shared-grid alignment so edges across unrelated components line up. [optical + mechanical]
- Text selection color (claimed), scrollbar styling, favicon quality, mobile tap-highlight color.
  [mechanical]

## Output contract

The pass opens with a two-track audit (mechanical scans + fresh-context optical review of renders),
produces a fix list ranked by perceptual leverage over effort, executes with the standard gates, and
banks the durable wins as standing gates where the trigger is machine-detectable. Candidate standing
gates: the spacing-scale scan, the state-variant audit, the transition-duration band, the
autocomplete/inputmode checks, the tabular-numeral rule on numeric surfaces.

## Filing actions (done at capture, 2026-07-15)

- This brief committed; the `cairn-admin-design-arc-queue` memory records the sequence.
- ROADMAP: the polish pass enters Next at the reorganization close (the close ritual owns the edit,
  since the executing pass's Task 6 also touches ROADMAP and a parallel main edit would conflict).
- The arc's rubric gains the Typography and Color sections above when the arc opens; the polish
  pass revisits both at the refinement level under the look-preserving constraint.

# Tidy settings: synthesis and polish brief

This is the synthesis lead's read of the three settings directions (list, presets, preview) against
the three adversarial lenses (UX and accessibility, comprehension and IA, cairn-fit and safe
defaults). It names the winner, the grafts, every blocker with its fix, the convention-set gaps, and
the open decisions for the human lead. It closes with the polish brief that drives the
frontend-design pass to the final mockup.

The inputs: the design brief and its authoritative "Settings surface and the convention set" section,
the three settings mockups, the chosen review-mode editor surface, and the admin design system. The
mockups are at:

- list: `docs/internal/design/2026-06-20-editor-copyedit-settings-list-mockup.html`
- presets: `docs/internal/design/2026-06-20-editor-copyedit-settings-presets-mockup.html`
- preview: `docs/internal/design/2026-06-20-editor-copyedit-settings-preview-mockup.html`

## Scored comparison

| Direction | UX and a11y | Comprehension and IA | cairn-fit and safe defaults | Mean |
| --------- | :---------: | :------------------: | :-------------------------: | :--: |
| **list**    | 5 | **8** | **8** | **7.0** |
| preview     | **7** | 7 | 6 | 6.7 |
| presets     | 6 | 6 | 4 | 5.3 |

Bold marks each lens's top pick. Two of three lenses rank list first; the a11y lens ranks it last,
and that split is the heart of the decision below.

## Recommended direction: list, hardened with grafts

The winner is **list** (the grouped toggle list), taken as the spine and hardened with two grafts
from preview and one from presets. The reasoning, then the tie-break.

list wins the two lenses that the brief makes central. The brief's stated audience is a non-technical
editor who must understand each convention and know which choice is safe, and its design goal is that
the safe default is the resting state. The comprehension lens scored list highest (8) because its
two-section split maps the objective/style cleavage onto two visible weights, its per-row live example
("5pm becomes 5 PM") is the best fast-scan comprehension device in the set, and its resting state asks
for zero decisions. The cairn-fit lens scored list highest (8) because a hairline-divided floating
card of rows is the shipped ConceptList and ManageEditors office grammar, so it reads as the same
admin with no new visual language, and because it never offers a one-click path into voice risk.

The a11y lens ranked list last (5), and that verdict is correct on its own terms but does not move the
decision, for two reasons. First, the a11y critic's own recommendation is not "ship preview" but "take
a spine and graft": its synthesis says to keep the winner on the shipped radiogroup and roving-tabindex
pattern and add a live region, which the polish does. Second, list's two a11y failures are authored
defects in the mockup, not properties of the direction: it marks pick-one controls with
`role="group"` + `aria-pressed` (wrong) and renders the model as an editor-editable control. Both are
corrected below by adopting the shipped recipe verbatim, and once corrected, list carries the calmest
resting state and the most honest labelled toggles of the three.

presets is out. It scores worst on cairn-fit (4) and its named house-style bundles ("Chicago-leaning",
"AP-leaning") are a critical blocker on two lenses: they assume editorial fluency the audience lacks,
and they nudge the editor to flip on a basket of voice-touching normalizations in one click, the exact
harm the brief forbids ("cairn never guesses a style preference"). Its best idea, the generated
plain-language summary line, is grafted into the winner without the bundles.

**The tie-break.** The lead's rule is that on any split, the safer-for-voice and the
clearer-for-a-non-technical-editor choice wins. Both point at list: it is the only top-ranked direction
on comprehension, and it is tied with preview as the safest for voice (neither offers a one-click voice
risk, unlike presets). The a11y split resolves to list because the winning direction must adopt the
shipped a11y patterns regardless of which spine wins, and list plus those patterns is both safer and
clearer than preview plus list's grafts would be.

### Grafts to fold into list

1. **The generated plain-language summary line (from presets).** A single always-true sentence above
   the two sections, generated from the live config: "Tidy will fix: spelling, grammar, doubled words,
   spacing, capitals, end punctuation. It leaves alone: commas, dashes, quotes, numbers, units." It
   gives a non-visual or hurried editor the entire config state in one read without scanning rows, and
   it stays truthful for any combination. Wrap it in the live region (see blocker A11Y-3) so a toggle
   updates it. Keep it subordinate to the rows, never a substitute. This is the single most valuable
   artifact across the three directions and list has no equivalent.

2. **The shared diff vocabulary for the on-state example (from preview).** Render each convention's
   live example using the review surface's diff run-highlight tokens (`.rdel` strike in error ink,
   `.radd` in positive ink) and the derived diff washes, verbatim, instead of list's bespoke
   `.eg-before`/`.eg-after`. The settings example and the review the editor later confirms then speak
   one diff language. This is the strongest cairn-cohesion idea in the set and it costs the winner
   nothing. Keep list's quiet treatment for an off style row's example so an off row reads as a
   hypothetical, not a pending edit.

3. **The honest deferred-conventions note (from preview and presets).** A short, non-interactive
   "Not here yet" note naming the two held conventions (freeform custom instructions, heading
   capitalization) with the one-line reason both can reach into voice. list omits this; naming the
   gaps plainly sets expectations and is more truthful than silence.

One graft the a11y critic proposed is **declined as a graft and folded into the spine instead**: the
section master "Turn all on / off" affordance. list already ships it as a quiet underlined text button
per section, so it is kept, wired to the live region so its result is announced, not added anew.

## Blockers, every critical and important, with the fix

The blockers split into list-specific (must fix because list is the spine) and cross-cutting (apply to
whichever direction ships, so they bind the polish too). presets-specific blockers are recorded for
completeness but are moot once presets is not the spine.

### Critical (list-specific, must fix in the polish)

- **A11Y-1 / FIT (pick-one controls use the wrong ARIA).** list marks every variant chooser and the
  model control as `role="group"` with `aria-pressed` buttons, and its own a11y annotation declares
  that to be the shipped recipe. It is not: the shipped pick-one (CairnMediaLibrary triage, and the
  design-system segmented recipe) is `role="radiogroup"` over `role="radio"` with `aria-checked` and
  roving tabindex, and the design system is explicit that a pick-one uses `aria-checked`, never
  `aria-pressed`. **Fix:** use the shipped pick-one recipe verbatim for every variant chooser
  (`role="radiogroup"`; each segment `role="radio"` + `aria-checked`; selected segment `tabindex=0`,
  the rest `-1`; ArrowLeft/Right and Home/End move and select with wraparound; the check glyph as the
  non-color cue, WCAG 1.4.1). Reuse the CairnMediaLibrary keyboard handler. Reserve `aria-pressed` for
  the standalone on/off toggles, which are already correct. Correct the mockup annotation so it does
  not enshrine the wrong pattern.

- **A11Y-2 / FIT / IA (the model is rendered as an editor-editable control).** list shows the model
  (Sonnet/Haiku) as a live editable segmented control on the editor screen. The brief frames cost as a
  developer ops decision that travels with the key; presets and preview correctly show the model
  read-only in the developer strip. The model placement is also a real open question (see Open
  decisions), but the **default fix** is to move the model into the read-only developer-tier strip as a
  stated fact, following preview's `role="img"`-with-text-alt treatment or presets' read-only pill, not
  an actionable widget. If the lead instead rules the model an editor choice, that is a deliberate brief
  change and the review-mode surface must be reconciled to match.

### Important (cross-cutting, bind whichever direction ships)

- **A11Y-3 (no live region anywhere).** Confirmed by the critic's grep: zero `aria-live` and zero
  `role="status"` in all three files, while every direction shows a running on-count and the summary
  graft mutates on every toggle. The design system's rule is that a status updating in response to user
  action lives in an always-present `role="status"` region (the EditPage needs-alt notice and the
  MediaPicker count are the precedents). **Fix:** wrap each section count and the grafted summary line
  in an always-rendered `role="status"` / `aria-live="polite"` region, so a toggle announces the new
  total ("Fixes, 5 on") and the summary re-reads. Keep the per-keystroke variant example presentational
  (`aria-hidden`), as all three already do, so the region is not chatty.

- **FIT (page heading drifts from the office recipe).** Every shipped office screen renders the `h1` at
  `text-2xl` (1.5rem) with no eyebrow above it (ConceptList line 212 confirmed:
  `text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]`). All three mockups render
  the heading at 1.875rem, and list and preview add a "Settings" eyebrow above the `h1`. **Fix:** render
  the heading as the shipped recipe exactly and drop the eyebrow above the page `h1` (the sidebar already
  marks the Settings context). A section-level eyebrow inside the page is fine; the one above the `h1` is
  not.

- **FIT (the DaisyUI `.toggle` is an un-reconciled net-new primitive).** No shipped admin component uses
  DaisyUI `.toggle`; every existing binary on/off is the check-and-tint `aria-pressed` button or a
  radio segment, and as drawn the mockup toggles are bare `aria-label` checkboxes with no `role="switch"`.
  This is the same class as the historic bare-button UA-chrome bug. **Fix (the lead's call, default
  stated):** default to rendering each convention on/off as the shipped check-and-tint button so the
  settings screen reuses the admin's existing binary-state idiom and adds no new control. If the lead
  prefers the switch look, then `.toggle` must be adopted deliberately: added as a recipe in
  `admin-design-system.md`, confirmed to compile into the scoped sheet, and given `role="switch"` with
  `aria-checked`. Do not ship an un-reconciled control.

- **FIT (list carries editable-API-key field CSS).** list includes a `.cfg-input` / `.cfg-key-row` /
  `.cfg-key-state` style block for an editable key field, contradicting the brief's rule that the key is
  a deploy-time Worker secret, not in the web UI. The rendered strip is read-only, but shipping the CSS
  invites a future implementer to wire an editable key into the editor tier. **Fix:** remove the
  editable-key field styling entirely. The key state belongs only in the read-only developer strip as a
  masked, non-editable fact, as presets and preview do.

- **IA (the on style row over-stacks and duplicates its example).** On a turned-on style row, list
  stacks row name, a generic before/after example, the variant label, the segmented control, and (for
  number style) a second variant example: four to five lines, the densest and least-ordered moment in
  the otherwise-cleanest direction, with the row example duplicating the variant example. **Fix:** when a
  style row is on, suppress the generic row example and keep only the variant label, the segmented
  control, and the chosen-variant example, so the row shows one example that reflects the editor's actual
  pick. This tightens the stack to three lines and removes the duplication.

- **IA (the "kept as written" reassurance is defined but never rendered).** list's CSS defines an
  `eg-kept` "kept as written" treatment for conventions tidy never normalizes (regional spelling), but
  no row uses it, so the brief's most reassuring cue, showing what tidy leaves alone, is absent from the
  rendered screens. **Fix:** render at least one "kept as written" example in the Fixes section (the
  brief is explicit that "colour" is never normalized) and add a one-word lead-in to the example line
  ("changes:" / "keeps:") so the before/after is unambiguous about direction. This pairs naturally with
  the summary line's "leaves alone" clause.

- **(empty-state landmark, minor lifted to important for the polish).** All three gates are well modeled:
  the config is truly absent, no teasing disabled toggles, and a spellcheck-still-works reassurance.
  list's gate is the strongest: it wraps the note in `role="region"` with an `aria-label`. **Fix:** keep
  list's gate as the canonical gate, and ensure the named-region treatment carries through, so the
  absent-config state is a named landmark.

### Important (presets-specific, moot once presets is dropped, recorded for the record)

- **The named house-style presets and the auto-Custom transition.** The Chicago/AP bundles are a
  critical cairn-fit and comprehension blocker (jargon plus one-click voice risk), and the silent
  auto-flip to Custom is a status change announced to nobody. Both vanish with the direction; the only
  survivor is the summary line, grafted with its live region.

- **Half-authored roving tabindex on preset and preview variant segments.** Both runners-up author
  `role="radio"`/`aria-checked` but omit the roving tabindex, so every segment is a tabstop. Moot for the
  losers; the winner must author the full roving model per A11Y-1.

### Minor (carry as polish notes, not gates)

- The before/after examples lean on strike-through and a faint wash for "removed"; at small sizes a
  strike can read as emphasis. Extend preview's gutter glyph (minus/plus) as the primary non-color cue
  to the inline examples, and verify every example wash clears the 3:1 non-text contrast floor on both
  theme roots.
- The committed-config path string in list's save note reads `content/.cairn/tidy.yml`; the real cairn
  committed-config directory is `src/content/.cairn/`. Either correct the path or drop the literal path
  from editor-facing copy and keep only the diffable-commit framing. Confirm with the implementer
  whether tidy config is a new file or a block in the existing site-config YAML (see Open decisions).
- The gate copy in all three leans on developer nouns ("Worker secret", "tidy.enabled") in the
  editor-facing line. Keep the plain editor sentence and move the literal tokens into a clearly-marked
  "For your developer" sub-block, matching the shipped idiom ("a developer can bring this back later").

## Convention set: gaps the agents flagged, with a keep-or-drop call

The agents were asked to flag conventions worth adding that the set misses. The brief's set is the
nine objective-plus-style conventions plus two explicitly deferred (freeform custom instructions,
heading capitalization). The findings:

- **Freeform custom instructions: KEEP DEFERRED.** The brief already defers it because it lets a user
  instruct voice changes. The agents did not contest the deferral. Surface it in the "Not here yet"
  note (graft 3) with the reason, rather than omitting it silently.
- **Heading capitalization (title vs sentence case): KEEP DEFERRED.** Same call. It rewrites the
  author's headings, which is more invasive, and the brief holds it back. Name it in the same note.
- **No new convention to add.** None of the three agents proposed a missing convention to add to the
  first set. The agents converged instead on how the existing set is presented (examples over jargon,
  category-stable off-states, the summary line), not on a coverage gap. So the set ships as specified.
- **One presentation correction, not an addition.** preview's off objective fix relabels its tag from
  "On" to a neutral "Off" via the style-convention class, visually reclassifying an objective fix as a
  style choice. The winner must keep the objective/style identity stable regardless of on/off (list
  already does this by dimming the row name only). This is a "what kind of rule is this" question that
  the tag answers and that never changes, kept separate from "is it on", which the toggle carries.

## Open decisions for the human lead

1. **Model placement and tier (the one real product fork).** The three directions disagree: list makes
   the model an editor-editable control (matching the review-mode surface, which renders an editable
   model picker), while presets and preview show it read-only in the developer strip. The brief's
   two-tier text names only `tidy.enabled` and the key as developer-owned, leaving the model an open
   seam, and lead decision 4 calls Haiku "the per-site cheaper option." The synthesis default is
   **read-only developer-tier** (cost is an ops decision that travels with the key), which means the
   review-mode mockup's editable model picker needs reconciling. The alternative is to rule the model an
   editor budget choice, in which case the settings screen keeps an editable (radiogroup) model control
   and the surfaces agree the other way. Either is coherent; they must not ship disagreeing. This is the
   one place the lead's call changes the outcome.

2. **Binary-control idiom: check-and-tint button vs DaisyUI `.toggle`.** The shipped admin has no
   `.toggle`; the safe default is the check-and-tint `aria-pressed` button. If the lead wants the switch
   affordance for a settings screen of many on/off rows, it is adoptable but must be reconciled into the
   design system first. Default: check-and-tint, no new primitive.

3. **Storage: committed YAML file vs a block in the existing site-config YAML.** The model (committed,
   GitHub-App pipeline, diffable, shared) is settled and on-architecture. The open detail is whether
   tidy config is its own file under `src/content/.cairn/` or a block in the existing site-config YAML.
   An implementer call, but it sets the save-note copy.

4. **Whether to keep a single neutral safe-default shortcut.** The comprehension critic suggested one
   neutral "Reset to safe default (typos only)" affordance near the section masters (explicitly NOT the
   named house styles), so the editor always has a one-click route back to the calm resting state.
   Low-risk and reversible; include it if the lead wants the one-click reset, leave it out to keep the
   surface to rows plus masters. Default: include it as a quiet reset, since it serves the safe-default
   posture without any voice risk.

## Polish brief

For the frontend-design pass that produces the final settings mockup.

- **Winning direction:** the grouped toggle list (`...-settings-list-mockup.html`) as the spine. Two
  sections, Fixes (objective, default on, settled weight) and Style conventions (default off, each row a
  labelled on/off control that reveals an inline variant chooser when on). Resting state is the safe
  default: Fixes on, Style off, every variant collapsed, zero decisions asked.
- **Grafts to fold in:** (1) a generated, always-true plain-language summary line above the two
  sections, in a `role="status"` region; (2) the review surface's diff tokens (`.rdel`/`.radd` + the
  derived washes) for the on-state examples, so settings and review speak one diff language, with the
  off-state example kept quiet as a hypothetical; (3) a non-interactive "Not here yet" note naming the
  two deferred conventions and why. Keep list's per-section "Turn all on/off" masters, wired to the live
  region.
- **Must-haves the polish must honor:**
  - Every pick-one (variant choosers) is the shipped recipe: `role="radiogroup"`/`role="radio"`/
    `aria-checked` with full roving tabindex and the check glyph as the non-color cue. Never
    `aria-pressed` for a pick-one. Reuse the CairnMediaLibrary keyboard handler.
  - An always-present `role="status"` live region carries each section count and the summary; a toggle
    announces the new total. Per-keystroke examples stay `aria-hidden`.
  - The model is read-only in the developer-tier strip (pending Open decision 1); the editor screen
    renders no editable secret or key field, and the editable-key CSS is removed.
  - Page heading is the office recipe exactly (`text-2xl font-bold tracking-tight`
    `font-[family-name:var(--font-display)]`), with no eyebrow above the `h1`.
  - Binary on/off uses the check-and-tint `aria-pressed` button, not an un-reconciled DaisyUI `.toggle`
    (pending Open decision 2).
  - On a turned-on style row, show one example only (the chosen variant), not the generic plus the
    variant example.
  - Render at least one "kept as written" example (regional spelling) and lead the example line with
    "changes:" / "keeps:".
  - The gate (tidy not enabled) is list's: an absent editor tier replaced by an honest,
    `role="region"`-labelled note with the read-only developer checklist and the spellcheck-still-works
    reassurance. No teasing disabled controls in the tab order.
  - Shipped Warm Stone tokens only, both theme roots, light and dark rendered. Verify any tinted example
    wash clears the 3:1 non-text contrast floor.
  - Copy in the cairn voice: plain sentences, no em dashes, no jargon in the editor-facing line; push
    developer nouns into a "For your developer" sub-block.

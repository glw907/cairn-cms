# The Assets trial coverage contract

**What this is.** The pre-registered claim perimeter for the ASC Assets trial (design spec
section 9), written before the trial starts, from the artifacts Pass 3 actually shipped
(`skills/cairn-admin-screens/`, its `references/`, and `docs/reference/admin-grammar-tokens.md`).
Every item below names something a builder had in context or could query at build time. Nothing
here is an intention, a plan-stage claim, or a future task's outcome.

**What this is for.** On a first-read FAIL, the trial classifies every tell against this
document, not against the rule inventory (spec section 9): a tell falling outside the claimed
perimeter below is a **(a) capture-gap tell**, indicting the capture's completeness. A tell
falling inside a claimed area, even where no single named rule caught the exact miss, is a
**(b) covered-but-missed tell**, and only (b) tells count against the thesis. A document that
did not exist before the trial would let every tell be excused after the fact by naming a rule
that happened not to exist; this document is what closes that loophole.

**What this is not.** It is not a summary of the whole skill, and it is not a promise that every
listed item is enforced with equal strength. Several items below are audit-backed (a failing
build cannot ship them); several are grader-checked (caught only if a done-gate run actually
happens); several are written guidance a builder must apply by judgment. The classification
below states which is which, because a (b) tell against written guidance and a (b) tell against
an audit-error rule indict different things.

---

## 1. Type roles (claimed, audit-enforced)

Seven `--cairn-type-*` roles, named in `docs/reference/admin-grammar-tokens.md` and restated in
the standard doc's component-contract pointer and the craft chapter's Tokenize section: `title`,
`heading`, `subtitle`, `body`, `meta`, `label`, `chip`. Each pairs a font size with a ruled
leading; the audit's `type-scale` rule (static, error tier) is the backstop, with five named,
counted exceptions.

**Claimed:** every font size on an admin surface resolves to one of these seven roles, or is one
of the five ratified, counted exceptions. **Not claimed:** weight, case, tracking, or font family
per role; those are stated as component recipes (the eyebrow, the wordmark, the dialog heading),
not part of the role itself.

## 2. Gap roles (claimed, audit-enforced)

Four `--cairn-gap-*` roles: `label` (a label to its control, 0.25rem), `control` (one control to
the next beside it, 0.5rem), `group` (one field to the next within a group, 1rem), `section` (one
section to the next, 1.5rem). The `gap-scale` rule (static, error tier) is the backstop.
`form-anatomy.md` states the relationship table these roles name.

**Claimed:** every margin, padding, or gap on an admin surface resolves to one of these four
roles by the relationship it expresses, not by an eyeballed value that happens to render close.
**Not claimed:** an axis-scoped variant (`gap-x-*`/`gap-y-*` role utilities do not exist yet);
`form-anatomy.md` names this gap in the grammar itself and states the literal fallback for a
two-axis grid, so a two-column form's own column gap is explicitly out of the claimed perimeter
until an axis-scoped utility ships.

## 3. Register rules (mixed enforcement)

- **One filled action per surface** (`one-filled-action`, rendered, error tier, both themes).
  Audit-enforced: a second accent fill on the same surface fails the build. The surface
  partition (topmost open layer, landmark otherwise) is audit logic, restated in the standard
  doc and both exemplars.
- **Chip passivity, the two-register split** (`StatusChip`'s `register` prop, `bounded` default
  and `quiet`). The registers themselves are audit-backed at the boundary level
  (`chip-ground-collision`, rendered, currently advisory pending its chroma repair;
  `stock-default-hazards`, static, error tier, catches `badge-ghost`). **Which register a given
  state should take is written guidance, not audit-checked**: the standard doc and both
  exemplars state the judgment ("decide by what the state is asking the reader to do, not by
  habit") but no rule can verify a builder applied it correctly to a novel state vocabulary.
- **Facet quietness** (`ListToolbar`'s filter chrome). Written guidance in the standard doc and
  the list exemplar: quiet bordered chrome at rest, an applied treatment only once a value
  departs its default, never competing with the surface's one fill. Checked by the grader
  prompt's item g, not by a static or rendered audit rule.
- **Screen anatomy, the affirmative half** ("the primary action sits in the header slot").
  Explicitly NOT audit-enforced by the 2026-07-28 ruling recorded in the design spec's
  amendments: `screen-anatomy` (rendered, advisory) checks only the negative half (one
  `PageHeader`, one `h1`, no stray fill outside the header slot or card region). The affirmative
  half is written guidance in the standard doc, both exemplars, and the grader prompt's item a.

## 4. Genre anatomy (the three exemplar genres, written guidance plus targeted audit backing)

- **List** (`references/exemplar-list.md`). Claimed anatomy: one header with the surface's one
  filled action, a toolbar carrying search, facets, and a count line (never duplicated by a
  header subtitle), a table with a named row register (subject cell bolded at `type-body`, a
  qualifier demoted to `type-meta`, column headers at `type-label`), an expand-in-place panel
  whose own actions stay unfilled, and a pagination footer sharing the toolbar's plural-aware
  item label. `screen-anatomy`'s negative half and `one-filled-action` back the header claim;
  the row register and the panel's own action weight are written guidance only.
- **Detail/slide-over** (`references/exemplar-detail.md`). Claimed anatomy: a bespoke header
  (identity, a state chip, several light `btn-ghost` verbs, no header snippet), a stack of
  `card-shell card-shadow` sections each pairing one `type-label` heading with at most one light
  verb, a divided row list per section (never a table), and dialogs each satisfying their own
  `one-filled-action` surface with the `Cancel`/`Save` pair. The exemplar also states, on its
  own authority, that `screen-anatomy`'s desk exemption reads off the render (the admin shell's
  concept-based route classification), never off the path or the screen's conceptual shape, so
  a screen living outside a registered content concept's second path segment is judged as an
  office route regardless of how "desk-like" its content is. `one-filled-action` backs the
  per-dialog claim; the card and row-list anatomy is written guidance.
- **Forms** (`references/form-anatomy.md`). Claimed anatomy: three label levels (group legend in
  the eyebrow recipe, individual field label at `type-body font-medium`, inline control-adjacent
  label per `FieldLabel`'s own recipe), the four gap roles applied by relationship, and the
  submission row as a `Cancel`/filled-`Save` pair satisfying the surface's one fill. The
  composition-width rule (a row using the inline register must be verified at the form's actual
  rendered width, not assumed safe past its own mobile breakpoint) is claimed as written
  guidance only: the file states explicitly that no audit rule samples a mid-desktop width
  against a multi-column form grid, so a miss here is a (b) tell against written guidance, never
  against a rule.

## 5. The craft chapter's named phenomena (`references/craft.md`)

Claimed by name, each already classified by its own enforcement form in the chapter:

- **Tokenize** (audit-backed): type role selection (`type-scale`), spacing role selection
  (`gap-scale`), elevation and boundary via `card-shell`/`card-shadow`
  (`stock-default-hazards`), the chip register's two-only rule (`stock-default-hazards`), the
  focus ring's shape and offset (`focus-parity`, `focus-renders`).
- **Numeric rule** (written guidance, no audit backing claimed): neutrals derived from the
  palette rather than an invented gray (`token-colors` backs the raw-value half only, not the
  derivation judgment), two font weights maximum per body-content region, tabular numerals on
  any digit sequence in a column, a recorded optical-alignment offset once made, padding
  asymmetry stated as a ratio, a multi-element row's own narrow-width breakpoint (never
  flex-shrink alone), and a table's containment wrapper staying inside its own card.
- **Before/after** (written guidance, demonstrated by paired render, no audit backing claimed):
  optical vs. mathematical centering, proximity grouping via unequal ordered gaps, the
  whole-surface assembled-vs-resolved read, narrow-width row collision and its stacked
  resolution, and the table composition recipe at narrow width (column-priority folding into a
  meta line, with the horizontal-scroll wrapper as a fallback, never the primary answer, for a
  table with foldable columns).
- **Audit rule pointer** (audit-backed by definition): motion duration and easing
  (`motion-band`), reduced-motion coverage (`reduced-motion`), hover/focus parity
  (`focus-parity`, `focus-renders`), tap target size (`touch-targets`), interactive text
  contrast (`interactive-contrast`), one filled action (`one-filled-action`), viewport overflow
  (`viewport-overflow`), chip-ground legibility (`chip-ground-collision`, advisory), boundary
  contrast (`border-contrast`, advisory, open design question), measured shape against
  precedent (`norms-bands`, advisory), and no stray fill outside the header or card region
  (`screen-anatomy`).

**Not claimed:** the chapter states its own catalogue is drawn from a private invisible-polish
catalogue this package does not ship in full; only the phenomena actually restated in
`craft.md` are in the claimed perimeter. A polish phenomenon absent from `craft.md` is a (a)
capture-gap tell by definition, since nothing in the shipped material claims it.

## 6. The extension grammar and grader prompt (claimed, process not content)

`references/extension-grammar.md` claims the eight-rung ladder and its one worked derivation
(a destination-picker) as the demonstrated process for deriving a novel composition from named
roles, the register rules, and `cairn-audit norms`, never from an invented value or a copied
rendered screen. `references/grader-prompt.md` claims its eight-item checklist (primary action
placement, one filled action, chip register, type hierarchy, spacing rhythm, composition width,
facet quietness, assembled-vs-resolved) as the coherence-read gate, run against a builder's own
six-image capture set (390/1440/interaction, both themes) before a derivation or novel
composition is declared done.

**Not claimed:** the ladder and the grader prompt cover only what a builder actually runs them
against. A build that skips the done-gate's step 3 (the grader run) on a novel composition has
not exercised this claim, and a tell on an un-graded composition is not a (b) tell against the
grader; it is process non-compliance with the done-gate below, a distinct finding from the
capture's own completeness.

## 7. The done-gate (`SKILL.md`, "The done-gate", verbatim)

A screen is done, in order, only after:

1. **The static audit passes.** `npx cairn-audit` against the routes and components touched.
2. **The rendered audit passes**, both themes, against a running dev server:
   `npx cairn-audit --rendered`.
3. **For a derivation or any composition the toolkit doesn't already cover**, the shipped grader
   prompt runs against the builder's own multi-state captures, and what it finds gets fixed.

A clean audit means the screen's vocabulary is correct, not that the screen is done. A
suppression added to reach a clean audit must be flagged in the builder's own report; an
unflagged suppression is a disguised failure, and a build that reports one is a (b) tell
against this document regardless of which underlying rule was suppressed.

## 8. Applying the (a)/(b) split

A tell classifies as **(b) covered-but-missed** only when it falls inside one of the seven
sections above, at the enforcement strength that section states (audit-backed, grader-checked,
or written-guidance-only). A tell that names a phenomenon absent from every section above
(a polish item `craft.md` never states, a genre anatomy claim neither exemplar makes, a register
rule beyond the three named in section 3) classifies as **(a) capture-gap**, and feeds the
ratchet as a candidate new rule, token, or exemplar annotation rather than counting against the
thesis. A tell on written guidance the builder never checked (skipped the done-gate's grader
step, never read the form-anatomy composition-width rule) is a process-compliance finding,
recorded alongside the (a)/(b) classification but analytically distinct from either: the capture
claimed the territory and was never consulted, which the trial log's "what each builder actually
had in context" record is what surfaces.

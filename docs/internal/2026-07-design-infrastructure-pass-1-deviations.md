# Grammar-token deviations ledger (design infrastructure Pass 1)

**What this is.** Every admin call site whose current type or spacing value matches no grammar role,
recorded as measured. It is a catalog, not a to-do list. Pass 1's contract is pixel identity, so
nothing here was changed: where a value did not match a role, the value stayed and the call site
stayed unmigrated. An entry leaves this file only when a ratified design decision resolves it, which
means either the scale grows to admit the value or the call site moves onto an existing role
deliberately, with the visual baselines regenerated to match.

Pass 2 calibrates its audit rules against this ledger, and the Pass 3 standard reads it for what the
ruled scale does not yet cover. Counts are from `src/lib/components` and `src/lib/admin-toolkit` at
commit `ddf0afbd`, matched as class tokens with word boundaries rather than as raw substrings. That
distinction is load-bearing: a naive grep for `text-base` also catches DaisyUI's `text-base-content`
and `text-base-100` color utilities and overstates that row roughly fourfold, which a first draft of
this file did.

## The ruled scale, for reference

Type, after Pass 2 admitted the heading role: title 24px, heading 18px, subtitle 15px, body 14px,
meta 13px, label 11px, chip 10px. Each carries a paired leading token.
Spacing: label 4px, control 8px, group 16px, section 24px.

## Ratified rulings (2026-07-27, Pass 2 brainstorm)

Recorded canonically in the design spec's Amendments section
(`docs/superpowers/specs/2026-07-27-cairn-design-infrastructure-design.md`, section 13).
Each type entry below now has a destination; the entries retire from this file when Pass 2's
normalization migration lands and the baselines regenerate.

- **Section 1 (12px):** no seventh step. The 120 sites resolve onto meta or label by
  relationship, per-site.
- **Section 2 (named steps):** the type roles gain a ruled leading (body 20px, title 32px,
  small roles measured in-pass) behind a `--tw-leading` override, so `text-sm` and
  `text-2xl` migrate pixel-identically. 16px and 18px resolve onto the new heading role
  below; 20px resolves or joins the exception list; 30px is a ratified exception.
- **Section 3 (one-offs):** the wordmark 22px sites and the EditPage 30px document title are
  ratified named exceptions. The 11.2px and 9.6px slips resolve onto label and chip. The
  17px and 18px one-offs resolve onto the heading role or subtitle at migration judgment.
- **New heading role:** the scale admits a seventh role between subtitle and title for
  dialog/panel headings, unifying the 16px-semibold and 18px-display-bold families. **Settled
  2026-07-28: 18px, weight 700, `--font-display` (Bricolage Grotesque), leading 28px.** The
  display-bold family wins, so its thirteen sites do not move; the 16px-semibold dialog family
  migrates onto the role and changes appearance by ruling. Evidence and reasoning are in the spec's
  section 13. `type-heading` carries size and leading only; the weight and the face stay a component
  recipe.
- **Section 4 (spacing) is not blocked and not ruled:** the audit's `gap-scale` rule targets
  off-scale literals, and named Tailwind steps resolve to the spacing scale, so these
  entries stay open vocabulary questions for Pass 3.

## Type sections 1 through 3: RESOLVED, retired 2026-07-28

Pass 2's normalization applied the ratified rulings and every type entry this file catalogued now
has a role or a ratified exception. The sections are collapsed to this note rather than kept as a
to-do list that reads as open.

What the ledger held, and where each entry went:

- **The 12px step, 119 sites** (recorded here as 120; one was prose inside a code comment). No
  seventh step was admitted. The sites resolved per-site onto `type-meta` (109) and `type-label`
  (10) by the relationship each expressed. Two rulings settled the cases a first pass split
  inconsistently: a control's own caption is meta, following `ListToolbar`, the toolkit's canonical
  segmented control; and a list-row value beside an action is meta, because a URL, slug, branch
  name, or file key is content rather than a label naming something else.
- **The named Tailwind steps, blocked on a line-height ruling.** The ruling landed: every role
  carries a paired leading token. `text-sm` (127 sites) and `text-2xl` (2) moved pixel-identically
  onto body and title, proven by comparing a full local render against a reference captured right
  after the leading landed. `text-base`, `text-lg`, `text-xl`, and `text-3xl` resolved onto the new
  heading role, onto subtitle, or onto the exception list.
- **The one-off literals.** The 11.2px and 9.6px slips resolved onto label and chip, as suspected.
  The 17px panel title joined the heading role. The three wordmark sites and the editor's document
  title became ratified exceptions with counted directives. The 18px editor prose surface became a
  fifth exception, newly ratified: the ledger had filed it as resolving onto subtitle, but reading
  the markup showed it is the editor's own canvas wrapper, whose 18px merely coincides with the
  heading role's.

Two lessons this file earned, both worth carrying:

**Counting is where this initiative keeps slipping.** Three separate miscounts, none in the row
data and all in a hand-tallied summary: the fourfold `text-base` overstatement this file's first
draft carried, the 120-versus-119 comment site, and a 19-versus-16 label tally during the
migration. The row-level work has been right every time. Trust the rows, recount the summary.

**A migration can break a surface it never touches.** Removing the last scanned `text-sm` stopped
Tailwind compiling that rule, and `src/lib/admin-fields`, a public export subpath, still used it
and had never been in the stylesheet's scan roots. It had ridden along on another directory's scan.
The fix was structural, not local: the directory joined both the scan roots and
`check:admin-css-classes`.

## 4. Spacing values with no role

The four spacing roles took the dominant value for each named relationship. The rest of the gap
distribution has no role, and unlike the type deviations these cannot be resolved by measurement
alone, because the same pixel value serves different relationships at different sites.

| Utility | Value | Count |
|---|---|---|
| `gap-3` | 12px | 72 |
| `gap-2.5` | 10px | 69 |
| `gap-1.5` | 6px | 60 |
| `gap-0.5` | 2px | 14 |

`gap-3` is the F3 scale's documented "an element that belongs to its neighbor", a fifth relationship
the ruled four do not name. The others are mostly inline icon-to-text pairs, which may be a
relationship worth naming rather than a set of deviations.

A related constraint, worth stating plainly: `gap-2` at 8px and `gap-1` at 4px carry both their role
relationship AND unrelated inline spacing. Only the sites that genuinely express the named
relationship were migrated. A blanket substitution would have been pixel-identical and semantically
wrong, and would have poisoned the vocabulary Pass 2's audit rule reads.

## 5. Structural findings

**Section rhythm is a margin, not a gap.** `--cairn-gap-section` was measured at 24px from the three
`gap-6` flex stacks, but the admin mostly expresses section separation as a margin: `mb-6` at 7
sites, `mb-10` at 3, `mb-8` at 1. The `gap-section` utility therefore has three real call sites. A
margin-role utility family, or a ruling that sections are always flex parents, would close this.

**The F3 comment's 32px zone separator has one call site.** The scale documented at the top of
`cairn-admin.css` calls 32px (`mb-8`) the separator between two zones. Measured, `mb-6` at 24px is
what the admin actually uses, 7 sites to 1. Either the doc or the surface is wrong.

**No indentation role exists.** The plan called for measured `--cairn-indent-*` roles. The only real
indent in the admin is `NavTree.svelte:139`, `margin-left: depth * 1.5rem`. ExpandableRow's panel
uses `padding: 1rem` on a full-width cell, which is padding, not indentation. One call site is below
the plan's two-site floor, so no indentation token was defined. It stays a candidate: a second
indented surface makes the role real.

**RESOLVED 2026-07-28 (Pass 2 Task 12): PageHeader's `meta` prop joins the meta role.** The line
now writes `type-meta`, so a screen mounting both `PageHeader`'s meta line and `ListToolbar`'s own
count line reads the two at the same 13px rather than the meta-named line rendering one step
larger. The same task also ported `OfficeList`'s UA-margin fix (zeroed `<h1>`/`<p>` margins, a
deliberate `mt-1`) onto `PageHeader`, which had not received it at graduation; the title-to-meta
gap tightens from a leaked ~58px to the intended 4px. Both changes move the header line on every
screen mounting `PageHeader`; the `admin-visual` baselines regenerate on CI to match.

**PageHeader adoption is complete; the filed gap closed 2026-07-28 (Pass 2 Task 12).** Every
top-level admin screen that hand-rolled header anatomy before the toolkit organization pass now
mounts `PageHeader`: `CairnTidySettings`, `HelpHome`, `ManageEditors`, `ConceptList`,
`CairnMediaLibrary`, `VocabularyAdmin`, and `NavTree` (seven call sites; an earlier survey counted
`WelcomeView` among the adopters, which a fresh grep for `<PageHeader` disproved). Five deliberate
non-adopters remain and none should migrate: `ConfirmPage` and `LoginPage` (centered auth cards,
not admin page headers), `OfficeList` (it IS a header component, `PageHeader`'s own doc calls
itself that shape generalized), `EditPage`'s `sr-only` document title (the desk route's title is
never visually rendered), and `WelcomeView` (its own header comment already documents rendering no
`PageHeader`, using `EmptyState`'s `headingLevel="h1"` as the page's only heading since there is
nothing else on the screen). A later pass should not re-open this gap.

**Destination-picker: deferred, not extracted (Pass 2 Task 12).** The plan's Step 3 assumed a
pattern to extract from the harvest finding, but exactly one implementation exists
(`aksailingclub-org`'s Move… dialog on the club-admin classes screen) and zero cairn call sites.
Extracting a primitive from a single consumer-side instance is the speculative generalization the
plan's own global constraints forbid, and this repo's graduation bar is a second consumer (the
`ExpandableRow` precedent). TRIGGER for revisiting: a second destination-picker call site appears,
either a cairn admin screen that needs one or a second ASC surface.

**`AdminTable`'s in-card empty-notice cell carries no type role, deliberately.** The recipe (Pass 2
Task 11, Finding 10) says a caller's `empty` snippet passes bare content and the table owns
centering, padding, muted color, and wrapping. Today's real call sites (`ConceptList`,
`CairnMediaLibrary`) add `type-body` to their own `<p>` anyway, and `AdminTable`'s own scoped CSS
sets no `font-size` at all, so the cell inherits `table-sm`'s size. Pinning `type-body` (14px) onto
the cell itself would move `ConceptList`'s empty state under Phase 3's pixel-identity contract, so
the register stayed unpinned rather than resolved. Left open for Task 12 or the Task 17 calibration:
either the call sites drop their own `type-body` and the cell's inherited size becomes the ruled
answer, or the cell earns a named role and the two call sites lose their redundant class.

**Two findings the norms manifest surfaced on its first generation (Pass 2 Task 13).** Neither was
fixed there; both are recorded because the manifest is the only thing that has ever seen them, and a
subagent report is not a durable home.

1. **Icons are being flexed, not sized.** Across 183 observation sites the `icon` role's `width`
   takes ten distinct values (12, 13.5, 14, 14.5, 15, 15.5, 16, 19, 20, 28) and its `height` eight
   (the same set without 14.5 and 15.5). Sub-pixel members, and width carrying two more values than
   height, are the signature of an icon squeezed by a flex container rather than sized by its own
   rule, which usually means a missing `flex-none` on an icon inside a flex row. This is a real
   craft defect at real scale, invisible to every gate and to the eye, and it is the first thing the
   manifest paid for. Fixing it moves pixels across many screens, so it wants its own task with a
   baseline regeneration, not a drive-by. Candidate for an advisory rendered rule in Task 16 (icon
   dimensions off the ruled set) once the ruled set exists.
2. **`status-chip` renders an 8px corner radius where the design system says badges take
   `--radius-field` (10px).** Task 13's `RATIFIED_NORMS` table deliberately left the chip `observed`
   rather than asserting a ratification it would then have to report as drift. The open question is
   which side is wrong: the doc's claim that `--radius-field` covers "inputs, buttons, badges", or
   the chip's own value. A one-token ruling settles it.

**`table-cell` mixes two type sizes and two leading kinds,** also from the first generation: `font-size`
spans 12 and 15px across 35 sites and `line-height` resolves to `['19px', 'normal']`. The `normal`
members are why Task 13 modeled leading as a keyword vocabulary rather than a length band. Whether a
table cell should carry a named type role at all is a Task 17 calibration question, and it is adjacent
to the empty-notice register question directly above.

## 6. Ratified rulings (2026-07-28, Pass 2 Task 16b)

Four questions the rendered audit raised against cairn's own admin, ruled by Geoff and applied to the
rules in the same task. These are recorded deviations now, not open questions: each one names a
number the audit will not re-litigate, and the first entry is a measured value that stays below a
standard's floor on purpose. Canonical record: the plan
(`docs/superpowers/plans/2026-07-27-design-infrastructure-pass-2-enforcement.md`, Task 16b).

**Ruling 1: `touch-targets` enforces 24x24, not 44x44.** Spec 6.3 set 44x44, which is WCAG 2.2's AAA
criterion 2.5.5 (Target Size Enhanced). The bar cairn can honestly claim is AA, whose own target-size
criterion is 2.5.8 (Target Size Minimum) at 24x24. At 44x44 the rule raised 138 error-tier findings
against the shipped admin: `btn-sm` runs 32px, `btn-xs` runs 24px, several toolbar controls run 30px,
and the admin's own design treats none of them as a defect. At 24x24 nearly all clear and `btn-xs`
sits exactly on the line, so its 24px measurement has to pass rather than fail. The rule also now
measures the ACTIVATION REGION rather than the painted box, which is 2.5.8's own wording: the
control's box unioned with a qualifying `::before` inset expansion, plus every label the platform
reports as activating it. That closed an error-tier false positive on the label-wrapped checkbox
(EditPage's "Hidden" toggle, FieldInput's boolean field, five more sites), where the input paints
20x20 inside a 342x34 label that toggles it.

**Ruling 2: the `--cairn-card-border` hairline is RATIFIED, and is the deviation this file records.**
Measured against real Chromium: **1.11:1 in light and 1.43:1 in dark** against the ambient beside it,
and **1.19 light / 1.20 dark** against the card's own fill. WCAG 1.4.11's non-text floor is 3:1, so
the hairline sits well under it, and it stays as designed. The quiet edge is deliberate. What the
ruling does NOT license is silence: `border-contrast` still constructs the finding, still carries the
measurement, and routes it to the report's suppressed list with the ruling printed beside it, so
every run counts what it let through. The exemption is bounded twice. It applies only where the
border is PAINTED THROUGH `--cairn-card-border` (proved in-page by substituting a sentinel for the
token and seeing which computed colors follow, never by comparing color values), and only while the
boundary still reads at 1.15 or better, just under the invariant card-fill pairing. A byte-equality
cut failed both bounds: `cairn-admin.css` declares `--color-base-300` and `--cairn-card-border` with
identical bytes in the same dark block (lines 268 and 381), so it swallowed every `border-base-300`
boundary in the dark theme, including the shell's CMS pill and the media library's clear-selection
button, under a printed reason naming a ruling that was never made about them. The norms manifest
carries the ruling too: `card`/`border-color` moved from `OPEN_DESIGN_QUESTIONS` to `RATIFIED_NORMS`
and the committed manifest reads `ratified` with no `open-question` flag.

**Ruling 3: `chip-ground-collision`'s 1.5 floor is RATIFIED.** Spec 6.3 named no number; a builder
borrowed `interactive-contrast`'s probe-derived floor, and Geoff confirmed the borrow rather than
leaving it open. The shared rationale, so neither rule re-argues it: both test "not accidentally
camouflaged", never legibility. Legibility is `border-contrast`'s separate job at WCAG 1.4.11's 3:1,
and 1.5 sits under that number and under the text floors (4.5 normal, 3.0 large) by design. The
admin's own measured collisions run 1.01 to 1.12, so the floor is not a close call in practice. The
number is load-bearing all the same: an always-opaque canvas default manufactured a 1.514 against
this exact line and took two real collisions out of the report while every other gate stayed green.

**Ruling 4: `weight-budget` measures body content with chrome excluded.** The rule's claim is
unchanged (two weights per content region); its region boundary narrows to what it was always meant
to test. All ten advisories the rendered baseline raised against the admin, five routes times two
themes and every one at exactly three weights, were toolbar, pagination, and column-header furniture
rather than a three-weight passage of prose or data. Chrome is text inside `<nav>` or
`[role="navigation"]`; `<button>`, `[role="button"]`, or `<summary>`; a `<header>` or
`[role="banner"]` that contains the heading it introduces; and `<thead>` or `[role="columnheader"]`.
Each shape is named by an HTML tag or the ARIA role that means the same thing, never by a class, so a
rewritten component stays covered where a renamed one would not. Two limits are stated rather than
papered over: a `<button>` used as a row WRAPPER takes its whole content out of the rule's reach
(CairnMediaLibrary does this; ConceptList uses an `<a>` and every weight counts), and an
`<a class="btn">` spends the budget where the `<button class="btn">` beside it does not. Both are
fixtured so neither drifts unnoticed.

**One behavior change beyond the rulings: `chip-ground-collision` stops asserting a collision it
cannot measure.** `CairnMediaLibrary` renders its usage chip as an absolutely positioned sibling of
the thumbnail `<img>`, so the rule composited the card fill behind the thumbnail and reported a
constant 1.06 error on a chip that measures 12.98 against the image it actually sits on. A painter
outside the chip's own ancestor chain now makes the ground indeterminate, which reports as an
advisory naming what it could not read. "Cannot measure this ground" is a different claim from "this
collides", and only one of them was true.

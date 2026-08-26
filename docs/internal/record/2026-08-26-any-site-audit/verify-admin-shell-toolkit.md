# Fresh-context verification: admin-shell-toolkit

Verifier did not produce the ranked verdicts. Every claim below was re-derived from `main` at
HEAD (2026-08-26): source files, `dist/components/cairn-admin.css`, the test tree, and
`docs/internal/record/2026-08-26-asc-harvest-triage.md`.

## Independent checks that reframed several items

**The packaged sheet's class inventory is reachable.** `dist/components/cairn-admin.css`
contains `.input-sm`, `.select-sm`, `.card-shell`, `.card-shadow`, and
`admin-css-safelist.ts:104` states the rule outright: "the shipped sheet's class inventory is a
de facto public API." Any consumer writing those class names inside `CairnAdminShell` gets the
engine's own rendering with no Tailwind setup, which `docs/extend/add-a-custom-admin-screen.md`
promises explicitly. This falsifies the "engine-owned, can't be reached" half of several keeps.

**Tests never import the public barrel.** `src/tests/unit/admin-toolkit-format.test.ts:9`,
`admin-toolkit-list-toolbar.test.ts`, `admin-toolkit-pagination-window.test.ts`,
`component/StatusChip.test.ts:3`, `_FieldRowHarness.svelte:8` all import
`../../lib/admin-toolkit/<module>`. Retiring any public name breaks no test. The ranking's
claim holds.

**`computeCountLine` is not consumed by `PageHeader`.** The grep hit at `PageHeader.svelte:11`
is inside the `@component` block, prose only. Zero consumers confirmed.

## Per-item

### 1-5. `formatPhone`, `FormatPhoneOptions`, `ageFromBirthdate`, `formatMoney`, `FormatMoneyOptions` — RETIRE stands

All five read as verified. `format.ts:29` names ASC's ledger columns in the doc comment;
`format.ts:123` names "a member-normalize style parse"; `format.ts:16` carves
`ageFromBirthdate` out of the file's own uniformity charter. Bodies are one `Intl` call, one
regex, and eight lines of date arithmetic. Adversarial case for keeping: the birthday-turnover
off-by-one and the never-render-raw-cents rule are genuine traps. Both are traps for a site that
stores birthdates or money, which is the developer's domain by the charter's governing boundary.
Small and domain-shaped: both failing halves.

### 6. `STATUS_CHIP_DOT_CLASS` — RETIRE stands, strengthened

`StatusChip.svelte:56-63`, five daisyUI suffixes, `danger -> status-error` the only non-obvious
entry. The doc comment argues in the future conditional ("a future legend component"), which is
speculative export by its own documentation. **New evidence for retire:** triage item 2 and the
`StatusChip` reshape (item 50) replace the 6px dot at `StatusChip.svelte:106` as the color
carrier. A public map of dot classes survives the reshape as a stale public name pointing at a
retired mechanism.

### 7. `FieldRow` — RETIRE stands

Three declarations (`display:flex; align-items:flex-end; gap:var(--cairn-gap-control,0.5rem)`),
and the component ships the measured literal `0.5rem` as its own fallback, so a consumer's
hand-roll is byte-identical. Its header states "No measured defect drove this component,"
disqualifying it against gate 2 in writing. Adversarial: `vertical-alignment-recipes.test.ts:294`
and `:312` are real measured tests, including an outside-the-theme-root case proving the
class-only form computes `display:block`. That proves the scoped `<style>` was the right
implementation, not that the export is owed; the test imports the internal path
(`_FieldRowHarness.svelte:8`) and survives the retire.

### 8-14. `computeCountLine`, `computeAppliedFilters`, `AppliedFilterPill`, `computeItemRange`, `ItemRange`, `computePageWindow`, `PageWindowItem` — RETIRE stands

`list-toolbar.ts:1-6` and `pagination-window.ts` both state the split's reason as unit-test
reach without a Svelte plugin. The evenness argument verifies: `computeFacetLabel`
(`list-toolbar.ts`, last export) is a peer pure helper deliberately NOT on the barrel. Four of
five public, none consumed. `computePageWindow` is the strongest counter and is honestly ranked
as such; page-window elision is general, but no gate clause is met (reachable, unmeasured, no
consumer). Retiring the public names leaves every internal call site and re-export
(`Pagination.svelte:24-28`, `ListToolbar.svelte:105-112`) untouched.

### 15. `WelcomeView` — KEEP stands, but one claim in the argument is overstated

The component is 10 lines composing `EmptyState` with two template strings
(`WelcomeView.svelte:14-22`). The ranking's "without this export renders nothing there" is
wrong: `EmptyState` is publicly exported on `/admin-toolkit`, so a per-route mounter hand-rolls
this in one element. Nothing here is engine-owned but copy.

It still stands, on the barrel's stated and ratified membership rule (`components/index.ts:3-5`:
"every view `CairnAdmin` can render is individually mountable here"), which is exactly the
whole-surface evenness the gate protects. `welcome` is an engine-produced view state from
`createContentRoutes`; retiring the one component that pairs with it while keeping thirteen
siblings breaks a stated contract to save ten lines. Recorded as the subsystem's weakest keep,
`absenceOfObjection` correctly flagged.

### 17. `OfficeList` — RESHAPE stands; the reshape note is incomplete

Duplication verified: `OfficeList.svelte` and `PageHeader.svelte` both render
eyebrow/`h1`/subtitle/action in a `flex flex-col gap-* sm:flex-row sm:items-start
sm:justify-between` header, and the `WATCH:` comment parking the spacing-convergence ROADMAP
entry sits in `OfficeList.svelte` itself.

**New finding the reshape note must absorb.** The two measured fixes are not symmetric.
`PageHeader.svelte` already carries the UA-margin fix (its own header credits Pass 2 Task 12 for
porting it from `OfficeList`), but it renders `{#if action}{@render action()}{/if}` bare, with no
`self-start` wrapper. `OfficeList.svelte:52` wraps the action in `<div class="self-start">`. Below
the `sm` breakpoint the header is `flex-col`, so `align-items` defaults to stretch and
`PageHeader`'s action goes full-width where `OfficeList`'s hugs. A naive "compose `PageHeader`"
collapse regresses the fix. The reshape must port `self-start` into `PageHeader` first.

Counter-argument weighed: after the collapse, the remaining card frame is
`<div class="card-shell overflow-x-auto card-shadow">`, and all three classes compile into the
packaged sheet (verified above), so it is reachable by hand. That argues retire rather than
reshape. Reshape still wins: the item's membership (a list-screen scaffold is toolkit work) is
sound, and the pass's real deliverable is the convergence plus the fix port, which retiring
would leave undone.

### 18. `formatTimestamp` — RESHAPE stands

Verified end to end. `format.ts:96` takes `sqliteDatetime` and does
`` new Date(`${sqliteDatetime.replace(' ','T')}Z`) `` — ASC's D1 storage shape in the public
signature. `CairnHistory.svelte:48-54` hand-rolls `formatVersionDate` with the identical
`{ dateStyle:'medium', timeStyle:'short', timeZone:'UTC' }` output and documents the reason: it
takes an ISO string with an offset, which this signature cannot accept. The engine's own screen
needed this formatter's behavior and could not use it. That is a shape defect, not a membership
defect; the SSR/hydration zone pin is a real any-site mechanic.

### 19. `FormatTimestampOptions` — KEEP stands

`format.ts:74-85`. `timeZone` is the load-bearing option and its `'UTC'` default was the one
deliberate contract change at graduation. Survives the item-18 reshape unchanged.

### 23-25. `SelectInputOption`, `SelectInput`, `TextInput` — KEEP does NOT stand -> RETIRE

This is the audit's highest-risk shape: family-originated (`SelectInput.svelte` header: "proven
by the aksailingclub-org club-admin scaffold"), zero engine consumers, docs-only reference, no
anonymous consumer has ever exercised them.

The keep rests on one claim: the daisyUI modifier choice is engine-owned, so a site writing
`select select-sm` by hand takes the upgrade risk cairn absorbs. **That claim is falsified by the
shipped artifact.** `.input-sm` and `.select-sm` compile into `dist/components/cairn-admin.css`,
and `admin-css-safelist.ts:104` states the sheet's class inventory is a de facto public API kept
stable for consumer markup even after cairn's own tree moves on (`badge-ghost` is the worked
precedent). The surface is legally reachable and patchable. Gate 1 fails.

Gate 2 fails too: neither header claims a measured defect, and neither carries one. The whole of
`SelectInput` beyond `FieldLabel` is `<select class="select select-sm" {name} bind:value>` with a
keyed `{#each}`; `TextInput` is one `<input class="input input-sm">`. The hand-roll is a single
element inside a `FieldLabel` that stays exported. `SelectInput`'s own header also anticipates
growth ("a date field and an image-picker are the likely next additions"), which is growth by
adjacency, not by measured need.

The ranking's "splitting the verdict between them would be incoherent" is respected: both go, and
`SelectInputOption` (which names only `SelectInput`'s `options` prop) goes with them. The field
tier reduces to `FieldLabel`, the one member carrying engine-owned CSS, which is a more even
surface, not a less even one. Migration cost is explicitly not a counter-argument before beta.

### 26. `FieldLabel` — KEEP stands

The one field primitive that meets gate 1 on evidence. `FieldLabel.svelte` emits
`cairn-field-stacked`, and `cairn-admin.css:788-792` carries it as **PINNED unlayered rule 7 of
10**: `:where([data-theme='cairn-admin'],[data-theme='cairn-admin-dark']) .cairn-field-stacked >
:where(.input,.select,.textarea)`, with the direct-child combinator called out as deliberate
(design ratchet fix A2). A site cannot author an unlayered pinned rule inside the engine's own
sheet. The wrapping-`<label>` accessible-name trap and the single-element/no-`{#if}` fix (which
prevents a register flip destroying the control and dropping focus and IME composition) are both
documented in the component and both real.

### 34. `AdminTableDensity` — KEEP stands

`AdminTable.svelte:26`. The prop-type of a kept component with eight engine consumers; a
consumer holding density in its own `$state` needs the name. The vocabulary alignment with
`StatusChipSize` is the whole-surface evenness the gate names.

### 35. `StatusChipSize` — KEEP stands

Measured distinction verified in the component's own scoped style: `.status-chip { min-width:
5rem }` and `.status-chip-xs { min-width: 0 }` (`StatusChip.svelte:157-159`). Not cosmetic.

### 36. `StatusChipRegister` — KEEP stands

The clearest gate-2 item in the subsystem. Both registers cite
`docs/internal/probes/2026-07-28-chip-registers` with per-ground contrast numbers in the source
(bounded 3.586/3.513/4.959/5.263; quiet 1.804/1.684/1.703/2.026). A consumer cannot re-derive
these without its own canvas-readback rig. Note the type widens under item 50's reshape
(warning-tint, outline); it survives.

### 37. `StatusChipTone` — KEEP stands

`StatusChip.svelte:47` plus the header's explicit statement that tone-to-standing mapping "lives
with the consumer, never inside this component." Engine ships the vocabulary, site assigns
meaning: the correct any-site shape.

### 38. `ListToolbarAction` — KEEP stands, rationale corrected

The verdict holds as the prop-type of a kept ten-consumer component. The stated rationale does
not: the one-action rule is enforced by the singular prop `primaryAction?: ListToolbarAction`
(`ListToolbar.svelte:134`), not by the type, which is a plain `{ label, onClick }`. Keep on
prop-type membership, not on the constraint claim.

### 39-40. `ListToolbarFilterOption`, `ListToolbarFilter` — KEEP stands

`list-toolbar.ts:10-70`. `ListToolbarFilter` is the type a consumer actually authors, and it
encodes the fully-controlled convention plus the promoted-vs-overflow decision. Minor correction:
`display` now carries three values (`'select' | 'segmented' | 'menu'`), not two.

### 41. `ItemLabel` — KEEP stands

In the public prop signature of both `Pagination` and `ListToolbar` (`itemLabel?: string |
ItemLabel`). The "1 households" defect is universal to count lines, not domain-shaped.

### 42. `itemNoun` — KEEP stands, weakly

Three lines, and the smallness objection that retires `formatPhone` genuinely applies. It
survives on three verified facts the phone formatter lacks: it is the runtime half of `ItemLabel`,
a type two kept components take as a prop; it resolves the polymorphic `string | ItemLabel` union
rather than the trivial ternary; and it is dogfooded (`ConceptList.svelte:211`). Domain-free.

### 43-44. `formatCivilDate`, `FormatCivilDateOptions` — KEEP stands

The subpath's model item. `format.ts:66` parses at local midnight explicitly against the
`new Date(iso)` UTC shift, dogfooded twice (`ConceptList.svelte`, `CairnMediaLibrary.svelte`), and
the `intlOptions` passthrough is exercised, not speculative. Any cairn site with a dated concept
renders exactly this cell.

### 47. `Pagination` — KEEP stands

Three engine consumers, windowing that bounds a long list's button count, and `role="status"` on
the range line so a page change announces without moving focus. The a11y detail is the kind an
anonymous consumer would not know to add. The public compute helpers behind it retire; the
component re-exports them internally from `pagination-window.js` and is unaffected.

### 48. `ExpandableRow` — KEEP stands, with the dogfooding gap recorded as a real condition

Family-originated with zero engine consumers, so the highest-risk class. It survives because the
four gotchas in its header are platform-shaped and measured, not domain-shaped: the sticky
`right:0` trigger cell against `AdminTable`'s horizontal-scroll fallback; the trigger background
following daisyUI's own `tr:nth-child(2n)` zebra parity; the panel kept as a real `<td colspan>`
because a `display:block` cell resolves width through the browser's anonymous fixup row
(recorded as verified empirically at every viewport); and `base-300` after `base-200` was
adversarially refuted as the zebra stripe's own color. Triage item 3 adds two more fixes "inside
a component whose event contract consumers cannot patch," which is gate 1 stated exactly.
Argued the other way: cairn's own admin has no expand-in-place screen, which is itself a signal a
markdown CMS may not need one. Not decisive against a generic admin-table shape, but the missing
dogfooding should be closed rather than waived.

### 49. `AdminTable` — KEEP stands

Eight engine consumers, and the shape rule is met literally: no `rows: T[]` prop, header and body
are caller-authored snippets, so it owns chrome and never a data contract. The `white-space:
nowrap` `:global()` floor plus the `overflow-x` wrapper is the measured single-line grammar.

### 50. `StatusChip` — RESHAPE stands

Both halves verified. Gate 1: the header states `badge-error`/`badge-success` do not compile into
the packaged sheet while every `status-<tone>` does, which is why the dot carries color; a
consumer writing `badge badge-success` in admin scope gets nothing. Gate 2: triage item 2 records
Geoff's 2026-08-24 owner probe ruling the 6px dot illegible toolkit-wide, and ASC's three-register
grammar surviving three consumer screens with 26 canvas-readback measurements. The dot is still at
`StatusChip.svelte:106`. A ratified measured grammar has diverged from what ships. Eleven engine
consumers, so membership is not in question.

### 51. `ListToolbar` — RESHAPE stands, strengthened

Verified mechanics: `role="radiogroup"`/`role="radio"` with `aria-checked` and the arrow/Home/End
model (`ListToolbar.svelte:326,362`), `role="status" aria-live="polite"` count line (`:483`), and
the full disclosure (`aria-expanded`/`aria-controls` at `:449-450`, Escape-with-focus-return at
`:188-205`, window `pointerdown` at `:340`). Triage item 4 records the one consumer that
hand-copied them missing all four.

**New evidence for the extraction.** The disclosure mechanics are already duplicated *inside this
one file*: the overflow disclosure (`:174-205`) and the per-facet menus (`:292-312`) each carry
their own Escape-and-return and outside-pointerdown handlers, with `:388-389` repeating the
`aria-expanded`/`aria-controls` pair. A component that implements the same pattern twice
internally is the clearest case for lifting it to a primitive.

### 55. `MarkdownEditor` — RESHAPE stands

Prop count verified: roughly thirty props, of which about twenty are `register*`/`on*` `EditPage`
wiring callbacks (`registerInsertLink`, `registerCaretCoords`, `registerImagePlaceholders`,
`registerTidy`, `registerReplaceRange`, and so on). `docs/reference/components.md:598-599` and
`:648` confirm the half-applied prior fix: the eleven stable props are tiered Extension API and
the wiring props are documented separately as Unstable API, but never collapsed. `EditPage` is the
sole caller and imports by relative path, so the collapse breaks no consumer and costs nothing
before beta. A documented seam whose reference page carries a twenty-row "expect it to move"
table is not a comprehensible seam.

## Summary

37 of 40 verdicts stand. Three do not: `SelectInput`, `TextInput`, and `SelectInputOption` move
from keep to retire, on the shipped-sheet evidence that their one engine-owned claim (the daisyUI
class inventory) is a documented public surface a consumer can write by hand. Two reshape notes
gain a required addition: `OfficeList`'s must port `self-start` into `PageHeader` before
collapsing, and `ListToolbar`'s extraction is stronger than argued because the disclosure is
already duplicated inside the component.

---

# Fresh-context verification: admin-shell-toolkit (38 items)

Verified against `main` HEAD, 2026-08-26. Every source claim below was read in the file
named, not taken from the ranking.

## Verdicts that stand as written

**1–5 (`formatPhone`, `FormatPhoneOptions`, `ageFromBirthdate`, `formatMoney`,
`FormatMoneyOptions`) — RETIRE stands.** Read `src/lib/admin-toolkit/format.ts` in full. The
provenance claims are literal, not paraphrased: `format.ts:29` names "a ledger's
`amount_total_cents`/`amount_cents` shape", the NANP regex at :123 names "a member-normalize
style parse", and the file header itself carves `ageFromBirthdate` out of its own uniformity
rule. Each body is one `Intl` call or one regex. Grep confirms zero consumers in `src/lib`,
`examples/showcase/src`, and the published doc arms; the unit test imports the internal module
path. Small and domain-shaped, both failing halves.

**6 (`STATUS_CHIP_DOT_CLASS`) — RETIRE stands.** `StatusChip.svelte:56` states the case in the
future conditional in the source itself ("Exported so a future legend component..."). Zero
consumers. Speculative export by its own documentation.

**7 (`FieldRow`) — RETIRE stands, with tension recorded.** The component is three declarations
and its own header says "No measured defect drove this component." Its one real fact (the
class-only form computes `display: block` outside the theme root) argues for the scoped
`<style>`, not for the export, and the block ships the literal `0.5rem` fallback beside the
token, which is what a consumer would write. The tension worth naming: `docs/extend/
add-a-custom-admin-screen.md:93` recommends it in prose alongside the kept field primitives, so
the retire owes that line an edit.

**8–14 (`computeCountLine`, `computeAppliedFilters`, `AppliedFilterPill`, `computeItemRange`,
`ItemRange`, `computePageWindow`, `PageWindowItem`) — RETIRE stands.** The testability rationale
is stated verbatim in both module headers (`list-toolbar.ts:1-6`, `pagination-window.ts:1-6`).
The evenness argument is confirmed at source: `computeFacetLabel` sits in `list-toolbar.ts`
beside `computeCountLine` and is deliberately absent from the barrel. Checked the one apparent
counter-example: `PageHeader.svelte:11` names `computeCountLine`, but it is a prose reference in
the `@component` block, not an import. None of the four appears in any component's prop
signature.

**15 (`WelcomeView`) — KEEP stands.** Tested the "nobody would hit this" objection and it fails:
per-route mounting is a documented, worked path (`sveltekit.md:831, 865, 1117, 1313`), and
`WelcomeData` ships as a public Extension API type (`sveltekit.md:1907`) with `'welcome'` a real
member of `AdminData`'s discriminant. A per-route mounter reaching that view has no other way to
render it. The keep rests on the barrel's stated evenness rule (`components/index.ts:3`), which
is the right basis; retiring one of fourteen view exports to save 24 lines would break a stated
contract.

**18 (`formatTimestamp`) — RESHAPE stands, and the diagnosis is stronger than stated.** The
signature is not merely SQLite-flavored, it is SQLite-only: the body appends `Z` after
`.replace(' ', 'T')`, so an ISO input already carrying `Z` or an offset produces `...ZZ`,
`NaN`, and the raw string back. The formatter cannot accept ISO at all. `CairnHistory.svelte:47`
hand-rolls the identical `Intl` call with the identical UTC pin and documents why. Membership
right, form wrong, exactly as ranked.

**19 (`FormatTimestampOptions`) — KEEP stands.** `timeZone` is the load-bearing option and
survives the reshape. Consistent with retiring `FormatMoneyOptions`/`FormatPhoneOptions`: those
ride retired functions, this one rides a reshaped one.

**17 (`OfficeList`) — RESHAPE stands, reshapeNote incomplete.** Duplication confirmed by direct
comparison: `OfficeList.svelte` and `PageHeader.svelte` share the eyebrow class string, the h1
class string, and the `flex flex-col ... sm:flex-row sm:items-start sm:justify-between` wrapper,
differing only in `mb-6`/`mb-10`, `gap-0`/`gap-0.5`, and `type-body`/`type-meta`. PageHeader's
own header calls itself "the `OfficeList` shape, generalized" and records porting OfficeList's
UA-margin fix. **Correction the note must carry:** OfficeList wraps its action in
`<div class="self-start">` and PageHeader renders the action bare, so PageHeader does *not*
carry OfficeList's second measured fix (the action stretching full-width below `sm`). Composing
PageHeader as written would regress it; PageHeader must absorb `self-start` first.
Also weighed retire, since the post-collapse residue is a `card-shell overflow-x-auto
card-shadow` div and those are reachable classes inside the theme root. Reshape survives because
OfficeList, not PageHeader, is the toolkit's one documented screen scaffold: the worked example
in `docs/extend/add-a-custom-admin-screen.md:105` and its lockstep repro story
(`src/lib/reproductions/stories/CustomScreen.svelte`) both compose it.

**23, 24 (`SelectInputOption`, `SelectInput`) — KEEP stands, on a narrower basis than ranked.**
The ranking's daisyUI-bump argument proves too much (it would justify a wrapper per admin
control, and the engine's real answer to dead classes is the `no-uncompiled-class` audit rule).
What holds the tier up is `FieldLabel` beneath it plus demonstrated reach-for: the field tier is
adopted by a second consumer (below). Splitting the pair's verdict would be incoherent, and no
defect is filed against `SelectInput`.

**26 (`FieldLabel`) — KEEP stands, and this is the strongest keep in the subpath.** Verified the
width hook at `src/lib/components/cairn-admin.css:792`: it is an **unlayered** rule keyed to
`.cairn-field-stacked`, deliberately unlayered because daisyUI's own `.input`/`.select` width
declarations sit in `@layer utilities` and cascade layers resolve before specificity. A consumer
hand-rolling `<label class="flex flex-col">` around a `.input` gets daisyUI's fixed 20rem clamp
and **cannot** outrank it from a components-layer rule. That is "cannot legally reach or patch
the surface" met head-on. The `>` combinator scoping (a direct child fills, a nested compact row
does not) is a measured refinement on top. One correction: the wrapping-label a11y trap the
ranking cites as a second reason is *documented* by the component, not fixed by it, so it is a
discoverability point and carries no weight here. The CSS hook alone is sufficient.

**34–37 (`AdminTableDensity`, `StatusChipSize`, `StatusChipRegister`, `StatusChipTone`) — KEEP
stands.** All four are in, or name the vocabulary of, a kept component's public prop signature,
which is the clean line separating them from the retired return-shape types
(`ItemRange`/`PageWindowItem`/`AppliedFilterPill`). `StatusChipSize`'s measured basis verified at
`StatusChip.svelte` (`min-width: 5rem` on `.status-chip`, `min-width: 0` on `.status-chip-xs`).
`StatusChipRegister`'s four-ground contrast numbers verified in the scoped `<style>` comments and
traced to `docs/internal/probes/2026-07-28-chip-registers`.

**38–40 (`ListToolbarAction`, `ListToolbarFilterOption`, `ListToolbarFilter`) — KEEP stands, one
evidence correction.** The types a consumer writes to mount the toolbar. Correction to item 38's
stated case: the one-action rule is enforced by the **prop** being non-array
(`primaryAction?: ListToolbarAction`), not by the type, which is a bare `{ label, onClick }`. The
keep survives on the ordinary grounds that a TypeScript consumer needs the name.

**41 (`ItemLabel`) — KEEP stands.** In the public prop signature of both `Pagination` and
`ListToolbar` (`itemLabel?: string | ItemLabel`). Verified in both files.

**43, 44 (`formatCivilDate`, `FormatCivilDateOptions`) — KEEP stands.** The distinction from the
retired formatters is real and worth stating: a hand-rolled `formatPhone` is merely tedious,
while a hand-rolled civil date is *wrong* (`new Date('2026-08-26')` parses as UTC midnight and
renders the previous day west of Greenwich). The correctness fact is not discoverable from the
symptom. Two engine consumers confirmed (`ConceptList.svelte`, `CairnMediaLibrary.svelte`), and
the `intlOptions` passthrough is dogfooded by the second.

**47, 48, 49 (`Pagination`, `ExpandableRow`, `AdminTable`) — KEEP stands.** `role="status"` on
the range line verified at `Pagination.svelte:72`. `AdminTable`'s no-`rows: T[]` shape verified
in its props. `ExpandableRow`'s four platform facts are all recorded with their empirical basis
in the component header, including the `<td colspan>`-versus-`display: block` anonymous-fixup-row
measurement. One shape residue worth filing separately: `ExpandableRow`'s header points the
reader at "Members' own `+page.svelte`", a file no anonymous consumer can open.

**50, 51 (`StatusChip`, `ListToolbar`) — RESHAPE stands.** Both trace to
`docs/internal/record/2026-08-26-asc-harvest-triage.md`, whose own gate is this audit's gate
verbatim. Item 2 records the 6px dot ruled illegible toolkit-wide by the 2026-08-24 owner probe
against ASC's three-register grammar with 26 canvas readbacks; item 4 records the one consumer
that hand-copied the four disclosure mechanics missing all four. The `badge-error` uncompiled-CSS
fact is stated in `StatusChip.svelte`'s own header and is a genuine can't-patch.

**55 (`MarkdownEditor`) — RESHAPE stands.** Counted 36 props on the interface. `components.md:598`
already splits the surface ("Extension API for its eleven stable props below; every other prop is
`EditPage` wiring, documented separately as Unstable API") with a dedicated wiring section at
:648. The docs did the tiering; the collapse never followed. `EditPage` imports by relative path
and is the only caller, so the change is internal and costs nothing.

## Verdicts that do NOT stand

**25 (`TextInput`) — KEEP does not stand. Replacement: RESHAPE.** The ranking's stated
any-site case is that the `type` narrowing to `'text' | 'search' | 'email' | 'url'` is a
strength ("slightly stronger for the `type` narrowing a filter box needs"). A recorded consumer
report says the opposite: `docs/internal/record/2026-08-21-xcathletes-pass-2-harvest.md:21` —
"**`TextInput`'s `type` prop omits `'date'`.** The prop forwards unchecked to the native input
at runtime, but the `.d.ts` narrows it to `'text' | 'search' | 'email' | 'url'`, so
`type="date"` fails `svelte-check` on a component that renders it fine. Widen the union to
include `date`, `tel`, and `number`, or type it as `string`." A second, independent consumer
reached for the export and was blocked by the exact property the keep cites as its virtue.
Membership is unaffected and in fact strengthened by the adoption; the form is wrong.
**reshapeNote:** widen the `type` union (at minimum `date`, `tel`, `number`) or type it as
`string`, per the filed xcathletes finding.

**42 (`itemNoun`) — KEEP does not stand. Replacement: RETIRE from the public barrel.** The keep
contradicts the ranking's own item 8. `computeCountLine` is retired on the reasoning that "a site
rendering its own toolbar chrome is designing its own copy anyway"; `itemNoun` is kept on the
reasoning that a site rendering its own count line outside `ListToolbar` needs the shared
selector. Those are the same scenario, and the ranking answers it both ways. If the scenario is
real, `computeCountLine` serves it strictly better (it builds the whole line, applied labels
included, and routes through `itemNoun` internally at `list-toolbar.ts`); keeping the one-ternary
helper while retiring the composite is backwards.
Tested for a distinguishing fact and found none. `itemNoun` is a function, not a type, so it is
in **no** component's prop signature — the exact line that keeps `ItemLabel`,
`ListToolbarFilter`, and `AdminTableDensity` while retiring `ItemRange`, `PageWindowItem`, and
`AppliedFilterPill`. Its documented justification is internal: `admin-toolkit.md:137` — "so the
'1 households' defect class has a single fix point", a statement about the engine's own two
components, both of which keep the function by relative import after the barrel drops it. The
body is `count === 1 ? label.one : label.many`, the smallest hand-roll in the subsystem, which
is the gate's stated fail condition. `ItemLabel` stays public so the prop stays typed.

## Subsystem note

The two flips share a shape. Both are keeps whose stated any-site case was asserted rather than
tested against the repo's own filed evidence: `itemNoun`'s against the ranking's own neighbouring
verdict, `TextInput`'s against a consumer harvest that says the cited virtue is a defect. Neither
is a membership error. Nineteen of the twenty-one keeps and all fourteen retires hold.

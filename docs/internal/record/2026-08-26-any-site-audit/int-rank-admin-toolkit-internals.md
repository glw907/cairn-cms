# Internals audit: `src/lib/admin-toolkit` (toolkit primitives and helpers)

Auditor: admin-toolkit-internals. Repo at `main` HEAD, 2026-08-26.
Scope: all 16 files under `src/lib/admin-toolkit` (2,171 lines), read in full, plus the
consumers and gates that bear on them (`src/lib/components/ConceptList.svelte`,
`CairnMediaLibrary.svelte`, `segmented-control.ts`, `scripts/build/admin-css.input.css`,
`scripts/build/build-admin-css.mjs`, `docs/reference/admin-toolkit.md`, the three unit and
eight component test files).

## State of the area

This is a well-tested, carefully reasoned directory whose *behavior* is in better shape than
almost anything an audit usually finds: `ListToolbar` alone carries 1,119 lines of component
tests covering the ARIA menu semantics, the roving tabindex, outside-click scoping by component
instance, and the stale-focus-index clamp; the pure arithmetic is split into plain `.ts` modules
so it tests without a Svelte plugin; every component is fully controlled (props + callback, no
hidden internal state) and that convention holds without exception; props are declared as
`interface Props` with per-field TSDoc and destructured once, per S1, in all twelve components.
The grade is dragged down by three things, and they are all *legibility* problems rather than
correctness ones. First, the doc blocks have become a design journal: 425 lines of `@component`
prose across twelve components, written in the vocabulary of the passes that produced them
("Members-refinement-round-1", "ruling 3 of the 2026-07-20 adoption map", "the C2
breaking-window pass, R3", "fix A2, item 2", "corpus C", a raw commit sha), including several
paragraphs that document what a *previous version of the comment* said. A new developer cannot
tell the current contract from its history, and an agent cannot tell a live rule from a
superseded one. Second, `ListToolbar.svelte` has outgrown its shape: 735 lines carrying three
different dismissal mechanisms and two different focus-management strategies, with JS reaching
into the DOM through string-built selectors that embed a scoped CSS class name. Third, the
subpath answers "how does a public component get its layout" two contradictory ways, and one of
the two is documented in-tree as measured-broken. Everything here is bounded and pre-beta cheap
to fix; nothing needs re-derivation from first principles except `ListToolbar`'s internals and
the doc blocks. Call it a B-: excellent bones, excellent tests, prose and one component that
have not been re-read by anyone who did not already know the answer.

---

## 1. `ListToolbar.svelte` carries three dismissal mechanisms and manages focus through string-built DOM selectors — rewrite

**Files:** `src/lib/admin-toolkit/ListToolbar.svelte`

A 735-line component (98 of them a header comment) implements two disclosure widgets and one
radiogroup, and each gets a different mechanism for the same three jobs.

*Dismissal / keyboard, three mechanisms:*

The overflow disclosure attaches its Escape handler imperatively inside an `$effect`:

```svelte
  $effect(() => {
    const el = overflowContainerEl;
    if (!el) return;
    el.addEventListener('keydown', onOverflowKeydown);
    return () => el.removeEventListener('keydown', onOverflowKeydown);
  });
```
(`ListToolbar.svelte:199-204`)

The facet menus use a window listener instead, with the reason recorded as "there is no stable
single ref to attach to the way `overflowContainerEl` gives the overflow disclosure"
(`ListToolbar.svelte:308-310`):

```svelte
<svelte:window onpointerdown={onWindowPointerdown} onkeydown={onFacetWindowKeydown} />
```
(`ListToolbar.svelte:340`)

And the facet menu's own arrow keys ride a declarative `onkeydown` on each option
(`ListToolbar.svelte:418`), while the segmented group rides a third declarative one
(`ListToolbar.svelte:367`).

*Focus management, two strategies.* The overflow disclosure holds real refs
(`bind:this={overflowTriggerEl}`, `ListToolbar.svelte:451`). The facets look themselves up by
serializing an id into a selector string — three times — one of which also hardcodes a scoped
CSS class name as a JS coupling point:

```js
      document
        .querySelector<HTMLButtonElement>(`[data-facet-id="${uid}-${id}"] .toolkit-toolbar-facet-menu button`)
        ?.focus();
```
(`ListToolbar.svelte:276-278`; the sibling lookups are `:214` and `:286-288`)

Renaming `.toolkit-toolbar-facet-menu` in the `<style>` block silently breaks open-focus with no
type error and no failing compile. `onFacetMenuKeydown` and `onSegmentedKeydown` each re-derive
their sibling list by `closest()` + `querySelectorAll()` at keydown time
(`ListToolbar.svelte:254-256`, `:324-326`), which is defensible in isolation but is the third
distinct way this one file answers "find the related elements".

Svelte 5.29 shipped attachments (`{@attach}`), which are the framework's own answer to "run
imperative setup against this element, with cleanup, keyed to the element's lifetime" — exactly
the `$effect` + `addEventListener` shape above and exactly the per-`{#each}`-item ref problem
the facets solved with `document.querySelector`. The repo pins `svelte: ^5.56.10`
(`package.json:193`) and uses attachments **zero** times anywhere in `src/lib`.

The extensibility cost is the real one: an agent asked to add a fourth `display` mode must read
all 735 lines and reverse-engineer which of the three keyboard mechanisms and which of the two
focus strategies its new mode should copy. Nothing in the file tells it, and the header comment
argues for each choice locally, so all three read as deliberate.

**Remediation.** Split each display into its own component (`ToolbarFacet.svelte`,
`ToolbarSegmented.svelte`), each owning its trigger, panel, keyboard model, and scoped style,
leaving `ListToolbar.svelte` as the band layout plus the count line. Give the file one
dismissal idiom: a `dismissable(onClose)` attachment applied with `{@attach}` to each
disclosure's container, replacing the `$effect`, the window listeners, and all three
`document.querySelector` lookups (an attachment receives the element, so a facet inside an
`{#each}` gets a real ref without a serialized id). Delete `data-facet-id` and the
class-name-in-a-selector coupling with them.

---

## 2. Every doc block is written for the pass that wrote it, not for the next reader — rewrite

**Files:** all twelve `.svelte` files, plus `list-toolbar.ts` and `pagination-window.ts`

425 lines of `@component` prose across twelve components (98 on `ListToolbar`, 64 on
`ExpandableRow`, 42 on `StatusChip`, 41 on `PageHeader`, 36 on `FieldLabel`, 32 on `FieldRow` —
the last two being 55% of their own files). The svelte-conventions two-homes rule gives
`@component` purpose plus contract plus failure mode. These carry provenance, pass numbers,
ruling numbers, refuted alternatives, and audit round names instead.

Vocabulary a new developer cannot resolve, quoted verbatim:

- "Members-refinement-round-1 retired it" (`ListToolbar.svelte:22`); "the C2 coherence-round fix"
  (`:27`); "the admin-toolkit organization pass's T6 absorption" (`:48`); "the
  refuter-verified recipe" (`:494`).
- "**Three visual fixes carried at graduation (the Members-refinement round-1 audit,
  adversarially verified against zebra stripes in both themes):**" (`ExpandableRow.svelte:45-46`)
- "it retired from cairn's own tree (design infrastructure Pass 3, corpus C)"
  (`StatusChip.svelte:15-16`); "The directory joined those roots in `c21ac3b8`"
  (`StatusChip.svelte:32`) — a raw commit sha in a component's public doc block.
- "The office-list primitive (Part C item 2 of the phase-2 design suite)" (`OfficeList.svelte:3`)
- "ruling 3 of the 2026-07-20 admin-toolkit organization pass's adoption map"
  (`PageHeader.svelte:3-4`); "Pass 2 Task 12 ported `OfficeList`'s own UA-margin fix here"
  (`:18`); "ruling 2 of the ... adoption map" (`EmptyState.svelte:3`).
- "the finding-3 defect" (`FieldLabel.svelte:7`); "ONE label element, never a two-branch {#if}
  (fix A2, item 2)" (`FieldLabel.svelte:57`); "merged from the retired `admin-fields` subpath,
  C2 breaking-window pass, R3" (`SelectInput.svelte:4-5`, `TextInput.svelte:4-5`,
  `FieldLabel.svelte:13-14`, `index.ts:4-5`).

Worse than unresolvable jargon: three blocks document what an *earlier version of the comment*
said, so the reader has to parse a diff to find the live rule.

```
A scan-scope note this comment used to state the other way round: `src/lib/admin-toolkit` is
INSIDE `scripts/build/admin-css.input.css`'s `@source` roots ... It was outside when this
component was minted on 2026-07-20, and joined the roots a day later in `c21ac3b8`
```
(`PageHeader.svelte:32-36`)

```
See the scan-scope note on `PageHeader` for why an older version of this comment framed that as
a compile constraint: `src/lib/admin-toolkit` is inside the `@source` roots now
```
(`EmptyState.svelte:26-28`)

```
That was a hard constraint when this component was written ... The scoped rules stay because
they are settled, and the constraint still binds a CONSUMER's own admin screen
```
(`StatusChip.svelte:29-33`)

And one component's block leads with the fact that nothing prompted it:

```
No measured defect drove this component. The 2026-08 vertical-alignment inventory measured the
admin's rendered rows and found no misaligned field row to fix
```
(`FieldRow.svelte:21-23`)

None of this is *wrong*; it is filed in the wrong place. It belongs in `docs/HISTORY.md` and the
per-pass post-mortems, which is exactly the split CLAUDE.md's project-ledger rule already
mandates for STATUS.

**Remediation.** Rewrite every `@component` block to purpose, contract, and failure mode, with
no pass name, ruling number, audit round, commit sha, refuted-alternative narrative, or
description of a prior version of the comment. Target roughly 10-20 lines each. Where a rejected
alternative is genuinely load-bearing (the `<td colspan>`-not-`display:block` reasoning at
`ExpandableRow.svelte:35-43`, the daisyUI `width: clamp()` root cause at
`ListToolbar.svelte:532-544`) keep the *mechanism* and drop the provenance. Move the rest to
`docs/HISTORY.md`. Add the "no pass vocabulary in a doc comment" rule to
`docs/internal/code-idioms.md` so it is a standing dimension rather than a one-time sweep.

---

## 3. One public subpath, two contradictory answers to "how does a component get its layout", one of them documented in-tree as measured-broken — refactor

**Files:** `FieldRow.svelte`, `FieldLabel.svelte`, `PageHeader.svelte`, `EmptyState.svelte`,
`OfficeList.svelte`, `StatusChip.svelte`, `Pagination.svelte`, `ListToolbar.svelte`

`FieldRow` states the rule, with measurement:

```
The three layout declarations live in the scoped `<style>` below rather than in Tailwind classes
... This component ships on a public subpath, so a consumer can mount it outside the admin theme
root, and none of the three classes survives out there: the compiled sheet scopes every rule
under a theme root ... Measured, the class-only form computed `display: block` outside the root,
so the whole contract this component exists for was gone with nothing to see in the markup.
```
(`FieldRow.svelte:25-31`)

The build confirms the mechanism: `const SCOPE = ":where([data-theme='cairn-admin'],
[data-theme='cairn-admin-dark'])"` and "scopes every rule under the admin theme roots"
(`scripts/build/build-admin-css.mjs:19,54`).

Four siblings on the same public subpath do the opposite, with layout carried entirely by
utility classes that the shipped sheet scopes away:

```svelte
  let labelClass = $derived(
    inline ? 'flex items-center gap-1.5 type-body' : 'flex flex-col gap-label cairn-field-stacked'
  );
```
(`FieldLabel.svelte:51-53` — `flex flex-col` is precisely the "class-only form computed
`display: block` outside the root" case `FieldRow` measured, and `gap-label` is a cairn-only
`@utility` a consumer's own Tailwind never defines)

```svelte
<header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
```
(`OfficeList.svelte:37`; identically `PageHeader.svelte:63`)

```svelte
<div class="flex min-h-[56vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
```
(`EmptyState.svelte:57`)

Compounding it, three components still carry the *superseded* version of the rationale as a live
constraint — "an unverified Tailwind utility string never reaches an `/admin/**` route"
(`ListToolbar.svelte:78-79`), "since `/admin/**` routes load only the precompiled bundle"
(`Pagination.svelte:14-15`), "That was a hard constraint when this component was written"
(`StatusChip.svelte:29`) — while `PageHeader.svelte:32-36` and `EmptyState.svelte:26-28` say the
constraint was lifted. Five components, three different accounts of one build fact.

**Remediation.** Ratify one rule for the subpath and write it once, in `index.ts`'s module
header, with every component's block deferring to it. The rule `FieldRow` measured is the right
one: a public-subpath component's *layout and spacing* live in its scoped `<style>` with literal
`var(--token, fallback)` pairs, while daisyUI *component* classes (`btn`, `input`, `select`,
`badge`, `table`, `join`) stay, since they ride the compiled sheet by design. Convert
`FieldLabel`, `PageHeader`, `EmptyState`, and `OfficeList` to scoped layout CSS. Delete the
three stale compile-constraint paragraphs. Ideally add the rule to
`docs/internal/code-idioms.md` and a check to `cairn-audit` so the next component cannot pick
the wrong one silently.

---

## 4. `PageHeader` and `OfficeList` duplicate the same header markup with divergent values and divergent prop names, and a `WATCH` comment stands in for the fix — refactor

**Files:** `PageHeader.svelte`, `OfficeList.svelte`

`OfficeList.svelte:37-54` and `PageHeader.svelte:63-72` are the same markup, drifted:

```svelte
<header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div class="flex flex-col gap-0">
    ...
    <h1 class="m-0 type-title font-bold font-[family-name:var(--font-display)]">{title}</h1>
    {#if subtitle}<p class="m-0 mt-1 type-body text-muted">{subtitle}</p>{/if}
```
(`OfficeList.svelte:37-47`)

```svelte
<header class="mb-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div class="flex flex-col gap-0.5">
    ...
    <h1 class="page-h1 m-0 type-title font-bold font-[family-name:var(--font-display)]">{title}</h1>
    {#if meta}<p class="m-0 mt-1 type-meta text-muted">{meta}</p>{/if}
```
(`PageHeader.svelte:63-69`)

Four divergences in copied markup: `mb-6`/`mb-10`, `gap-0`/`gap-0.5`, `type-body`/`type-meta`
for the same line, and `text-wrap: balance` on one `h1` but not the other. The same prop is
called `subtitle` on one and `meta` on the other. The UA-margin explanation is copy-pasted into
both (`OfficeList.svelte:42-45`, `PageHeader.svelte:18-22`), and `PageHeader`'s block records
that the fix had to be *ported* between the copies — the classic duplication tell.

The divergence is known and filed rather than fixed:

```svelte
<!-- WATCH: the ROADMAP spacing-convergence entry between this component and PageHeader stays filed
     and untouched here; it needs the visual gate, not a naming or subpath pass. -->
```
(`OfficeList.svelte:14-15`)

`OfficeList`'s block also spends three lines defending against exactly this reading: "`PageHeader`
and this component both stay; they cover different shapes (a header primitive versus a full
list-screen scaffold), never a duplicate" (`OfficeList.svelte:11-12`). The distinction is real —
`OfficeList` adds the card shell — but it argues for composition, not for a second copy of the
header.

**Remediation.** Make `OfficeList` mount `PageHeader` and render only the card shell around
`children`, forwarding `eyebrow`/`title`/`action` and mapping its `subtitle` onto `meta` (or
rename `subtitle` to `meta`, since churn is free pre-beta and one name per concept is the
point). The four spacing divergences then become one deliberate prop or one ratified value, and
the `WATCH` comment resolves rather than persisting.

---

## 5. The "is this filter applied" predicate has four independent copies, and `AppliedFilterPill` names a UI that was deleted — refactor

**Files:** `list-toolbar.ts`, `ListToolbar.svelte`

`filter.defaultValue ?? 'all'` and the "find the matching option, fall back to the raw value"
pair are re-derived in four places:

```js
    const defaultValue = filter.defaultValue ?? 'all';
    if (filter.value === defaultValue) continue;
    const option = filter.options.find((candidate) => candidate.value === filter.value);
```
(`list-toolbar.ts:87-89`)

```js
  const defaultValue = filter.defaultValue ?? 'all';
  if (filter.value === defaultValue) return filter.label;
  const option = filter.options.find((candidate) => candidate.value === filter.value);
```
(`list-toolbar.ts:118-120`)

```svelte
        {@const applied = filter.value !== (filter.defaultValue ?? 'all')}
```
(`ListToolbar.svelte:375` — the copy that drives the applied *styling* and the clear button's
presence)

```js
  function clearFacet(filter: ListToolbarFilter) {
    filter.onChange(filter.defaultValue ?? 'all');
  }
```
(`ListToolbar.svelte:304-306`)

Changing the default sentinel from `'all'`, or the fallback rule, requires finding all four. The
`.ts` module is the obvious home and already holds two of them.

Separately, the exported vocabulary names a retired feature. The component's own header records
the deletion — "there is no longer a separate applied-pills row (Members-refinement-round-1
retired it)" (`ListToolbar.svelte:22-23`) — and a test asserts it: `it('never renders a separate
applied-filter pills row, applied or not (the pills row retired)')`
(`src/tests/component/ListToolbar.test.ts:155`). Yet `AppliedFilterPill` is public API
(`index.ts:46`), documented as "One rendered applied-filter pill"
(`docs/reference/admin-toolkit.md:852`), and the only consumer immediately throws the shape away
to get labels:

```js
  const countLine = $derived(
    computeCountLine(count, itemLabel, appliedPills.map((pill) => pill.label)),
  );
```
(`ListToolbar.svelte:162-164`)

**Remediation.** Add `resolveFilterDefault(filter)` and `isFilterApplied(filter)` to
`list-toolbar.ts` and route all four sites through them. Rename `AppliedFilterPill` →
`AppliedFilterSummary` (or return `string[]` and delete the type), rename the local
`appliedPills`, and update `docs/reference/admin-toolkit.md` in the same pass. Pre-beta churn is
free; a public type named after deleted UI is a standing agent trap.

---

## 6. The `<script module>` re-export chain is dead indirection resting on a contract no consumer can hold — refactor

**Files:** `Pagination.svelte`, `ListToolbar.svelte`, `pagination-window.ts`, `list-toolbar.ts`,
`index.ts`

Both `.ts` helper modules justify their existence with a contract that does not exist:

```
Pagination.svelte re-exports both from its own module context, preserving the "exported from
module context" contract a consumer imports against.
```
(`pagination-window.ts:4-6`; near-verbatim at `list-toolbar.ts:4-6`)

The pure functions therefore make three hops: `list-toolbar.ts` → `ListToolbar.svelte`'s
`<script module>` (`:100-112`) → `index.ts` (`:42-50`). But `package.json:98-101` exposes only
the `./admin-toolkit` subpath, so no consumer can reach `ListToolbar.svelte` to hold that
contract, and grep confirms nothing in the repo does either: both unit tests import the `.ts`
modules directly (`src/tests/unit/admin-toolkit-list-toolbar.test.ts:2`), and the only
`.svelte`-path imports anywhere are the component tests importing the default export
(`src/tests/component/ListToolbar.test.ts:5`).

The chain also leaks. `computeFacetLabel` is re-exported from the component's module context
(`ListToolbar.svelte:111`) but is absent from `index.ts` and from
`docs/reference/admin-toolkit.md` — a public-component export reachable by nobody, which
`check:reference` cannot see because it only reads the barrel.

**Remediation.** Point `index.ts` at `./pagination-window.js` and `./list-toolbar.js` for the
pure exports, delete both `<script module>` re-export blocks, and rewrite the two `.ts` header
paragraphs to state the real reason (Node-runnable unit tests, no Svelte plugin). Then decide
`computeFacetLabel` deliberately: export it from the barrel and document it, or make it
module-private. `StatusChip.svelte`'s module block genuinely needs to stay, since
`STATUS_CHIP_DOT_CLASS` is consumed by the component's own template (`:106`).

---

## 7. The toolkit has no standalone segmented control, so four engine screens hand-roll a differently-styled one — refactor

**Files:** `ListToolbar.svelte`, and the consumers it failed to absorb

`ListToolbar` owns a full ARIA radiogroup segmented control, and its header claims the
absorption is complete: "ConceptList's and MediaLibrary's own pre-toolbar segmented controls each
independently carried this pattern, and MediaLibrary's carried the fuller implementation, so it
is the one graduated here rather than forked twice more" (`ListToolbar.svelte:48-50`). But the
implementation is only reachable as a *filter* — `ListToolbarFilter` requires `id`, `label`,
`options`, `value`, `onChange` and renders inside the band. Anything that is a segmented control
but not a filter cannot use it.

So `src/lib/components/segmented-control.ts` still exists as a parallel home, with four live
consumers (`CairnMediaLibrary.svelte`, `CairnTidySettings.svelte`, `TidyReview.svelte`,
`EditPage.svelte`), each hand-rolling its own markup around a shared tint fragment:

```js
  function densityButtonClass(on: boolean): string {
    return `inline-flex items-center justify-center rounded-md p-1.5 hover:bg-base-content/[0.06] ${segmentTintClass(on)}`;
  }
```
(`src/lib/components/CairnMediaLibrary.svelte:1401-1403`)

The two render *differently*: the toolkit's segment is `join-item btn btn-sm` + `btn-active`
(`ListToolbar.svelte:363`), while `segmentTintClass` returns `bg-base-content/[0.07]
text-base-content font-semibold ring-1 ring-inset ring-base-content/20`
(`segmented-control.ts:17-19`). MediaLibrary renders both, inches apart in the same band — its
triage filter through `ListToolbar` (`:178-181`), its density toggle hand-rolled through the
`trailing` snippet. The `trailing` prop is the escape hatch that let this stand: "for a
screen-specific view control this component has no vocabulary for (a grid/list density toggle)"
(`ListToolbar.svelte:43-45`).

Per CLAUDE.md's engine-mechanics rule, four local copies of one control is the loudest possible
"wrong altitude" signal, and it is a *mechanic* (how a pick-one control announces itself and
marks its active segment), not a per-screen design choice.

**Remediation.** Extract the segmented display from `ListToolbar` into a
`SegmentedControl.svelte` toolkit primitive (`options`, `value`, `onChange`, `label`, `size`),
let `ListToolbar` mount it for `display: 'segmented'`, and migrate the four `segmentTintClass`
call sites onto it. Ratify one active-segment treatment between `btn-active` and the tint-plus-ring
recipe (a visual-gate call, per the family's visual rules), then retire
`src/lib/components/segmented-control.ts`.

---

## 8. `register` names two unrelated vocabularies in one subpath, and the field one is the only vocabulary with no exported type — refactor

**Files:** `FieldLabel.svelte`, `TextInput.svelte`, `SelectInput.svelte`, `StatusChip.svelte`,
`index.ts`

One import site can pull in two different `register` props meaning different things:

```ts
    /** Which register the chip renders in. Defaults to `'bounded'` ... */
    register?: StatusChipRegister;   // 'bounded' | 'quiet' — visual weight
```
(`StatusChip.svelte:79-87`, type at `:55`)

```ts
    register?: 'inline' | 'stacked';  // label layout
```
(`FieldLabel.svelte:45`, repeated verbatim at `TextInput.svelte:25` and `SelectInput.svelte:33`)

Every other closed vocabulary in the toolkit is a named, exported type — `StatusChipTone`,
`StatusChipSize`, `StatusChipRegister` (`StatusChip.svelte:46,49,55`), `AdminTableDensity`
(`AdminTable.svelte:27`), `EmptyStateHeadingLevel` (`EmptyState.svelte:33`). The field register
is the one exception, inlined three times, so a consumer writing a wrapper component cannot name
the type it must forward.

And `SelectInputOption` is the only exported type in the whole toolkit declared in an *instance*
script rather than `<script module>`:

```svelte
<script lang="ts">
  import FieldLabel from './FieldLabel.svelte';

  /** One selectable option: the submitted value and its visible text. */
  export interface SelectInputOption {
```
(`SelectInput.svelte:14-18`)

It compiles, but it is the sole outlier repo-wide, so an agent adding a type to a toolkit
component finds two contradictory precedents and no rule.

**Remediation.** Export `FieldLabelRegister = 'inline' | 'stacked'` from `FieldLabel.svelte`'s
`<script module>`, use it in all three components, and add it to the barrel. Rename one of the
two `register` props — `StatusChip`'s `weight`/`emphasis`, or the field one `labelLayout` — so
the subpath carries one meaning per name. Move `SelectInputOption` into a `<script module>`
block, and add "an exported type lives in `<script module>`" to the S-series in
`docs/internal/code-idioms.md`.

---

## 9. The toolkit reaches into `../components/` for its icons and mark, neither of which is exported or documented — note

**Files:** `EmptyState.svelte`, `ListToolbar.svelte`

The subpath has exactly two outward dependencies, and both point at unexported internals of a
sibling subpath:

```svelte
  import CairnLogo from '../components/CairnLogo.svelte';
```
(`EmptyState.svelte:38`)

```svelte
  import { CheckIcon, SearchIcon } from '../components/admin-icons.js';
```
(`ListToolbar.svelte:117`)

Neither `CairnLogo` nor `admin-icons` appears in `src/lib/components/index.ts` or in
`docs/reference/components.md`. For cairn's own build this is harmless. For the consumer the
subpath exists to serve, it is a gap with a visible consequence: `EmptyState`'s `icon` snippet
and `ListToolbar`'s `trailing` snippet both invite a caller to supply a control, and there is no
public way to get an icon that matches the ones the toolkit uses one line away. The natural
result is hand-rolled inline SVG at every consumer call site — the same divergence finding 7
describes for segmented controls, one step earlier.

**Remediation.** Decide the seam deliberately. Either export the admin icon set on a public
subpath and document it (so a consumer's `icon` snippet can match), or state in `index.ts`'s
header that a consumer supplies its own icons and that the toolkit's internal icon imports are
private. Either answer is fine; leaving it undecided is what forces every consumer to guess.

---

## 10. Local idiom drift: `let` for `$derived`, inline class ternaries beside derived ones, an unguarded index beside an optional-chained one, two class-prefix defectors — note

**Files:** `FieldLabel.svelte`, `StatusChip.svelte`, `ListToolbar.svelte`, `PageHeader.svelte`

Four small inconsistencies, each individually trivial, together the difference between a
directory an agent can pattern-match and one it must read.

*`let` vs `const` for a `$derived`.* Every other component binds derived values with `const`
(`Pagination.svelte:61-65`, `AdminTable.svelte:56`, `StatusChip.svelte:98-99`,
`ListToolbar.svelte:159-164`). `FieldLabel` alone uses `let` for three non-reassigned deriveds:

```js
  let inline = $derived(register === 'inline');
  let labelClass = $derived(...);
  let textClass = $derived(inline ? 'text-muted' : 'type-body font-medium');
```
(`FieldLabel.svelte:50-54`)

*Derived class strings beside inline ternaries, in one element.* `StatusChip` derives two class
fragments (`:98-99`) then computes two more inline in the same attribute:

```svelte
  class="badge badge-outline {size === 'xs' ? 'badge-xs' : 'badge-sm'} status-chip {registerClass} {size === 'xs' ? 'status-chip-xs' : ''}"
```
(`StatusChip.svelte:103` — `size === 'xs'` is evaluated twice inline while `dotSizeClass`,
derived from the same test, sits unused two lines below)

*An unguarded index beside an optional-chained one, on adjacent lines.*

```js
    filter.onChange(filter.options[next].value);
    radios[next]?.focus();
```
(`ListToolbar.svelte:335-336` — the same `next` is trusted on one line and doubted on the next;
the identical pattern in `onFacetMenuKeydown` optional-chains at `:265`)

*Two defectors from the `toolkit-` scoped-class prefix.* Eleven scoped classes follow it
(`toolkit-toolbar-*`, `toolkit-pagination-*`, `toolkit-admin-table-*`,
`toolkit-expandable-row-*`, `toolkit-field-row`); `StatusChip` uses `status-chip*`
(`StatusChip.svelte:115-166`) and `PageHeader` uses the bare, collision-shaped `page-h1`
(`PageHeader.svelte:68,78`). Scoping makes collisions moot, but greppability is the point of a
prefix.

**Remediation.** `const` for every `$derived`. Hoist the two inline `size === 'xs'` ternaries in
`StatusChip` into deriveds beside the two that already exist, and use `dotSizeClass`
consistently. Pick one guarding style for the keyboard index (optional-chain both, since the
handlers already tolerate a miss). Rename `status-chip*` → `toolkit-status-chip*` and `page-h1`
→ `toolkit-page-header-title`, and record the `toolkit-` prefix rule in
`docs/internal/code-idioms.md` beside N5, which today covers ids but not classes.

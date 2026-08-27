# Internals audit: admin shell, nav, dialogs, shared component primitives

Area: `src/lib/components/` — `CairnAdminShell.svelte`, `CairnAdmin.svelte`, `NavTree.svelte`, the
dialog family (`DeleteDialog`, `RenameDialog`, `WebLinkDialog`, `MarkdownHelpDialog`,
`ShortcutsDialog`, `EntryPicker`, `ComponentInsertDialog`), the field arms (`FieldInput`,
`ObjectGroupField`, `RepeatableField`, `ReferenceField`, `IconPicker`), the media surfaces
(`MediaHeroField`, `MediaInsertPopover`, `MediaPicker`, `MediaCaptureCard`, `MediaFigureControl`),
and the extracted primitive modules (`segmented-control.ts`, `typed-confirm.ts`, `dialog-origin.ts`,
`client-action.ts`, `csrf-context.ts`, `media-base-context.ts`, `topbar-context.ts`,
`admin-icons.ts`, `admin-nav-icons.ts`, `chrome-guard.ts`, `cairn-favicon.ts`,
`admin-css-safelist.ts`, `objective-errors.ts`).

Audited at `main` HEAD `0406f1d5`. Measured against `docs/internal/code-idioms.md` (M1, M4, N5, S1,
S2, S3, S4, E7), the TSDoc standard in `CLAUDE.md`, and `docs/internal/admin-design-system.md`.

Area size: 16,836 lines of `.svelte` + 6,655 lines of `.ts` in `src/lib/components/`.

---

## State of the area

This is a strong area by ordinary standards and a good one by cairn's own. The comment discipline is
the best I have seen in a codebase this size: comments state contracts and the non-obvious *why*
(`CairnAdminShell.svelte:190-196` on why a present-but-empty collapsed cookie must beat the
declaration; `MediaCaptureCard.svelte:63-66` on why `createObjectURL` lives in an `$effect` and never
a `$derived`; `EntryPicker.svelte:14-17` on IDREF resolution order), and I found essentially no
paraphrase comments. Svelte 5 rune usage is idiomatic and deliberate: `$derived.by` for the nav-group
fold, `untrack` at every one-time seed with the reason written down, keyed `{#each}` with the key
choice justified, `$props.id()` where hydration stability matters. Native `<dialog>` is used
correctly, focus management is thought through, and the a11y reasoning is unusually good.

Where it falls short is **not** local craft; it is that the area's shared vocabulary is documented in
prose but never made into code, and nothing gates it. The single most-repeated structure in the admin
— the modal — has 14 hand-rolled copies and no primitive, while `admin-toolkit/` (the declared home
for exactly this) ships twelve other primitives. Two module headers assert a reach they do not have
(`admin-icons.ts` "Components import from here" — 40 imports bypass it; `dialog-origin.ts` "shared by
every admin dialog" — one consumer). A subtle live-region a11y mechanism is hand-copied into six
components. Nine environment props are re-declared with byte-identical TSDoc across five files.
Against the AI-extensibility clause of the bar this is the expensive part: an agent adding a dialog,
a field arm, or an error announcement must find and imitate an exemplar nobody named, and no gate
will catch it if it imitates the wrong one. **Grade: B+.** Beautiful at the statement level, under-
factored at the vocabulary level, and un-gated at both.

---

## Rank 1 — No dialog primitive: the recipe is prose, and 14 copies have already drifted

**Tier:** refactor · **Limb:** idiom, comprehension, agent-extensibility

`docs/internal/admin-design-system.md:426` writes the recipe as prose:

> - **Dialog:** a native `<dialog class="modal">` with a `modal-box`, an `aria-labelledby` title, a close
>   button, and the `method="dialog"` backdrop. `showModal()` gives focus trap and Escape for free.

Every dialog then hand-assembles it. `DeleteDialog.svelte:71-76`:

```svelte
<dialog class="modal" role="alertdialog" aria-modal="true" aria-labelledby="cairn-delete-dialog-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-delete-dialog-title" class="type-heading font-bold font-[family-name:var(--font-display)]">Delete this {noun}?</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
```

`RenameDialog.svelte:72-78`, `MarkdownHelpDialog.svelte:23-27`, `ShortcutsDialog.svelte:25-29`,
`WebLinkDialog.svelte:65-69`, `EntryPicker.svelte:118-123`, `CairnAdminShell.svelte:776-780`, and
`ComponentInsertDialog.svelte:322` repeat it near-verbatim. The backdrop block is copied 14 times:

```svelte
<form method="dialog" class="modal-backdrop"><button tabindex="-1" aria-label="Close">close</button></form>
```

(`grep -c 'class="modal-backdrop"' src/lib/**/*.svelte` = 14 across 12 files.) The open/close pair is
copied too — `let dialog = $state<HTMLDialogElement | null>(null)` plus `export function open()` plus
`function close()` appears in every one (`showModal()` 34 times across the area).

**The recipe has already drifted.** The title's IDREF has forked into two idioms with no rule saying
which to use. Eight dialogs hard-code a constant (`aria-labelledby="cairn-rename-dialog-title"`,
`"cairn-markdown-help-title"`, `"cairn-shortcuts-title"`, `"cairn-delete-dialog-title"`,
`"cairn-insert-dialog-title"`, `"cairn-create-dialog-title"`, `"cairn-tidy-title"`,
`"cairn-shell-publish-all-title"`), while `EntryPicker.svelte:14-18` uses `$props.id()` and writes
down exactly why the hard-coded form is a bug:

```ts
// Per-instance, because more than one EntryPicker mounts on a single edit page (the link picker,
// the fragment picker, and one per reference field). A constant id here would give every dialog
// the same aria-labelledby target, and IDREF resolution takes the first match in tree order, so
// each dialog would announce the first picker's heading whatever its own heading says.
const titleId = $props.id();
```

`MediaHeroField.svelte:484` reached the same conclusion independently. Nothing tells the next author
(or agent) which branch they are on; the hard-coded eight are correct only as long as no host mounts
them twice.

`src/lib/admin-toolkit/index.ts` is the declared home for "General-purpose primitives a site building
its own `/admin/` screen (or cairn's own admin screens) composes instead of hand-rolling a bespoke
parallel." It ships `PageHeader`, `OfficeList`, `AdminTable`, `ListToolbar`, `Pagination`,
`StatusChip`, `EmptyState`, `ExpandableRow`, `FieldLabel`, `FieldRow`, `TextInput`, `SelectInput`.
The modal — the structure repeated most often in this area — is the one it does not ship.

**Remediation.** Add `AdminDialog.svelte` to `admin-toolkit`: `bind:this`-free, exporting `open()` /
`close()`, taking `title`, `destructive?` (which selects `role="alertdialog"`), and a `children`
snippet; it owns the `modal-box`, the header row, the close button, the `method="dialog"` backdrop,
and a `$props.id()` title id so the IDREF fork closes by construction. Migrate the 14 call sites.
Retire the prose recipe at `admin-design-system.md:426` down to a pointer at the component. Add a
`check:*` script (the repo has 25 already) that fails on a literal `class="modal-backdrop"` outside
the primitive.

---

## Rank 2 — The field-arm environment is drilled through five components with byte-identical TSDoc

**Tier:** refactor · **Limb:** idiom, agent-extensibility

`FieldInput.svelte`, `ObjectGroupField.svelte`, and `RepeatableField.svelte` each declare the same
nine environment props, with the same doc text, and pass them straight down. `FieldInput.svelte:38-56`:

```ts
/** The site link targets the reference arm offers. */
targets: LinkTarget[];
/** Mark the edit form dirty; the image arm wires it to the hero field's commit. */
markFieldsDirty: () => void;
/** The merged committed-plus-uploaded media library, keyed by content hash. */
mediaLibrary: Record<string, MediaLibraryEntry>;
/** The concept the entry belongs to (the upload action's route param). */
conceptId: string;
/** The entry id (the upload action's route param). */
id: string;
/** The host's hero-field refs, keyed by the prefixed `name` so two rows do not collide. */
heroFieldRefs: Record<string, MediaHeroField>;
/** Called with the server-owned record on a successful upload, so the host merges it. */
onuploaded: (record: MediaEntry) => void;
/** Called when a hero's needs-alt status changes, keyed by the prefixed `name`. */
onheroneedsalt: (name: string, needsAlt: boolean) => void;
```

`ObjectGroupField.svelte:31-47` and `RepeatableField.svelte:45-62` repeat those lines verbatim. Four
of the doc strings also recur in `MediaHeroField.svelte` and `MediaInsertPopover.svelte`:

```
"The merged committed-plus-uploaded media library, keyed by content hash"
  -> FieldInput.svelte  MediaHeroField.svelte  ObjectGroupField.svelte  MediaInsertPopover.svelte  RepeatableField.svelte
"The concept the entry belongs to (the upload action's route param)"
  -> MediaHeroField.svelte  FieldInput.svelte  ObjectGroupField.svelte  MediaInsertPopover.svelte  RepeatableField.svelte
"Called with the server-owned record on a successful upload"
  -> FieldInput.svelte  ObjectGroupField.svelte  MediaHeroField.svelte  MediaInsertPopover.svelte  RepeatableField.svelte
```

The forwarding is pure ceremony: `ObjectGroupField.svelte:82-95` and `RepeatableField.svelte:264-292`
are two ~12-line spread blocks that name every prop twice more. `RepeatableField` writes it out twice
(the object arm and the leaf arm), so one added prop is **seven** identical edits across four files.

None of these nine is a per-field value; they are the edit-desk environment. The recursion is capped
at one level (`FieldInput.svelte:13-16`), so a context is safe here.

**Remediation.** Define one `FieldEnv` interface in a co-located `field-env.ts` carrying the nine, set
once by `EditPage` through `setContext` (following the `topbar-context.ts` provide/use shape, per
Rank 7), and read by the three arms. Each arm's `Props` then shrinks to `{ field, name, frontmatter }`
plus its own extras, and the spread blocks disappear. If context is rejected, pass a single `env`
object so the doc lives in one file.

---

## Rank 3 — `admin-icons.ts` claims to be the one import surface; 40 imports bypass it

**Tier:** refactor · **Limb:** idiom, agent-extensibility

`admin-icons.ts:1-2`:

```ts
// The fixed set of Lucide glyphs the admin chrome uses, each a per-icon import so only these ship.
// Components import from here, which keeps one import surface and documents the chrome's icon set.
```

Three components actually do: `CairnAdminShell.svelte`, `CairnMediaLibrary.svelte`,
`ConceptList.svelte`. Forty other imports go direct to `@lucide/svelte/icons/*`, and twelve of them
are for glyphs `admin-icons.ts` already exports. `RepeatableField.svelte:24-29` imports six icons
directly, **all six of which the barrel exports**:

```ts
import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import PlusIcon from '@lucide/svelte/icons/plus';
```

Duplicated glyphs and their direct-importer counts: `check` 3, `trash-2` 2, `plus` 2, `triangle-alert`
2, `chevron-right` 1, `chevron-down` 1, `arrow-up` 1, `arrow-down` 1, `x` 1, `chevron-left` 1, `list`
1, `arrow-right` 1. `TidyReview.svelte:21-26`, `VocabularyAdmin.svelte`, `CairnTidySettings.svelte`,
`EditPage.svelte`, `LoginPage.svelte`, and `CairnAdminShell.svelte:27` (its own `ExternalLinkIcon`,
in the very file that imports the barrel on line 23) all bypass it.

The consequence for the stated bar: the header is false, so an agent reading it and adding
`import { XIcon } from './admin-icons.js'` produces code inconsistent with the majority; an agent
copying its neighbor produces code inconsistent with the header. Neither is wrong, which is the
definition of a one-obvious-way failure. It also defeats the barrel's second stated purpose —
"documents the chrome's icon set" — since the real set is a grep away, not a file.

**Remediation.** Pick one and make it true. Either move every admin glyph into `admin-icons.ts` and
add a check that fails on a direct `@lucide/svelte/icons/` import inside `src/lib/components/*.svelte`
(the `admin-nav-icons.ts` allowlists are exempt — they are data), or delete `admin-icons.ts`, import
directly everywhere, and drop the header's claim. The first is better: it keeps the chrome's glyph
budget auditable.

---

## Rank 4 — The live-region announce nonce is hand-copied into six components

**Tier:** refactor · **Limb:** idiom, agent-extensibility

`code-idioms.md` S4 names the shape but never extracts it:

> **S4.** Error surfacing in admin screens follows `ConceptList.svelte`'s live-region shape
> (the one variant that re-announces repeated identical errors).

Six components carry a hand-written copy: `ConceptList.svelte`, `ManageEditors.svelte`,
`NavTree.svelte`, `VocabularyAdmin.svelte`, `CairnTidySettings.svelte`, `TidyReview.svelte`.
`NavTree.svelte:108-126`:

```ts
// The polite live region's text re-announces only when it changes, so a repeated identical error
// (a second save failing the same way) would otherwise go silent. An invisible nonce flips on
// every fresh error so the region text always mutates and the screen reader speaks again (the
// ConceptList discipline). The nonce is a zero-width space, never voiced, so the heard sentence is
// unchanged; ...
let announceNonce = $state(0);
function nonce(): string {
  return announceNonce % 2 === 0 ? '' : '​';
}
let lastSubmit: unknown;
$effect(() => {
  const submit = form ?? data;
  if (submit !== lastSubmit) {
    lastSubmit = submit;
    if (lifecycleError) announceNonce++;
  }
});
const liveError = $derived(lifecycleError ? `${lifecycleError}${nonce()}` : '');
```

This is the worst possible thing to hand-copy: the mechanism is a **zero-width space** (U+200B),
invisible in every editor and diff, whose correctness depends on identity-comparing an opaque
`form ?? data` object across submits. A copy that loses the ZWSP silently degrades a screen-reader
contract with no visible symptom and no failing test. There is no gate.

**Remediation.** Extract `src/lib/components/live-error.ts` exporting a small function or class —
`createErrorAnnouncer()` returning `{ announce(submitToken: unknown, message: string): string }` —
holding the nonce, the identity comparison, and the ZWSP, with the whole rationale as its module
header. Convert the six call sites. Add a unit test that asserts the returned string *changes* across
two identical consecutive errors (falsifiable per the repo's own gate discipline). Then S4 can point
at a module instead of an exemplar.

---

## Rank 5 — Two hand-rolled Tab focus traps that have diverged, plus a comment asserting they have not

**Tier:** refactor · **Limb:** idiom, comprehension

`CairnAdminShell.svelte:501-522`:

```ts
// Cycles Tab/Shift+Tab within the drawer's own nav while it is an open overlay ...
// Redirects into the trap even when focus currently sits outside drawerNavEl (a defensive fallback
// for the moment before the focus-in effect above lands), the same fallback MediaInsertPopover's
// trap uses.
function trapDrawerTab(e: KeyboardEvent) {
  ...
  if (e.shiftKey) {
    if (active === first || !drawerNavEl.contains(active)) { e.preventDefault(); last.focus(); }
  } else if (active === last || !drawerNavEl.contains(active)) { e.preventDefault(); first.focus(); }
}
```

`MediaInsertPopover.svelte:154-176` is the other copy, and **it does not have that fallback**:

```ts
if (e.shiftKey && (activeEl === first || activeEl === panel)) {
  e.preventDefault();
  last.focus();
} else if (!e.shiftKey && activeEl === last) {
  e.preventDefault();
  first.focus();
}
```

The forward branch has no container check at all, and the shift branch checks `activeEl === panel`
rather than `!panel.contains(activeEl)`. The shell's comment says these are "the same fallback." They
are not. The focusable selectors have drifted too — the shell's (line 507) omits `:not([disabled])`
on `input` in the focus-in query at line 496 and orders `select`/`textarea` differently from the
popover's at line 164.

A comment that asserts parity with a sibling implementation is a comprehension trap: a reader fixing
a bug in one will trust the comment and not check the other.

**Remediation.** Extract `src/lib/components/focus-trap.ts` with the focusable selector as one
exported constant and one `cycleTab(container: HTMLElement, e: KeyboardEvent): void`. Both call sites
use it. Delete the parity claim from `CairnAdminShell.svelte:503`. The escape/close policy stays local
to each host, since it genuinely differs (the shell stops propagation in capture phase; the popover
refocuses the editor).

---

## Rank 6 — `CairnAdminShell.svelte` is 949 lines carrying seven independent concerns

**Tier:** refactor · **Limb:** comprehension, agent-extensibility

The file a new developer opens first holds, in one script block and one template:

1. CSRF and media-base context provision (lines 67-75)
2. Nav-layout resolution: `navItemOf`, `isEngineChild`, `isLayoutSection`, `layoutChildItem`,
   `NavGroup`, `attentionFor`, `attentionDisplay`, `navGroups`, `fallbackItems` (83-170)
3. Collapsed-section cookie state and toggle (190-217)
4. Drawer state, breakpoint matchMedia tracking, APG overlay treatment, focus capture/restore, and
   the Tab trap (219-252, 266-272, 478-539)
5. Theme resolution, the OS-preference first-mount read, the override gate, and the topbar mirror
   (286-319, 465-473)
6. The command palette: `Command`, `paletteDialog`, `paletteQuery`, `paletteCommands`,
   `paletteResults`, `openPalette`, `runCommand`, `submitPalette`, plus ~50 lines of markup
   (322-395, 721-771)
7. The publish-all confirm: `publishAllDialog`, `groupPending`, plus ~30 lines of markup
   (337-350, 773-802)
8. Breadcrumbs and page title: `Crumb`, `flattenSiteEntries`, `crumbs`, `pageTitle`, `isDeskRoute`
   (397-455)

Items 2, 6, 7, and 8 are pure functions over `shell` plus a small piece of local state. None of them
is drawer chrome. `code-idioms.md` records a deliberate "**`CairnMediaLibrary.svelte` is NOT split
this pass**" decision with its reasoning; no such decision exists for the shell, so its size reads as
accretion rather than a judgment.

Concretely for the agent-extensibility clause: "add a nav section kind" and "add a palette command"
and "change the breadcrumb depth rule" are three unrelated tasks that all land in this one file, and
an agent must read all 949 lines to be sure its edit is safe.

**Remediation.** Extract three pure modules first (no template coupling, so no focus/state risk, the
phase-3a lesson does not bind): `admin-nav-groups.ts` (item 2 — `NavItem`, `NavGroup`,
`layoutChildItem`, the `navGroups` fold, `attentionFor`/`attentionDisplay`) and
`admin-crumbs.ts` (item 8 — `Crumb`, `flattenSiteEntries`, `deriveCrumbs`, `isDeskRoute`), both unit
testable in node. Then move the palette and the publish-all confirm into
`CommandPalette.svelte` / `PublishAllDialog.svelte`, both built on the Rank 1 primitive. The shell
lands near 400 lines and each concern gets a greppable home.

---

## Rank 7 — Three context modules, two idioms; the string-key form repeats its type annotation at every read

**Tier:** refactor · **Limb:** idiom, agent-extensibility

`topbar-context.ts` is the good shape: a module-private `Symbol` key, a typed holder interface, and a
provide/use pair.

```ts
const TOPBAR_CONTEXT_KEY = Symbol('cairn-topbar');           // topbar-context.ts:10
export function provideTopbar(holder: TopbarHolder): TopbarHolder { ... }   // :38
export function useTopbar(): TopbarHolder | undefined { ... }               // :44
```

The other two export a bare string and leave typing to the caller:

```ts
export const CSRF_CONTEXT_KEY = 'cairn:csrf';                 // csrf-context.ts:2
export const MEDIA_BASE_CONTEXT_KEY = 'cairn:media-base';     // media-base-context.ts:2
```

so the annotation and the fallback are hand-repeated at every read:

```ts
const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);
// CsrfField.svelte:16, MediaHeroField.svelte:102, CairnMediaLibrary.svelte:323,
// MediaInsertPopover.svelte:82, EditPage.svelte:462  (5 verbatim copies)

const mediaBase = getContext<string | undefined>(MEDIA_BASE_CONTEXT_KEY) ?? DEFAULT_MEDIA_BASE;
// MediaHeroField.svelte:108, MediaPicker.svelte:62, MarkdownEditor.svelte:195,
// CairnMediaLibrary.svelte:1395  (4 verbatim copies)
```

A wrong annotation at any one site type-checks and fails at runtime. String keys are also globally
collidable in a library a host embeds.

`csrf-context.ts` and `media-base-context.ts` additionally violate M1 (every module opens with a
`// cairn-cms:` orientation header) — both are bare `export const` lines with only a symbol doc.
`csrf-context.ts` is two lines total.

**Remediation.** Converge on the `topbar-context.ts` shape: private `Symbol`, `provideCsrf(getter)` /
`useCsrf(): () => string`, `provideMediaBase(base)` / `useMediaBase(): string` (the latter folding in
`DEFAULT_MEDIA_BASE`). The nine call sites become one call each with no annotation. Add the M1 headers.
This is also the mechanism Rank 2's `FieldEnv` should use.

---

## Rank 8 — `ComponentForm` uses `$effect` to mirror derived values into `$bindable` props, which S1 bans

**Tier:** refactor · **Limb:** idiom

`code-idioms.md` S1: "`$derived` for computed values, `$state` for genuine local mutability, **never
`$effect` for derivation**."

`ComponentForm.svelte:53-56`:

```ts
// Mirror the working values out to the bindable prop so the dialog's preview reads them live.
$effect(() => {
  values = working;
});
```

`ComponentForm.svelte:164-167`:

```ts
$effect(() => {
  incomplete = incompleteState;
});
```

`incompleteState` is already a `$derived.by` (line 152). Both effects exist only to copy a
derivation into a prop, which is the canonical Svelte 5 prop-sync anti-pattern: it introduces a
one-microtask lag, makes the parent's read order-dependent, and can loop if a parent ever writes back.
These are the only two instances of the shape in the area — every other `$effect` in the tree does
real work (DOM measurement, `matchMedia` subscription, object-URL lifecycle, focus moves), so this is
an isolated deviation rather than a house style.

**Remediation.** Make the bindables the source: `let { values = $bindable(untrack(() => initial ?? previewValues(def))) } = $props()` and mutate `values` directly in place of `working`; export
`incomplete` as a `$derived` read by the parent through a getter prop, or hoist `incompleteState`'s
computation into a pure exported function in a `component-form.ts` that both the form and the dialog
call. Either removes both effects.

---

## Rank 9 — Five tab-indented files contradict M4 and `.editorconfig`, and nothing enforces it

**Tier:** note · **Limb:** idiom

`code-idioms.md` M4: "Indentation is 2-space everywhere; the tab-indented `doctor/` tree and its test
cluster converge, and an `.editorconfig` records it." `.editorconfig` exists and says so:

```
# cairn-cms: records the code-idiom charter's M4 rule (indentation is 2-space everywhere) so an
# editor enforces it going forward instead of relying on a one-time sweep to hold.
[*]
indent_style = space
indent_size = 2
```

Five files in this area are still tab-indented:

```
src/lib/components/chrome-guard.ts:     30 tab-indented lines
src/lib/components/editor-tidy.ts:     161
src/lib/components/tidy-categorize.ts: 302
src/lib/components/tidy-diff.ts:       130
src/lib/components/tidy-validate.ts:    81
```

`chrome-guard.ts:19-23`:

```ts
function describe(el: Element): string {
	const tag = el.tagName.toLowerCase();
	const cls = el.getAttribute('class');
	return cls ? `<${tag} class="${cls}">` : `<${tag}>`;
}
```

The comment in `.editorconfig` says the file exists so "an editor enforces it going forward instead of
relying on a one-time sweep to hold" — but `.editorconfig` is honored only by an editor that reads it,
and `package.json` has no `format` script and no Prettier config, so CI never sees this. The charter
records a convergence that did not happen here.

**Remediation.** Retab the five files, add Prettier (or a two-line `check:indent` node script, matching
the repo's existing bespoke-check habit) to the gate list, and note the enforcement in `.editorconfig`'s
header so the next reader knows what actually holds the line.

---

## Rank 10 — No gate covers any idiom in this area, in a repo with twenty-five bespoke gates

**Tier:** note · **Limb:** agent-extensibility

`package.json` carries `check:reference`, `check:surface`, `check:package`, `check:symbols`,
`check:snippets`, `check:public-tokens`, `check:custom-surface`, `check:chassis-boundary`,
`check:cm-internals`, `check:invisible-craft`, `check:admin-css-classes`, `check:interactive-contrast`,
`check:touch-targets`, `check:prose`, `check:transcripts`, `check:arm-indexes`, and more. The repo is
demonstrably good at turning a rule into a failing test — and CLAUDE.md's own "Watch items" section
elevates that to doctrine ("Converting a watch into a failing test is the gold standard").

Not one of them covers Ranks 1, 3, 4, 5, 8, or 9. Every finding above is a rule that exists in prose
(`code-idioms.md` S1/S4/M1/M4, `admin-design-system.md`'s Dialog recipe, `admin-icons.ts`'s own header)
and is violated in code with a green gate.

The comment gate is also blind to most of the area. `eslint.config.js:32`:

```js
const COMMENT_GLOBS = ['src/lib/**/*.ts', 'packages/cairn-cms-dev/src/**/*.ts'];
```

`.svelte` is out of scope (CLAUDE.md acknowledges the parser gap), which leaves **16,836 of this area's
23,491 lines** outside `tsdoc/syntax`, `jsdoc/no-types`, `jsdoc/informative-docs`, and
`house/no-em-dash-in-comments`. To the area's credit the discipline has held by convention — I found
zero em dashes in `.svelte` comments and no paraphrase docs — but it is held by care, not by a gate,
and care does not survive an agent dispatch.

**Remediation.** Add three cheap textual checks in `scripts/checks/` (the shape the repo already uses):
literal `class="modal-backdrop"` outside the dialog primitive; a direct `@lucide/svelte/icons/` import
in a `.svelte` under `src/lib/components/`; a leading tab in `src/lib/**`. For `.svelte` comments, run
`eslint` with `svelte-eslint-parser` over `<script>` blocks even at warn level, or add a regex pass for
the em dash inside `<!-- -->` and `//` in `.svelte` as an interim.

---

## Rank 11 — Two "shared primitive" modules have exactly one consumer, and their headers say otherwise

**Tier:** note · **Limb:** comprehension

`dialog-origin.ts:1-4`:

```ts
// cairn-cms: the origin-refocus dialog lifecycle shared by every admin dialog that is opened from
// more than one trigger.
```

Every consumer is `CairnMediaLibrary.svelte` (lines 255, 266, 358, 381, 581, 593, 731, 749, 1087,
1103). No other dialog imports it. Same for `typed-confirm.ts:1-2` ("shared by every destructive admin
dialog that requires a visible, typed confirmation") — consumers are `CairnMediaLibrary.svelte:351,
870, 1188` and nothing else. `segmented-control.ts` fares better (4 consumers), but `IconPicker.svelte:72,84`
hand-rolls a near-identical tint (`border-base-content/25 bg-base-content/[0.07] font-semibold`)
without it.

These were the S3 extractions. Extracting them was right; the headers then over-claimed, so an agent
reading `dialog-origin.ts` believes the origin-refocus contract is the house standard for dialogs
when in practice seven dialogs rely on the native `<dialog>` restore instead. Either reading is
defensible and the module does not say which.

**Remediation.** Rewrite each header to state the actual reach and the actual rule — e.g. for
`dialog-origin.ts`: "used by surfaces that are NOT a native `<dialog>` (the media library's slide-over
panels), where the platform's own focus restore does not apply; a native `<dialog>` needs none of
this." Either adopt `segmentTintClass` in `IconPicker` or document why a radiogroup segment differs.

---

## Rank 12 — `CairnAdminShell` reaches its authed payload two ways in one file

**Tier:** note · **Limb:** comprehension

Line 59-62 introduces the narrowing:

```ts
// The authed member, narrowed once. Every chrome read below goes through `shell`, which is null on
// a public payload ...
const shell = $derived(data.public ? null : data);
```

The script honors it (`shell?.attention[href]` :130, `shell?.user.displayName` :183,
`shell?.concepts` :346, `shell?.pathname` :418). The template does not, reading `data` directly inside
the same authed `{:else}` branch:

```svelte
<CsrfField token={data.csrf} />                        <!-- :794, :939 -->
<div class="truncate type-body font-medium">{data.user.displayName}</div>   <!-- :931 -->
<div class="truncate type-meta text-muted">{data.user.email}</div>          <!-- :932 -->
<div class="type-label capitalize text-subtle">{data.user.role}</div>       <!-- :933 -->
```

Both are correct (template narrowing on `data.public` works), but the comment says "**Every** chrome
read below goes through `shell`," which the template falsifies. A reader who trusts the comment will
grep `shell.` to find every authed read and miss six of them.

**Remediation.** Use `shell` in the template too (`{shell.user.displayName}`), or amend the comment to
"every read in this script block." The former is better: one access path, and `shell` then earns its
existence.

---

## Rank 13 — The brand mark's path data is duplicated verbatim in two files

**Tier:** note · **Limb:** idiom

`CairnLogo.svelte:25-27` and `cairn-favicon.ts:6` carry the same ~430-character SVG path string.
Both comments cross-reference the other — `cairn-favicon.ts:3` says "The path is the same public-domain
Temaki cairn used by CairnLogo.svelte" — but neither imports it, so the two can silently diverge and
the admin's tab icon would stop matching its own sidebar mark.

**Remediation.** Export `CAIRN_MARK_PATH` and `CAIRN_MARK_VIEWBOX` from `cairn-favicon.ts` (or a new
`cairn-mark.ts`), and have `CairnLogo.svelte` render `<path d={CAIRN_MARK_PATH} />`. One string, one
provenance note.

---

## Rank 14 — Minor idiom forks: element-ref declarations, component handles, component-test filenames

**Tier:** note · **Limb:** idiom, agent-extensibility

Three small forks with no rule to settle them.

**Element refs.** `$state<T | null>(null)` is dominant (58 occurrences), but eight sites use
`$state<T>()` — `CairnAdminShell.svelte:224` (`let drawerNavEl = $state<HTMLElement>()`), `:331`, `:338`,
`:353` — and one uses a plain non-reactive `let`: `IconPicker.svelte:32`, `let group: HTMLDivElement;`.
The last is the odd one out; it happens to work because the ref is only read inside an event handler,
but it is the shape that breaks silently if anyone reads it during render.

**Component handles.** Two ways to type a `bind:this` on a component. Structural:
`LinkPicker.svelte:29`, `FragmentPicker.svelte:46`, `ReferenceField.svelte:50` — `let picker = $state<{ open: () => void } | null>(null)`. Nominal: `FieldInput.svelte:50`, `ObjectGroupField.svelte:41`,
`RepeatableField.svelte:56`, `EditPage.svelte:777` — `Record<string, MediaHeroField>` via
`import type MediaHeroField from './MediaHeroField.svelte'`. The structural form is arguably better
(it is the documented `open()` contract from S2, not the whole component), but nothing says so.

**Component-test filenames.** `src/tests/component/` mixes per-component PascalCase with per-feature
kebab-case for the same subject: `CairnAdminShell.test.ts`, `admin-shell-theme-override.test.ts`,
`admin-layout-help-nav.test.ts`, `admin-nav-icons.test.ts` all test the shell; `EditPage.test.ts`,
`edit-page-advisories.test.ts`, `edit-page-field-hint.test.ts`, `EditPage-insert.test.ts`,
`edit-page-v2-fields.test.ts` all test the edit page (`EditPage-insert.test.ts` mixes both cases in one
filename). An agent asked "where is the shell's nav tested" cannot answer from the listing.

**Remediation.** Add three lines to `code-idioms.md` S1/N6: element refs are `$state<T | null>(null)`;
a component handle is typed by its exported contract, not its default import; component tests are
`<Component>.test.ts` for the component's own suite and `<component>-<aspect>.test.ts` for a focused
aspect, one case convention per half. Then sweep — all three are mechanical.

---

## Rank 15 — `chrome-guard.ts` holds the only bare `console.*` in `src/lib` outside a bin

**Tier:** note · **Limb:** idiom

`code-idioms.md` E7: "**No bare `console.*` in `src/lib`.** Client editor/admin code surfaces failures
as typed UI states ... or degrades silently by documented contract; server code speaks through the
`src/lib/log` chokepoint. Scripts and bins print freely."

`chrome-guard.ts:60-64`:

```ts
export function warnIfChromeWrapped(root: HTMLElement): void {
	if (!DEV) return;
	const problem = detectChromeWrap(root);
	if (problem) console.error(problem);
}
```

Every other `console.*` in `src/lib` is in a bin shell (`vite/bin.ts`, `doctor/bin.ts`,
`media-seed/bin.ts`, `audit/bin.ts`), a build-time warning (`vite/internal.ts:238`), or the dev
auth channel (`auth-channel/dev.ts:30`). This one sits in a component-tier module.

The call is deliberate, `DEV`-gated, and thoroughly documented (`chrome-guard.ts:1-7`) — it is a
developer diagnostic, not a runtime failure path, and printing is the correct behavior. The defect is
that E7 has no clause for it, so the charter and the code disagree and an agent enforcing E7 would
"fix" a correct line.

**Remediation.** Amend E7 with a fourth lane: "a `DEV`-gated developer diagnostic prints through
`console.error` and names the doc that resolves it (exemplar: `components/chrome-guard.ts`)."
No code change.

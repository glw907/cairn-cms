# Internals rank: admin screens (components-screens)

Area: the admin screens — media library, history, tidy settings, concept list, editors,
vocabulary, help, login, confirm, welcome — plus their co-located pure modules
(`media-base-context.ts`, `media-upload-outcome.ts`, `tidy-categorize.ts`, `tidy-diff.ts`,
`tidy-validate.ts`).

Repo: `/home/glw907/Projects/cairn-cms`, `main` @ `0406f1d5`.

Audited against `docs/internal/code-idioms.md` (the idiom charter), the TSDoc standard in
`CLAUDE.md` "Authoring", `docs/internal/admin-design-system.md`, and the repo's own test /
log-event conventions.

## State of the area

This is a well-tended area with real craft in it: `CairnHistory`, `ConceptList`, `WelcomeView`,
`tidy-diff.ts`, and `client-action.ts` are close to exemplary — accurate `@component` blocks that
state the contract and the failure mode, `$derived` doing the deriving, `interface Props` with
per-field TSDoc, native `<dialog>` recipes, and comments that record *why* rather than paraphrasing
the code. The admin toolkit adoption is real and visible. But the area is not one idiom; it is
three. The dominant one is Tailwind/DaisyUI + admin-toolkit + `admin-icons.ts` + `$derived`. Beside
it sits `HelpHome.svelte`, a 495-line hand-rolled scoped stylesheet with 38 bespoke class names and
seven inline SVGs that shadows engine recipes it never calls. And beneath both sits a layer of
copy-paste the charter itself already condemned and left standing: the announce-nonce live-region
block exists in six screens under three names, the tidy token grammar is written out three times,
the table-header class literal four times under two names, and `CairnMediaLibrary.svelte` carries
six near-identical dialog controllers and six near-identical dialog markup blocks inside 3,159
lines. Three of the five pure modules in scope are tab-indented against an `.editorconfig` that
says otherwise and a charter rule (M4) that names the convergence, with no gate to hold it. The
net effect on the two audiences the bar names: a new developer can read any single screen and
understand it, but cannot tell which of the three idioms is the one to imitate; and an AI agent
asked to add a seventh media dialog, a seventh screen live region, or a ninth tidy convention will
correctly infer that the house style is to copy the block next door. Grade: **B−** — strong at the
file level, weak at the system level, with the two largest files being the two a stranger is most
likely to open first.

---

## 1. `CairnMediaLibrary.svelte` is seven screens in one file, with six copy-pasted dialog controllers (rank 1, rewrite)

3,159 lines — the largest file in the tree — holding the grid, the list table, the multi-select
model, the slide-over, and six independent modal features (delete, replace, push-alt, bulk-delete,
orphan-scan/purge, library upload). Each feature repeats the same controller shape verbatim:

```
src/lib/components/CairnMediaLibrary.svelte:353
  function openReplaceDialog(origin?: HTMLElement | null) {
    ...
    void tick().then(() => {
      replaceDialog?.showModal();
      replaceCancelButton?.focus();
    });

src/lib/components/CairnMediaLibrary.svelte:580
  function openLibraryUpload(file: File, origin: HTMLElement | null) {
    ...
    void tick().then(() => {
      uploadDialog?.showModal();
      uploadCancelButton?.focus();
    });

src/lib/components/CairnMediaLibrary.svelte:729
  function openAltDialog(origin?: HTMLElement | null) {
    ...
    void tick().then(() => {
      altDialog?.showModal();
      altCancelButton?.focus();
    });

src/lib/components/CairnMediaLibrary.svelte:1085
  function openBulkDialog(origin?: HTMLElement | null) {
    ...
    void tick().then(() => {
      bulkDialog?.showModal();
      bulkCancelButton?.focus();
    });
```

Plus a fifth (`openOrphanScan`, 1199) and a sixth (`openDeleteDialog`, 302), each with its own
`$state<HTMLDialogElement | null>`, its own `xOrigin`, its own `xCancelButton`, and its own
field-by-field reset block. The `close*` halves mirror them one for one. `dialog-origin.ts`
(`resolveDialogOrigin` / `refocusDialogOrigin`) already extracted the focus-restore half; the
open/show/focus/reset half stayed six copies.

The markup half is the same story — six `<dialog>` blocks at lines 1954, 2043, 2300, 2571, 2802,
3103, each re-declaring the skeleton and the footer:

```
src/lib/components/CairnMediaLibrary.svelte:2025
          <div class="flex justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
```
(the same literal recurs at 2135, 2234, 2284 …).

The two upload loops are also near-verbatim twins of each other — `runReplaceUpload` (397-452) and
`runLibraryUpload` (640-703) both do ingest → `buildUploadRequest` → `sendUpload` →
opaque-redirect check → `deserialize` → `uploadOutcome` → route, differing only in the target URL
and the failure-card shape.

`ROADMAP.md:1609` already files the split and characterizes it correctly ("the file a code-reading
stranger will judge the repo by", "six near-identical inline dialog controllers … followed by six
near-identical `<dialog>` markup blocks"), and `docs/internal/code-idioms.md:168` records the
deliberate deferral. So this is not a new discovery — it is a standing debt that the standing
ruling ("churn is free until beta; pre-beta is the time to aim for the most perfect possible
engine") says should now be paid. The agent-extensibility cost is concrete: an agent asked to add a
seventh media action has no seam to hook, only a 250-line block to copy.

**Remediation:** execute the filed split. One child component per feature dialog
(`MediaReplaceDialog`, `MediaAltDialog`, `MediaBulkDeleteDialog`, `MediaOrphanDialog`,
`MediaUploadDialog`, `MediaDeleteDialog`), each owning its own `$state` cluster and exporting
`open(asset, origin)` as its contract (the `DeleteDialog.svelte` shape S2 already names). Extract a
`createDialogController()` internal in `src/lib/components/` covering the
show/focus-cancel/reset/refocus lifecycle, and one `runMediaUpload(url, file, meta)` helper folding
the two upload loops. Verify against the `admin-visual` baseline and the e2e media suite.

---

## 2. `HelpHome.svelte` is a foreign idiom island inside the admin (rank 2, rewrite)

Every other screen in the area styles through Tailwind utilities, `card-shell card-shadow`, the
admin toolkit, and `admin-icons.ts`. `HelpHome` styles through a 495-line scoped `<style>` block
(lines 344-838) declaring 38 bespoke class names, several of which shadow recipes the engine
already owns:

```
src/lib/components/HelpHome.svelte:350
  .sr-only {
    position: absolute;
    width: 1px;
```
(a local re-implementation of the global utility every sibling screen uses)

```
src/lib/components/HelpHome.svelte:373
  .eyebrow {
    font-size: var(--cairn-type-label);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-muted);
  }
```
(the same recipe `PageHeader.svelte:66` emits as `type-label font-semibold uppercase
tracking-[0.08em] text-muted` — and `HelpHome` mounts `PageHeader` twelve lines earlier)

plus `.card` (vs `card-shell card-shadow`), `.kbd` (vs DaisyUI's own `.kbd`), `.btn-quiet`,
`.step-*`, `.prog-*`, `.ref-*`.

Icons are hand-inlined raw SVG paths seven times rather than imported from `admin-icons.ts`, which
already exports Lucide equivalents for every one of them (check, chevron-right, info/circle, mail,
external-link):

```
src/lib/components/HelpHome.svelte:164
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg
                      >
```

`docs/internal/admin-design-system.md:886` acknowledges the block ("Warm Stone tokens through its
scoped `<style>`"), so this is documented — but documenting a fork is not resolving one. The
consequence for the bar's second and third clauses is direct: a developer told to restyle admin
cards edits `cairn-admin.css` and the Help screen does not move; an agent told to add a fourth Help
section has no engine recipe to reach for and must read 495 lines of CSS to find the local one.

**Remediation:** port `HelpHome` onto the shipped idiom — `card-shell card-shadow` for the three
cards, `PageHeader`/`EmptyState` and the eyebrow recipe for the section heads, `admin-icons.ts`
imports for all seven glyphs, the global `.sr-only`, DaisyUI `.kbd`. Keep a scoped block only for
what has no engine expression (the progress rail, the step-box). Update the
`admin-design-system.md:886` entry to describe the converged screen.

---

## 3. The announce-nonce live-region block is copied into six screens under three names (rank 3, refactor)

`docs/internal/code-idioms.md:156` (S4) names `ConceptList.svelte` as the exemplar for admin error
surfacing, and `:150` (S3) mandates that repeated in-file idioms "extract to one home each,
`src/lib/components/` internals". Neither happened. The identical ~20 lines now sit in six files:

```
src/lib/components/ConceptList.svelte:267
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

byte-comparable copies at `ManageEditors.svelte:68`, `CairnTidySettings.svelte:77`,
`NavTree.svelte:112`, `TidyReview.svelte:151`, and — renamed — `VocabularyAdmin.svelte:139`
(`function errorNonce()`).

Worse, the copies cite three different exemplars in their own comments, so a reader cannot tell
where the canonical version lives:

- `ConceptList.svelte:265` — "(the MediaPicker discipline)"
- `ManageEditors.svelte:65` — "(the ConceptList discipline)"
- `VocabularyAdmin.svelte:136` — "(the NavTree/ConceptList discipline)"

And `VocabularyAdmin` carries a *seventh* variant of the same zero-width-space trick, in the same
file as the sixth:

```
src/lib/components/VocabularyAdmin.svelte:94
  let mutation = $state('');
  let pulse = 0;
  function announce(text: string) {
    pulse += 1;
    mutation = `${text}${'​'.repeat(pulse % 2)}`;
  }
```

**Remediation:** add `src/lib/components/live-announce.ts` exporting one
`createErrorAnnouncer(getError, getSubmitToken)` (or a `<LiveError message={...} />` component)
covering both the repeat-nonce and the plain-pulse shapes, retarget all seven call sites, and
delete the cross-citations. Update S4 in `code-idioms.md` to name the helper as the exemplar
instead of a file.

---

## 4. Three tidy modules are tab-indented against M4 and the repo `.editorconfig`, with no gate (rank 4, refactor)

`docs/internal/code-idioms.md:78` (M4): "Indentation is 2-space everywhere; the tab-indented
`doctor/` tree and its test cluster converge, and an `.editorconfig` records it." The
`.editorconfig` exists and says so explicitly:

```
.editorconfig:1
# cairn-cms: records the code-idiom charter's M4 rule (indentation is 2-space everywhere) so an
# editor enforces it going forward instead of relying on a one-time sweep to hold.
...
indent_style = space
indent_size = 2
```

Three of the five pure modules in this area ignore it — `tidy-categorize.ts` (302 tab-indented
lines), `tidy-diff.ts` (130), `tidy-validate.ts` (81):

```
src/lib/components/tidy-categorize.ts:34
export function isObjective(category: TidyCategory): boolean {
	return (
		category.kind === 'spelling' ||
```

Repo-wide the same holds for `src/lib/diagnostics/error.ts`, `src/lib/diagnostics/conditions.ts`,
`src/lib/sveltekit/tidy-prompt.ts`, `src/lib/components/chrome-guard.ts`, and
`src/lib/components/editor-tidy.ts`. There is no `.prettierrc` and no format script in
`package.json`, so nothing detects the drift; `.editorconfig` is advisory to editors only. This is
exactly the "watch item that should be a tripwire" shape `CLAUDE.md` warns about.

**Remediation:** convert the three files (and the five siblings) to two-space, then make M4
falsifiable: add a `check:format` script (Prettier with `useTabs: false`, or a five-line
`scripts/checks/check-indentation.mjs`) to the CI gate list so a re-introduced tab fails.

---

## 5. The tidy token grammar is written out three times, in three forms (rank 5, refactor)

The same word/non-word token regex is the positional contract shared by the diff, the categorizer,
and the validator's divergence bound. It is declared three times:

```
src/lib/components/tidy-diff.ts:53
const TOKEN = /[A-Za-z0-9_]+(?:['’][A-Za-z0-9_]+)*|[^A-Za-z0-9_]+/g;

src/lib/components/tidy-categorize.ts:60
// The token boundary the diff uses, so a change's word/non-word token count here matches the diff's.
const TOKEN = /[A-Za-z0-9_]+(?:['’][A-Za-z0-9_]+)*|[^A-Za-z0-9_]+/g;

src/lib/components/tidy-validate.ts:152
  const countTokens = (s: string) => (s.match(/[A-Za-z0-9_]+(?:['’][A-Za-z0-9_]+)*|[^A-Za-z0-9_]+/g) ?? []).length;
```

The categorizer's own comment states the invariant ("so a change's word/non-word token count here
matches the diff's") and then relies on a human keeping two literals equal. The validator's copy is
inline and unnamed, so a grep for `TOKEN` misses it entirely. Any change to the apostrophe handling
silently desynchronizes the categorizer's safety rank from the diff's spans, and the divergence
bound from both.

**Remediation:** export the grammar and a `tokenize`/`countTokens` pair from `tidy-diff.ts` (the
module that owns positional truth per its own header) and import it in the other two. Delete both
copies.

---

## 6. Adding one tidy convention means editing six unlinked parallel lists (rank 6, refactor)

The set of tidy conventions is enumerated independently in six places with nothing tying them
together and no gate that notices a mismatch:

1. `TidyConventions` — `src/lib/nav/site-config.ts` (the config shape)
2. `src/lib/components/tidy-categorize.ts:48` — `type NormalizationKey = 'oxfordComma' | ...`
3. `src/lib/components/tidy-categorize.ts:260` — `matchNormalization`, one `if` per convention
4. `src/lib/components/tidy-categorize.ts:372` — `buildBecause`, one `case` per convention
5. `src/lib/components/tidy-categorize.ts:453` — `normalizationLabel`, one `case` per convention
6. `src/lib/components/CairnTidySettings.svelte:116` — `styleRows`, one object per convention,
   **plus** two more hand-maintained lists in the same file:

```
src/lib/components/CairnTidySettings.svelte:244
  const summaryFixes = $derived.by(() => {
    const parts: string[] = [];
    if (conv.fixes) parts.push('spelling', 'grammar', ...);
    if (rowOn('oxfordComma')) parts.push('commas');
    if (rowOn('timeFormat')) parts.push('time format');
    ...
```
```
src/lib/components/CairnTidySettings.svelte:258
  const summaryLeaves = $derived.by(() => {
    const parts: string[] = [];
    if (!rowOn('oxfordComma')) parts.push('commas');
```

The `switch` statements over `NormalizationKey` (4 and 5) are exhaustive and TypeScript will catch
a missing case there. Nothing catches a convention added to `styleRows` but missing from
`summaryFixes`, or added to `TidyConventions` but missing from `NormalizationKey` — the screen
would silently claim tidy "leaves alone" a convention it is actively applying.

**Remediation:** make one record the source: a `TIDY_CONVENTIONS` table in a shared module carrying
per key the config field, the display name, the variants, the diff example, the because-line, and
the summary phrase. Derive `NormalizationKey`, `styleRows`, `buildBecause`, `normalizationLabel`,
and both summary clauses from it. A unit test asserting `Object.keys(TIDY_CONVENTIONS)` covers
every non-`fixes` key of `TidyConventions` turns the remaining gap into a failing test.

---

## 7. `CairnTidySettings` writes config through eight `as unknown` assignment holes (rank 7, refactor)

```
src/lib/components/CairnTidySettings.svelte:219
  function toggleStyle(row: StyleRow) {
    if (rowOn(row.key)) {
      // Off: a multi-position field collapses to undefined; a boolean field to false.
      (conv[row.key] as unknown) = row.variants ? undefined : false;
    } else {
      (conv[row.key] as unknown) = defaultVariant(row);
    }
  }

  function toggleBool(key: keyof TidyConventions) {
    (conv[key] as unknown) = !rowOn(key);
  }

  function pickVariant(key: keyof TidyConventions, value: string) {
    (conv[key] as unknown) = value;
  }
```

Eight occurrences in total (222, 224, 229, 233, 278, 279, 282, 283). Casting the *assignment
target* to `unknown` is unusual TypeScript — it disables the compiler on the one operation in this
file that can produce an invalid config, which is then `JSON.stringify`'d and POSTed to
`?/settingsSave`. `pickVariant(key, value)` in particular accepts any `string` for any key, so
nothing prevents `pickVariant('timeFormat', 'always')`. The comment explains the *intent* of the
branch but never the cast, so a reader cannot tell whether the hole is deliberate or accumulated.

**Remediation:** type the write path rather than casting it. With the shared convention table from
finding 6, `pickVariant` becomes `<K extends NormalizationKey>(key: K, value: TidyConventions[K])`
and the toggles become `setConvention(row, on)` returning a correctly typed value per row.
No `as unknown` should survive.

---

## 8. `LoginPage` and `ConfirmPage` duplicate the whole unauthenticated page frame (rank 8, refactor)

The two pre-auth screens are the first cairn UI a new operator sees, and they repeat their entire
shell: the `<svelte:head>` triple, the `data-theme` bare wrapper with its explanatory comment, the
`min-h-screen` centering, the `max-w-sm card-shell` box, the wordmark with its audit-disable
comment, and the "Powered by Cairn" footer.

```
src/lib/components/LoginPage.svelte:51
    <!-- cairn-audit-disable-next-line type-scale -- the K4 keming fix raised the wordmark off text-xl because the rn pair merged and "Cairn" read "Caim"; the recipe is documented in docs/internal/admin-design-system.md. -->
    <span class="text-[1.375rem] font-semibold font-[family-name:var(--font-display)]">Cairn</span>

src/lib/components/ConfirmPage.svelte:40
      <!-- cairn-audit-disable-next-line type-scale -- the K4 keming fix raised the wordmark off text-xl because the rn pair merged and "Cairn" read "Caim"; the recipe is documented in docs/internal/admin-design-system.md. -->
      <span class="text-[1.375rem] font-semibold font-[family-name:var(--font-display)]">Cairn</span>
```

Both also carry the same broken nesting — the frame div's children are not indented under it,
the tell of a wrapper inserted by hand into two files rather than factored once:

```
src/lib/components/ConfirmPage.svelte:35
<div data-theme={data.theme ?? 'cairn-admin'}>
  <div class="flex min-h-screen flex-col items-center justify-center gap-section bg-base-200 p-4 text-base-content">
  <div class="w-full max-w-sm card-shell p-7 text-center card-shadow">
```
(and the matching un-indented closers at `ConfirmPage.svelte:64` / `LoginPage.svelte:132`)

The `theme?: 'cairn-admin' | 'cairn-admin-dark'` prop type and its four-line TSDoc are also
duplicated verbatim across both `Props` interfaces.

**Remediation:** extract `AuthFrame.svelte` (internal, not barrel-exported) taking `theme`,
`title`, and a `children` snippet, owning the head tags, the theme wrapper, the centering, the
card, the brand snippet, and the footer. Both screens become their content only. Hoist the theme
prop type to a shared `AdminTheme` alias.

---

## 9. Two obvious ways to import an icon; four screens in scope take the wrong one (rank 9, refactor)

`admin-icons.ts` states the rule in its own header:

```
src/lib/components/admin-icons.ts:1
// The fixed set of Lucide glyphs the admin chrome uses, each a per-icon import so only these ship.
// Components import from here, which keeps one import surface and documents the chrome's icon set.
```

Four screens in scope bypass it for glyphs the barrel already exports:

```
src/lib/components/VocabularyAdmin.svelte:34
  import CheckIcon from '@lucide/svelte/icons/check';
  import TagIcon from '@lucide/svelte/icons/tag';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
```
(`check`, `plus`, `trash-2` are all exported from `admin-icons.ts`; only `tag` is not)

```
src/lib/components/CairnTidySettings.svelte:41
  import CheckIcon from '@lucide/svelte/icons/check';
  ...
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
```
(`check`, `triangle-alert`, `arrow-right`, `list` are all in `admin-icons.ts`)

Also `ConceptList.svelte:17` (`eye-off`) and `LoginPage.svelte:10` (`mail-check`, `info`), where
the glyph genuinely is not in the barrel — but the fix there is to add it, not to bypass. The
practical cost is that `admin-icons.ts`'s claim to "document the chrome's icon set" is false, so an
agent reading it gets an incomplete picture of what the admin actually ships.

**Remediation:** add `tag`, `eye-off`, `mail-check`, `info`, `circle`, `settings`, `lock`,
`code-xml`, `sparkles` to `admin-icons.ts`; retarget every direct `@lucide/svelte/icons/*` import
in `src/lib/components/*.svelte` (excluding `admin-nav-icons.ts`, which is a deliberate allowlist);
add a `check:symbols`-style gate or an ESLint `no-restricted-imports` rule banning the direct path
outside those two modules.

---

## 10. The table-header class literal is written six times under two names (rank 10, refactor)

```
src/lib/components/ConceptList.svelte:220
  const headerLabel = 'type-label font-semibold uppercase tracking-[0.08em] text-muted';

src/lib/components/CairnHistory.svelte:57
  const headerLabel = 'type-label font-semibold uppercase tracking-[0.08em] text-muted';

src/lib/components/CairnMediaLibrary.svelte:1405
  const headerLabel = 'type-label font-semibold uppercase tracking-[0.08em] text-muted';

src/lib/components/ManageEditors.svelte:35
  // Eyebrow styling for the table column headers, matching the concept list.
  const col = 'type-label font-semibold uppercase tracking-[0.08em] text-muted';
```

plus the same literal inlined at `VocabularyAdmin.svelte:251`, `MarkdownHelpDialog.svelte:32-33`,
`PageHeader.svelte:66`, `OfficeList.svelte:40`, `CairnAdminShell.svelte:784`, and
`EditPage.svelte:1642`. Every consumer of `AdminTable` re-derives the header typography its own
way, one of them under a different name (`col`), one with a comment ("matching the concept list")
that is a hand-maintained cross-reference rather than a shared symbol.

**Remediation:** export `adminHeaderLabel` (or a `<TableHeaderCell>` snippet) from
`src/lib/admin-toolkit/` beside `AdminTable` — the toolkit already owns the table register — and
retarget all six screens plus the two toolkit components. Record it in the admin-toolkit reference
page, since it becomes public surface.

---

## 11. Client-only initialization and state reset are done four ways in one area (rank 11, note)

Same job, four mechanisms, all within these ten files:

```
src/lib/components/LoginPage.svelte:35
  onMount(() => {
    if (rootEl) warnIfChromeWrapped(rootEl);
  });

src/lib/components/HelpHome.svelte:89
  $effect(() => {
    hidden = localStorage.getItem(HIDDEN_KEY) === '1';
  });

src/lib/components/ConceptList.svelte:201
  $effect(() => {
    dateDefault = new Date().toISOString().slice(0, 10);
  });

src/lib/components/CairnMediaLibrary.svelte:228
  $effect(() => {
    void sorted.length;
    shown = PAGE;
  });
```

The last shape — a bare `void x;` statement written purely to register a reactive dependency —
appears three times (`:229` `void sorted.length`, `:510` `void replacePlan`, `:814` `void
altPlan`). It is framework-fighting: it is legible only to a reader who already knows Svelte 5's
dependency tracking, and it is fragile under any refactor that touches the read. `code-idioms.md`
S1 says "`$derived` for computed values, `$state` for genuine local mutability, never `$effect` for
derivation"; these are reset-on-change rather than derivation, so they are not literally banned, but
the charter names no obvious way for the reset case and the area has invented three.

Also: `HelpHome.svelte:89-94` reads and writes `localStorage` with no `try`/`catch`, so a browser
with site data blocked throws during the effect.

**Remediation:** pick one obvious way per case and record it in `code-idioms.md` §Svelte
components. Client-only init → `onMount` (the LoginPage shape). Reset-when-input-changes → a
`$derived` key plus `$state` keyed off it, or an explicit reset inside the handler that caused the
change (`selectTriage`, `onSearch`, `toggleSort` already exist and can call `shown = PAGE`
directly), which removes all three `void x;` lines. Wrap the `localStorage` pair in `try`/`catch`.

---

## 12. The component tests contradict T5, so the gate teaches the wrong idiom (rank 12, note)

`code-idioms.md:135` (T5): "Component queries prefer `getByRole`/`getByLabelText`; `querySelector`
only for structural assertions semantics cannot express; `getByTestId` retires."

`src/tests/component/CairnMediaLibrary.test.ts` makes **189** `querySelector`/`querySelectorAll`
calls, most of them querying the very roles `getAllByRole` expresses:

```
src/tests/component/CairnMediaLibrary.test.ts:268
    const radios = [...screen.container.querySelectorAll('[role="radio"]')];

src/tests/component/CairnMediaLibrary.test.ts:294
    await expect.poll(() => screen.container.querySelectorAll('[role="option"]').length).toBe(2);

src/tests/component/CairnMediaLibrary.test.ts:311
    let options = [...screen.container.querySelectorAll('[role="option"]')];
```

And `data-testid` still ships in the production markup the charter says should be retiring it —
six in `CairnMediaLibrary.svelte` (`cairn-replace-dialog`, `cairn-alt-dialog`, `cairn-bulk-dialog`,
`cairn-orphan-dialog`, `cairn-library-upload-dialog`, `cairn-broken-refs`) and one in
`VocabularyAdmin.svelte:174` (`vocab-mutation-live`).

Because the tests are the highest-signal example an agent reads before writing a new one, this
propagates: the next media test will be written with `querySelectorAll('[role="option"]')` because
189 neighbours were.

**Remediation:** sweep `CairnMediaLibrary.test.ts` (and its siblings) onto
`getAllByRole('option')` / `getByRole('radio', { name })` / `getByLabelText`, keeping
`querySelector` only where the assertion is genuinely structural (a class, a `data-` attribute, DOM
order). Retire the seven `data-testid` attributes with them. If any must stay, record the exception
in `code-idioms.md` rather than leaving T5 unmet.

---

## 13. Module orientation headers and one stale doc comment (rank 13, note)

`code-idioms.md:68` (M1): "Every module opens with a `// cairn-cms: <one-paragraph orientation>`
header naming its job and the non-obvious rationale." None of the five `.ts` modules in scope
carries the prefix, and one carries no orientation at all:

```
src/lib/components/media-base-context.ts:1
/** The Svelte context key a mounting context uses to hand admin media surfaces their delivery base. */
export const MEDIA_BASE_CONTEXT_KEY = 'cairn:media-base';
```
(a two-constant module with per-symbol docs but no module header; a reader cannot tell who sets the
context or what happens when nobody does — `CairnMediaLibrary.svelte:1395` holds that answer)

`tidy-categorize.ts:1`, `tidy-diff.ts:1`, `tidy-validate.ts:1`, and `media-upload-outcome.ts:1` all
open with good orientation paragraphs but without the `// cairn-cms:` marker, so the greppable
convention `client-action.ts:1` follows (`// cairn-cms: the fetch + devalue-deserialize + …`) does
not actually locate them. Repo-wide, 25 of the `src/lib/components/*.ts` modules are in the same
state, so M1 is aspirational rather than real.

Separately, `media-upload-outcome.ts` names only one of its two callers:

```
src/lib/components/media-upload-outcome.ts:1
// The pure upload-envelope to outcome mapper. The insert popover's optimistic loop posts the bytes
```
It is now called from `CairnMediaLibrary.svelte:439` and `:682` as well, and the TSDoc on
`uploadOutcome` (`:58`) still says "the single outcome **the popover** acts on".

Also minor: `tidy-validate.ts:32` declares `type TidyRejectionReason` without `export`, yet surfaces
it through the exported `TidyValidation` union, so a caller can read `.reason` but cannot name its
type.

**Remediation:** add `// cairn-cms:` headers to the five modules (and file the repo-wide sweep);
give `media-base-context.ts` a header naming `CairnAdminShell` as the provider and the bare-mount
fallback; reword `media-upload-outcome.ts`'s header and TSDoc to say "the upload callers" rather
than "the popover"; export `TidyRejectionReason`.

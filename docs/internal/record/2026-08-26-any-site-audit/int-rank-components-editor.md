# Internals audit — components-editor (the editing surface)

Repo: `/home/glw907/Projects/cairn-cms`, `main` @ `0406f1d5`.
Scope read: `EditPage.svelte` (2,920 lines, fully), `MarkdownEditor.svelte` (1,186, fully),
`EditorToolbar.svelte` (496, fully), `FieldInput.svelte` (322, fully), `PreviewBanner.svelte`,
`preview-doc.ts`, `markdown-reference.ts`, `editor-shortcuts.ts`, `editor-doc-lines.ts`,
`editor-modes.ts`, `editor-highlight.ts`, `editor-include.ts`, `editor-media.ts`,
`editor-placeholder.ts`, `editor-tidy.ts`, `editor-diagnostics-announcer.ts`,
`editor-suggestion-popover.ts` (all fully), `editor-folding.ts` and `markdown-directives.ts` /
`markdown-format.ts` (headers, export surface, structure), plus `client-action.ts`,
`segmented-control.ts`, `typed-confirm.ts`, `dialog-origin.ts`, `csrf-context.ts`,
`media-base-context.ts`, `topbar-context.ts`, `docs/reference/components.md`,
`docs/internal/code-idioms.md`, `.editorconfig`, `src/tests/unit/editor-boundary.test.ts`, and the
component test inventory.

## State of the area

The CodeMirror extension layer is the strongest code in the repo: `editor-tidy.ts`,
`editor-placeholder.ts`, `editor-include.ts`, `editor-media.ts`, and `editor-modes.ts` are
small, pure-where-possible StateField/ViewPlugin modules with honest TSDoc that states the
contract and the *why* (the atomic-range reasoning, the one-transaction accept, the
positions-mapped-across-changes invariant). A newcomer can read any one of them start to
finish and know what it does. The problem is everything above them. `EditPage.svelte` is a
2,920-line god component holding roughly a dozen unrelated feature domains, 76 `$state`
declarations, and 15 `$effect`s, and it reaches its children through a 33-prop imperative
`register*` seam on `MarkdownEditor` whose own reference page already concedes 19 of those
props are unstable. Beneath that sit four smaller but repeated one-obvious-way failures —
two latest-wins arbiters, two CodeMirror-module shapes, three context-access shapes, six
hand-rolled localStorage preferences — each of which the repo's own charter
(`docs/internal/code-idioms.md`) already names, and none of which a gate enforces. The
charter is doing the work a linter should: M1 headers are missing on 22 of 38
`components/*.ts`, and the whole tidy cluster is tab-indented against an `.editorconfig`
written specifically to record M4. Grade: **C+**. The extension modules are A-; the
composition layer is D and would embarrass the repo the way the ROADMAP already says
`CairnMediaLibrary.svelte` would — except `EditPage.svelte` is 2,920 lines and is not on that
list.

---

## 1. `EditPage.svelte` is a 2,920-line god component holding a dozen unrelated domains

**Tier: rewrite. Limb: multiple.**

`src/lib/components/EditPage.svelte` is 2,920 lines: 1,650 of `<script>` and 1,270 of
template. It declares 76 `$state` variables and 15 `$effect`s. In one file it owns:

- the topbar-portal registration and the zen band fold (`:132-149`)
- dirty tracking and the two-half leave guard (`beforeNavigate` + `beforeunload`, `:190-280`)
- a 78-line page-wide keydown router for eight chords (`:282-359`)
- the preview device preference and iframe srcdoc wiring (`:391-400`, `:538-541`)
- five more per-browser writing preferences (`:404-512`)
- the personal-dictionary commit round trip (`:454-490`)
- the entire tidy state machine: run, cancel, validate, offset, review, undo, plus three
  status dialogs (`:560-735`, `:2786-2857`)
- the figure control: prefill snapshot, wrap/update/unwrap, write-back (`:967-1027`)
- the share-preview mint/revoke/copy round trips (`:1107-1235`)
- the needs-alt advisory computation and its render mapping (`:1261-1312`)
- the word/issue counters and the prose-stripping helper (`:1451-1486`)
- the resolver derivations for link, media, and fragment (`:1488-1534`)
- the desk band snippet, the details slide-over, the footer strip, the below-sm bottom action
  bar, the zen chip, and eight headless dialog mounts

`docs/internal/code-idioms.md` ("Structural decisions") explicitly declined to split
`CairnMediaLibrary.svelte` this pass and filed it to ROADMAP instead. `ROADMAP.md:1609`
carries that item and says of `CairnMediaLibrary` at 3,141 lines:

> **Pre-beta polish: split `CairnMediaLibrary.svelte`** … **It is the file a code-reading
> stranger will judge the repo by.**

`EditPage.svelte` at 2,920 lines is 93% of that size, is the *centerpiece* of the product (it
is what the CMS is), and appears nowhere in the filed split work. Every argument in that
ROADMAP entry applies here verbatim, and the "six near-identical inline dialog controllers"
shape it describes is present here too (tidy-working / tidy-noop / tidy-message are three
near-identical `<dialog>` + `$effect`-to-`showModal` triples at `:584-595` and `:2804-2857`).

For an AI agent this is the single worst property of the area: a change to tidy, to the share
panel, to the figure control, or to the phone action bar all require loading the same 2,920
lines, and there is no file-level signal about which region owns what.

**Remediation.** File and execute an `EditPage` split pass with the same designed-pass rigor
the `CairnMediaLibrary` entry demands. The natural cut lines are already visible as
self-contained state clusters: `EditorTidyHost` (the whole tidy machine + its three dialogs),
`SharePreviewPanel` (mint/revoke/copy), `FigureControlHost` (prefill + apply/unwrap +
`writeFigureResult`), `EditorPreferences` (the six localStorage prefs and their setters, see
finding 10), `EditorAdvisories` (needs-alt + `renderNotices` + the live regions), and the desk
band snippet as its own `EditDeskBand.svelte`. Verify against the existing component suite plus
the `admin-visual` baseline. Add the ROADMAP entry in the same pass that files it, so the two
biggest components in the tree are tracked together.

---

## 2. The same-route reseed is a hand-maintained state list that already misses live state

**Tier: refactor. Limb: idiom.**

`EditPage` defends against SvelteKit's same-route component reuse with *two* mechanisms at
once: a `{#key entryKey}` wrapper around the whole template (`:1899`, closed `:2893`) and a
manual `$effect.pre` reseed of script state (`:1345-1368`):

```svelte
  const entryKey = $derived(data.conceptId + '/' + data.id);
  let seededKey = untrack(() => entryKey);
  $effect.pre(() => {
    const key = entryKey;
    if (key === seededKey) return;
    seededKey = key;
    untrack(() => {
      body = form?.body ?? data.body;
      saving = false;
      publishing = false;
      leaving = false;
      fieldsDirty = false;
      mode = 'write';
      detailsOpen = false;
      previewHtml = '';
      previewFailed = false;
      removedLinks = [];
      shareBusy = false;
      shareResult = null;
      shareError = null;
      shareCopied = false;
      revokeBusy = false;
      revokeCount = null;
      revokeError = null;
    });
  });
```

Seventeen assignments against 76 `$state` declarations. Nothing enforces the list, and it has
already fallen behind. Not reset: `uploadedRecords` (`:782`), all seven `tidy*` fields
(`tidyMode`, `tidyBusy`, `tidyReview`, `tidyMessage`, `tidyNoop`, `tidyApplied`,
`tidyAppliedBody`), `heroNeedsAlt` (`:778`), `caretComponent` (`:837`), `mediaAtCaret`
(`:842`), `figurePrefill` (`:971`), `diagnosticsCounts` (`:1482`), `editable`/`editReason`.

`uploadedRecords` is the concrete leak. It is script state declared outside the `{#key}` block
and rendered *into* the save form:

```svelte
        <input type="hidden" name="media" value={JSON.stringify(uploadedRecords)} />
```
(`:2305`, inside the keyed template)

The `{#key}` remounts that input, but the value it renders comes from surviving script state.
The banners at `:1932-1937` (delete-refused linkers) and `:2615-2619` ("Included in") are
same-route `<a href="/admin/{concept}/{id}">` links, so the hop is reachable from the UI: upload
an image while editing entry A, follow one of those links to entry B, save — B's save action
receives A's media records. `tidyApplied` surviving the same hop leaves the "Tidy applied /
Undo tidy" chip (`:1712-1720`) on an entry that was never tidied, wired to an undo that would
act on B's history.

**Remediation.** Drop the in-component reseed entirely and move the `{#key}` to the mount site
so SvelteKit destroys and recreates the whole component (script state included) on an entry
change — `{#key data.conceptId + '/' + data.id}<EditPage {data} … />{/key}` in `CairnAdmin.svelte`
and in the documented per-route mount. That makes correctness structural instead of a list
someone must remember to extend, and it removes the `seededKey` / `untrack` / `$effect.pre`
machinery. If the mount site cannot own it, at minimum add a test that asserts every `$state`
in the component is either in the reseed list or explicitly annotated as intentionally
persistent.

---

## 3. The `MarkdownEditor` seam is 33 props, 13 of them imperative `register*` callbacks

**Tier: rewrite. Limb: agent-extensibility.**

`MarkdownEditor.svelte`'s `interface Props` (`:29-152`) declares 33 props. Thirteen are
`register*` callbacks that hand a function upward on mount:

```
registerInsert, registerInsertLink, registerInsertImage, registerCaretCoords,
registerFocusEditor, registerImagePlaceholders, registerGetSelection,
registerGetSelectionRange, registerTidy, registerUndo, registerFormat,
registerReplaceRange, registerSelectRange
```

Each one costs the host a `$state.raw` holder with a no-op default plus a wiring line.
`EditPage.svelte:542-564` and `:743-757` are that ledger:

```svelte
  let insert = $state.raw<(text: string) => void>(() => {});
  let replaceRange = $state.raw<(from: number, to: number, text: string) => void>(() => {});
  let selectRange = $state.raw<(from: number, to: number) => void>(() => {});
  let insertLink = $state.raw<(href: string, title: string) => void>(() => {});
  let getSelection = $state.raw<() => string>(() => '');
  let getSelectionRange = $state.raw<() => { from: number; to: number } | null>(() => null);
  let format = $state.raw<(kind: FormatKind) => void>(() => {});
  …
  const noopPlaceholders: import('./editor-placeholder.js').ImagePlaceholderApi = {
    begin: () => 0, progress: () => {}, resolveTo: () => {}, cancel: () => {},
  };
```

and thirteen matching `register…={(fn) => (x = fn)}` lines at `:2273-2288`. `MarkdownEditor`
already proves the better shape exists twice in its own file: `registerTidy` hands over a
`TidyApi` object and `registerImagePlaceholders` hands over an `ImagePlaceholderApi` object.
One `EditorApi` covering the other eleven ops would collapse 13 props, 13 holders, 13 no-op
defaults, and 13 wiring lines into one prop, one holder, and one guard.

`docs/internal/code-idioms.md` N3 freezes this vocabulary ("the `register*`/`on*` seam
vocabulary on `MarkdownEditor` is frozen by its documented contract"), but the standing ruling
is that migration cost never discounts a finding and churn is free until beta — and the
reference page itself already declares 19 of these props unstable
(`docs/reference/components.md:648-680`, "a site that reaches past `EditPage` for one of these
should expect it to move or change shape"). The freeze is protecting a surface its own docs
disclaim.

**The stable/unstable split also exists only in prose, and it has already drifted.** The doc's
stable list names 11 props and its unstable table names 19, totalling 30 of 33. Three props on
the engine's flagship public seam are documented nowhere:

```
fragmentTitles      MarkdownEditor.svelte:52   — 0 hits in docs/reference/components.md
onDiagnosticsCounts MarkdownEditor.svelte:139  — 0 hits
registry            MarkdownEditor.svelte:151  — 0 hits for MarkdownEditor
                                                 (the 3 hits are CairnAdmin/EditPage props)
```

`check:reference` gates undocumented *exports*, not component props, so nothing caught this.
CLAUDE.md's own rule — "a public-API change is not done until its reference page matches" —
has no gate behind it for the component tier.

**Remediation.** (a) Collapse the eleven remaining `register*` props into one
`registerEditor?: (api: EditorApi) => void`, modelled on the `TidyApi`/`ImagePlaceholderApi`
shape already in the file; keep `bind:value`, `name`, and the plain reactive props as-is.
(b) Express the stability split in the types, not the doc — `interface Props extends
StableEditorProps, EditPageWiringProps` — so an agent reads the tier off the code.
(c) Extend `check:reference` (or add a `check:component-props`) to diff each exported
component's `interface Props` keys against its reference page's documented prop names.

---

## 4. Two competing latest-wins arbiters, and the canonical one is buried in `spellcheck.ts`

**Tier: refactor. Limb: comprehension.**

The repo ships two exported, TSDoc'd helpers that solve exactly the same problem with inverted
polarity.

`src/lib/components/spellcheck.ts:282-303` — the one the charter's A3 rule names as the
exemplar:

```ts
export interface SeqArbiter {
  /** The next monotonic seq, recorded as the current run. */
  next(): number;
  /** True when this seq is still the latest one issued or accepted, false for a stale answer. */
  accept(seq: number): boolean;
}
export function arbitrateChecked(): SeqArbiter { … }
```

`src/lib/components/client-action.ts:46-66` — a second one, in the module whose own header
points at it:

```ts
export interface RequestGuard {
  /** Claim the next sequence token for a fresh call. */
  next: () => number;
  /** Whether `token` has been superseded by a later `next()` call. */
  isStale: (token: number) => boolean;
}
export function createRequestGuard(): RequestGuard { … }
```

Call sites split cleanly by accident of authorship, not by need:

```
arbitrateChecked : spellcheck.ts:567, ComponentInsertDialog.svelte:147,
                   EditPage.svelte:902, EditPage.svelte:1597
createRequestGuard: CairnMediaLibrary.svelte:458, CairnMediaLibrary.svelte:754
```

Worse for comprehension: `EditPage.svelte:81` imports a *generic concurrency primitive* from a
776-line spellcheck module (`import { arbitrateChecked } from './spellcheck.js';`), so does
`ComponentInsertDialog.svelte:64`. No agent grepping for "latest wins", "stale", or "guard"
in an admin component would find it there, and the module that *does* advertise a guard in its
header offers the other one.

**Remediation.** Keep one. Move `SeqArbiter`/`arbitrateChecked` out of `spellcheck.ts` into
`client-action.ts` (or a new `sequence-guard.ts`), retire `createRequestGuard`/`RequestGuard`,
repoint the two `CairnMediaLibrary` call sites, and update A3's exemplar path in
`docs/internal/code-idioms.md` in the same commit.

---

## 5. Two shapes for a CodeMirror extension module, and the stated reason for one applies to the other

**Tier: refactor. Limb: agent-extensibility.**

An agent adding a CodeMirror extension to this editor has to pick between two shapes with no
rule telling it which:

**Shape A — static import, dynamically loaded.** `editor-highlight.ts`, `editor-modes.ts`,
`editor-folding.ts`, `editor-media.ts`, `editor-include.ts`, `editor-placeholder.ts`,
`editor-tidy.ts` all `import { Decoration, ViewPlugin, … } from '@codemirror/view'` at module
scope and rely on `MarkdownEditor`'s `onMount` dynamic import to keep them off the server.

**Shape B — module injection.** `editor-diagnostics-announcer.ts:11-14`,
`editor-suggestion-popover.ts:13-17`, and `spellcheck.ts` take the loaded modules as a
parameter:

```ts
export interface DiagnosticsAnnouncerModules {
  view: typeof import('@codemirror/view');
  lint: typeof import('@codemirror/lint');
}
```

The reason given for shape B, at `MarkdownEditor.svelte:753-754`, applies word for word to the
seven shape-A modules:

> // Hand the lint source the editor's own CodeMirror module instances so its extension lands on the
> // same copies; a separate dynamic import can resolve to a different instance and break instanceof.

`editor-tidy.ts`, `editor-media.ts`, and `editor-placeholder.ts` all construct `Decoration`s and
`WidgetType` subclasses that CodeMirror `instanceof`-checks, so they carry the identical hazard
and take the opposite mitigation. `docs/internal/code-idioms.md` ("Deliberately not
standardized") sanctions "the two lazy CodeMirror loading shapes (batch-in-onMount vs
cached-module import)" — but that names a *loading* fork, not this *dependency-acquisition*
fork, and it does not resolve the contradiction above.

The gate compounds it. `src/tests/unit/editor-boundary.test.ts:67-75` is a hand-maintained
allowlist:

```ts
  const DYNAMIC_ONLY = [
    'editor-highlight.ts', 'editor-modes.ts', 'editor-folding.ts', 'editor-media.ts',
    'editor-include.ts', 'editor-placeholder.ts', 'editor-tidy.ts',
  ];
```

A new shape-A module fails the suite with a list-membership error rather than a message
teaching the rule, and the list encodes the fork rather than a principle.

**Remediation.** Pick one shape and state it in `code-idioms.md` as an N-rule with an
exemplar. Shape B is the defensible one (it is instance-safe by construction and needs no
allowlist); converting the seven shape-A modules also lets `DYNAMIC_ONLY` shrink to zero and
turns the boundary test into an unconditional "no component module value-imports `@codemirror/*`"
assertion — a gate that teaches instead of one that enumerates.

---

## 6. Three shapes for reading Svelte context in one directory

**Tier: refactor. Limb: idiom.**

`src/lib/components/topbar-context.ts` is the right shape — a `Symbol` key plus typed
`provideTopbar`/`useTopbar` accessors:

```ts
const TOPBAR_CONTEXT_KEY = Symbol('cairn-topbar');
export function useTopbar(): TopbarHolder | undefined {
  return getContext<TopbarHolder | undefined>(TOPBAR_CONTEXT_KEY);
}
```

Its two siblings are bare string keys with no accessor, so every consumer re-types the generic
by hand:

```ts
// csrf-context.ts — the whole file
export const CSRF_CONTEXT_KEY = 'cairn:csrf';

// media-base-context.ts — the whole file
export const MEDIA_BASE_CONTEXT_KEY = 'cairn:media-base';
export const DEFAULT_MEDIA_BASE = '/media';
```

Nine call sites repeat the generic and, for media-base, the `?? DEFAULT_MEDIA_BASE` fallback:

```
CsrfField.svelte:16, MediaHeroField.svelte:102, MediaInsertPopover.svelte:82,
CairnMediaLibrary.svelte:323, EditPage.svelte:462
  → getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY)

MediaHeroField.svelte:108, MarkdownEditor.svelte:195, MediaPicker.svelte:62,
CairnMediaLibrary.svelte:1395
  → getContext<string | undefined>(MEDIA_BASE_CONTEXT_KEY) ?? DEFAULT_MEDIA_BASE
```

A wrong generic at any one of the nine compiles fine and fails at runtime. The string keys are
also collision-prone in a library that mounts inside a consumer's own component tree, where the
`Symbol` key is not.

**Remediation.** Give `csrf-context.ts` and `media-base-context.ts` the `topbar-context.ts`
shape: a `Symbol` key, a `provide*` setter, and a `use*` accessor that carries the type and the
default. Repoint the nine call sites. Three modules, one pattern.

---

## 7. M1 module headers are missing on 22 of 38 `components/*.ts`, and one header lies

**Tier: refactor. Limb: comprehension.**

`docs/internal/code-idioms.md` M1: "Every module opens with a `// cairn-cms: <one-paragraph
orientation>` header naming its job and the non-obvious rationale." In this area the marker is
the exception, not the rule. Missing on:

```
editor-folding.ts   editor-highlight.ts   editor-include.ts   editor-media.ts
editor-modes.ts     editor-placeholder.ts editor-shortcuts.ts editor-tidy.ts
markdown-directives.ts  markdown-format.ts  markdown-reference.ts
media-base-context.ts   media-upload-outcome.ts  csrf-context.ts  topbar-context.ts
paste-html-to-markdown.ts  spellcheck-worker.ts  tidy-categorize.ts  tidy-diff.ts
tidy-validate.ts  chrome-guard.ts  admin-*.ts  cairn-favicon.ts
```

Present on `client-action.ts`, `client-ingest.ts`, `dialog-origin.ts`,
`editor-diagnostics-announcer.ts`, `editor-doc-lines.ts`, `editor-suggestion-popover.ts`,
`index.ts`, `link-completion.ts`, `objective-errors.ts`, `preview-doc.ts`,
`segmented-control.ts`, `spellcheck.ts`, `typed-confirm.ts`.

Most of the missing files *do* carry a good orientation paragraph — they just do not carry the
greppable `cairn-cms:` marker, which is the half that makes M1 mechanically useful.
`markdown-format.ts` additionally uses a `/** */` JSDoc block where every sibling uses `//`.

**The `markdown-format.ts` header is also no longer true.** It says:

```ts
/**
 * Pure markdown selection transforms for the editor toolbar. Each call maps a document and a
 * selection range to a new document and a new selection, with no DOM. …
 */
```

Half its 14 exports are not selection transforms at all: `findMediaImagesNeedingAlt` (`:214`)
scans a whole document for accessibility debt, and `FigureAtImage`/`figureAtImage` (`:434`),
`wrapImageInFigure` (`:482`), `updateFigure` (`:518`), `unwrapFigure` (`:534`), and
`unwrapCairnLink` (`:249`) are a remark-AST figure/media editing domain — the file imports
`unified`, `remark-parse`, `remark-gfm`, `remark-directive`, and `unist-util-visit` that the
header never mentions. An agent asked to "add a toolbar format" and an agent asked to "change
figure wrapping" both land in the same 541-line file, and the header helps only the first.

**Remediation.** (a) Add the `// cairn-cms:` marker to the 22 files, keeping the existing
prose. (b) Add a `check:module-headers` gate (a directory scan asserting line 1 matches
`^// cairn-cms: `) so M1 stops being an honor rule — this is exactly the CLAUDE.md watch-item
conversion ("converting a watch into a failing test is the gold standard"). (c) Split
`markdown-format.ts` into `markdown-format.ts` (the toolbar selection transforms, no remark
dependency) and `markdown-figures.ts` (the AST figure/media domain), and rewrite both headers
to describe what they now hold.

---

## 8. The tidy cluster is tab-indented against `.editorconfig` and M4, with no gate

**Tier: refactor. Limb: idiom.**

`.editorconfig` exists solely to record this rule:

```ini
# cairn-cms: records the code-idiom charter's M4 rule (indentation is 2-space everywhere) so an
# editor enforces it going forward instead of relying on a one-time sweep to hold.
[*]
indent_style = space
indent_size = 2
```

Five files in this directory are tab-indented (count of lines starting with a literal tab):

```
302  src/lib/components/tidy-categorize.ts
161  src/lib/components/editor-tidy.ts
130  src/lib/components/tidy-diff.ts
 81  src/lib/components/tidy-validate.ts
 30  src/lib/components/chrome-guard.ts
```

`editor-tidy.ts` is a load-bearing editor module (the tidy StateField and `TidyApi`), so this
is not an out-of-the-way corner. The comment's own claim — "so an editor enforces it going
forward instead of relying on a one-time sweep" — is false in practice: `.editorconfig` is
advisory to editors and nothing in `npm run check` reads it.

**Remediation.** Reindent the five files to two spaces in one mechanical commit, and add the
indentation assertion to the gate — either an `editorconfig-checker` step or an ESLint
`indent`/`no-tabs` rule scoped to `src/lib`. Prettier is not currently arbitrating these files;
if it is meant to, wire `--check` over `src/lib` into `npm run check`.

---

## 9. `EditPage` duplicates within itself: a factored helper beside its own inline copy, one glyph seven times, two icon idioms

**Tier: refactor. Limb: comprehension.**

**(a) The failure-message helper exists and is not used by one of its two callers.**
`EditPage.svelte:1148-1153` factors the shape:

```ts
  function previewFailureMessage(outcome: { data?: unknown; sessionExpired?: boolean }, expired: string, generic: string): string {
    if (outcome.sessionExpired) return expired;
    const failure = outcome.data as { error?: unknown } | undefined;
    if (typeof failure?.error === 'string' && failure.error !== 'csrf') return failure.error;
    return generic;
  }
```

`:653-661`, in the same file, is that function inlined:

```ts
        if (outcome.sessionExpired) {
          tidyMessage = 'Your session expired. Sign in again to tidy.';
          return;
        }
        const failure = outcome.data as { error?: unknown } | undefined;
        tidyMessage =
          typeof failure?.error === 'string' && failure.error !== 'csrf'
            ? failure.error
            : 'Tidy could not finish. Try again.';
```

Same `'csrf'` special case, same fallback ladder. Three client actions in this file
(`runTidy`, `mintPreview`, `revokePreview`) post through `postFormAction`; two share the
helper and one does not.

**(b) The check glyph is inlined seven times, once inside the snippet that exists to prevent
that.** `moreCheck()` at `:2006-2008` is a snippet holding the glyph. Six byte-identical copies
of the same 200-character `<svg>` follow at `:2403`, `:2412`, `:2427`, `:2436`, `:2449`,
`:2461` — the Prose, Wide, Focus mode, Typewriter, Spellcheck, and Zen footer toggles. Each
already calls `segButtonClass`/`ftrToggleClass` for its tint; the glyph beside it was never
lifted. `segmented-control.ts`'s header justifies keeping the cue local "since its markup
differs by control" — here it is identical seven times in one file.

**(c) Two icon idioms in one component.** `EditPage.svelte` imports 10 Lucide icons
(`:26-34`, `:52`) and hand-inlines 11 raw `<svg>` elements (the overflow ellipsis `:1771`, the
advisory warning triangle `:1968`, the image icon `:2190`, the details close X `:2496`, plus the
seven checks). A reader cannot tell which icons come from where or which idiom to use for the
next one.

**(d) `str()` is defined twice.** `EditPage.svelte:1636` and `FieldInput.svelte:81` are the
identical three-line function, in files that already import from each other's directory.

**Remediation.** Route `runTidy` through `previewFailureMessage` (renaming it
`actionFailureMessage` and moving it to `client-action.ts` beside `postFormAction`, where the
third caller `commitPendingDictionary` can also reach it). Replace the six inline checks with
`{@render moreCheck()}`. Pick one icon idiom — Lucide for anything Lucide ships, a shared
`strokeIcon` snippet (the one `EditorToolbar.svelte:239` already defines) for the rest — and
hoist `str()` to a `components/format.ts` internal.

---

## 10. Six per-browser preferences, hand-rolled six times with five decode idioms

**Tier: refactor. Limb: idiom.**

`EditPage` persists six preferences, each with its own key constant, its own line in a shared
read effect, and its own setter (`:391-512`). No two decode the stored value the same way:

```ts
  const deviceStorageKey = 'cairn-editor-preview-device';
  const focusStorageKey = 'cairn-editor-focus-mode';
  const typewriterStorageKey = 'cairn-editor-typewriter';
  const surfaceStorageKey = 'cairn-editor-surface';
  const zenStorageKey = 'cairn-editor-zen';
  const spellcheckStorageKey = 'cairn-editor-spellcheck';
  …
    const stored = localStorage.getItem(deviceStorageKey);
    if (previewDevices.some((d) => d.id === stored)) device = stored as PreviewDeviceId;   // membership + cast
  …
    focusMode = localStorage.getItem(focusStorageKey) === 'true';                          // === 'true'
    typewriter = localStorage.getItem(typewriterStorageKey) === 'true';
    zen = localStorage.getItem(zenStorageKey) === 'true';
    if (localStorage.getItem(surfaceStorageKey) === 'markup') surface = 'markup';          // literal match
    ownSpellcheck = localStorage.getItem(spellcheckStorageKey) !== 'false';                // !== 'false'
```

`HelpHome.svelte:86-98` repeats the pattern a seventh time with a `=== '1'` decode. Every
access is unguarded: a browser with site data blocked throws on `localStorage.getItem`, which
would take down the whole read effect and, with it, all six preferences.

Adding a seventh preference today means touching four places (key constant, read line, setter,
and the footer + `moreExtra` toggle markup) with nothing linking them.

**Remediation.** One internal `editorPreference<T>(key, decode, encode, fallback)` factory in
`components/editor-preferences.ts` returning `{ get, set }` with a `try/catch` around both
sides, and one `EDITOR_PREFERENCES` record naming the six. The read effect collapses to a
loop; a seventh preference becomes one record entry plus its control.

---

## 11. The editing surface's tests are unfindable: three filename conventions, a 3,367-line flat file, and plan numbers in describe titles

**Tier: refactor. Limb: agent-extensibility.**

Tests for two components are spread across eleven files under three naming conventions:

```
EditPage.test.ts                      MarkdownEditor.test.ts
EditPage-insert.test.ts               markdown-editor-theme-polarity.test.ts
edit-page-advisories.test.ts          editor-a11y.test.ts
edit-page-field-hint.test.ts          editor-pref-isolation.test.ts
edit-page-preview-share.test.ts       EditorToolbar.test.ts
edit-page-publish-visibility.test.ts
edit-page-spellcheck-override.test.ts
edit-page-v2-fields.test.ts
```

PascalCase, PascalCase-with-suffix, and kebab-case all name tests for `EditPage.svelte`. An
agent asked to "add a test for the zen chip" has no rule telling it which file or which
convention to use.

`EditPage.test.ts` is 3,367 lines with 2,338 of them before the first nested `describe`:

```
124:describe('EditPage', () => {
2463:  describe('zen', () => {
2633:  describe('the Edit-block round-trip control', () => {
2834:  describe('tidy (the host action driver)', () => {
3073:  describe('desk band collisions at phone widths (audit finding 2)', () => {
3157:  describe('phone-desk composition (design-arc C1, docs/internal/2026-07-15-design-arc-log.md)', () => {
3303:  describe('guarded Figure control emphasis (audit finding 7)', () => {
```

`MarkdownEditor.test.ts` is 1,679 lines with all 84 `it`s under a single
`describe('MarkdownEditor')` (`:96`).

Three of the seven describe titles carry plan/audit numbers, against T3 ("component tests
describe by UI region; titles are present-tense sentences with no plan-task numbers"). "audit
finding 2" and "audit finding 7" are unresolvable to any reader who was not in that pass.

The seven client-only extension modules also have no unit tests of their own: grepping the
whole `src/tests` tree for `editor-tidy`, `editor-media`, `editor-include`,
`editor-placeholder`, `editor-folding`, or `editor-highlight` returns only
`editor-boundary.test.ts` (which reads them as text) plus indirect coverage through
`MarkdownEditor.test.ts` and `tidy-review.test.ts`. Their pure halves (`buildDecorations`,
`matchesInLine`, `resolveTitle`, `buildSet`) are unit-testable without a browser and are not
unit-tested.

**Remediation.** Settle on one convention — kebab-case by region, `edit-page-<region>.test.ts` —
and rename the four PascalCase files. Split `EditPage.test.ts`'s 2,338-line prologue into
region files matching the component split from finding 1, so a test file per child component
falls out of that work. Rewrite the three numbered describe titles as present-tense sentences.
Add unit tests for the pure builders in the extension modules.

---

## 12. `FieldInput` mutates `EditPage`'s `$state` through a non-bindable prop, and the code calls the warning benign

**Tier: note. Limb: idiom.**

`FieldInput.svelte:271-275`:

```svelte
  <!-- The ownership_invalid_mutation warning this logs is benign: the parent owns the $state
       proxy and mutates it by reference, and the hero-alt focus flow reads the same prefixed key. -->
  <MediaHeroField
    bind:this={heroFieldRefs[name]}
```

`heroFieldRefs` is a plain (non-`$bindable`) prop that is `EditPage.svelte:777`'s `$state`
proxy, passed straight through at `:2516`. Svelte logs `ownership_invalid_mutation` on
essentially every `EditPage` mount in the component suite. `FieldInput.svelte:303-306` does the
same to `frontmatter`:

```svelte
              onChange={(glyph) => {
                frontmatter[field.name] = glyph;
```

This is filed on `ROADMAP.md:891-897` with the fix already written out, so it is known — but it
is still live, and the in-code comment declaring a framework warning "benign" is the part that
misleads. A newcomer or an agent reading that comment learns the wrong lesson: that Svelte 5's
ownership warnings are noise. The repo's own `S1` rule and the framework both say otherwise.

**Remediation.** Take the ROADMAP fix (`$bindable()` on `FieldInput`'s `heroFieldRefs` plus
`bind:heroFieldRefs` at the call site, or a `registerHeroField(name, ref)` callback prop) and
do the same for `frontmatter` (an `onvalue(name, value)` callback). Delete the "benign"
comment rather than reword it.

---

## 13. Small idiom drift: a `.then` chain against A1, and two hand-rolled copies of `docLines`

**Tier: note. Limb: idiom.**

**(a)** A1 says "async/await only; no `.then` chains." `EditPage.svelte:912-930` is a 19-line
`.then().catch()` chain inside an `$effect`:

```ts
    void componentRoundTripSafety(current.markdown, def)
      .then((result) => {
        if (!editableArbiter.accept(run) || caretComponent !== current) return;
        …
      })
      .catch(() => {
        …
      });
```

An async IIFE with `try/catch` is the shape the rest of the repo uses and reads better against
the arbiter guard. (The one-line `void tick().then(…)` tail-calls elsewhere are a different,
acceptable idiom; this is not one.)

**(b)** `editor-doc-lines.ts` exists to be the one full-document line read:

```ts
export function docLines(view: EditorView): string[] {
  const doc = view.state.doc;
  const lines: string[] = [];
  for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
  return lines;
}
```

`editor-include.ts:104`, `editor-highlight.ts:178`, and `editor-modes.ts:71` use it. Two
call sites do not:

```ts
// editor-media.ts:190
  const lines = view.state.doc.toString().split('\n');

// MarkdownEditor.svelte:1026-1028
    const doc = state.doc;
    const lines: string[] = [];
    for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
```

The `MarkdownEditor` copy is the helper's body verbatim, working from an `EditorState` rather
than an `EditorView`. The `editor-media` copy has different performance characteristics
(a full document stringify per rebuild) than the helper it bypasses.

**Remediation.** Convert the `.then` chain to an async IIFE. Overload `docLines` to accept an
`EditorState` (or add `docLinesFromState`) and repoint both call sites, so the module's stated
role — "the one full-document line-array read" — becomes true.

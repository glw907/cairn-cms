# The reproduction story audit

The per-story mechanism record for the live-reproduction seam. Task A1 of the plan
`docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md` produced it; tasks A3 through
A6b execute against it, and cairn-pub's Pass 2 dispatches cite it by this path. The path is
frozen: do not move or rename this file.

The contract for what each story must SHOW is the per-page outline record,
[`2026-08-15-docs-outlines-with-visuals.md`](./2026-08-15-docs-outlines-with-visuals.md). The
contract for ids and flags is the spec, cairn-pub
`docs/superpowers/specs/2026-08-15-live-reproduction-seam-design.md`. This record settles only the
mechanism: which component mounts, `shell` or `bare`, props or pose, what has to be exported, and
what has to become injectable.

Every claim below carries file:line evidence read from the tree at
`ed417b55`. Line numbers drift; the named symbol is the durable part.

## How to read a row

- **Component.** The smallest component that contains what the contract names. Framing comes from
  picking the component, never from cropping the render.
- **Host.** `shell` means the story renders as the child of `CairnAdminShell` with the fixture
  `navLayout`. `bare` means it mounts on its own inside `ReproContext`.
- **Mechanism.** `props` when the contracted state is reachable by construction, `pose` when it
  lives in internal component state and needs a post-mount step. Props win wherever both work.

## The 25 rows

### `auth/login`

- **Component:** `LoginPage` (`src/lib/components/LoginPage.svelte`), exported at
  `src/lib/components/index.ts:13`.
- **Host:** `bare`. The page renders its own `data-theme` root and is the signed-out surface, so no
  shell wraps it.
- **Mechanism:** props. `Props` at `LoginPage.svelte:17` takes `data` (`siteName`, `error`, `csrf`,
  `theme`) and `form`; the resting sign-in state is `form: null`, `data.error: null`
  (`LoginPage.svelte:22`, `:26`, `:29`).
- **Own theme root:** yes. `data.theme` is rendered onto the page's own wrapper
  (`LoginPage.svelte:22`), so the story takes the theme as a fixture prop.
- **Exports needed:** none.
- **Fixes needed:** none.

### `auth/confirm`

- **Component:** `ConfirmPage` (`src/lib/components/ConfirmPage.svelte`), exported at
  `src/lib/components/index.ts:14`.
- **Host:** `bare`, for the same reason as `auth/login`.
- **Mechanism:** props. `Props` at `ConfirmPage.svelte:12`: `data` (`token`, `siteName`, `error`,
  `csrf`, `theme`) and an optional `form` defaulting to null (`ConfirmPage.svelte:24`). The
  contracted state is the resting confirm page with its **Confirm sign-in** button.
- **Own theme root:** yes, `ConfirmPage.svelte:17`.
- **Exports needed:** none.
- **Fixes needed:** none.

### `editor/entry-screen`

- **Component:** `EditPage` (`src/lib/components/EditPage.svelte`), exported at
  `src/lib/components/index.ts:20`.
- **Host:** `shell`. The lifecycle band renders through the topbar context portal, not in a header
  of `EditPage`'s own: `EditPage` registers a `desk` snippet into the holder
  `CairnAdminShell` provides (`src/lib/components/topbar-context.ts:33`, `:41`;
  `CairnAdminShell.svelte` calls `provideTopbar`). Outside a provider the fold is simply absent
  (`topbar-context.ts`, the `theme` member's doc comment says so in as many words), so a bare mount
  renders the document body with no band.
- **Mechanism:** props. The contract wants the resting Write tab: title field, toolbar with both
  tabs, the Details trigger in the header, the writing surface. `mode` defaults to `'write'`
  (`EditPage.svelte:362`) and `detailsOpen` to `false` (`EditPage.svelte:1056`), which is exactly
  the resting state. The full prop bag is `data`, `registry`, `render`, `icons`, `form`,
  `previewMint` (`EditPage.svelte:83`).
- **Markers:** yes. This is one of the three locate-many-controls screens. Keys frozen in the
  manifest: `title-field`, `toolbar`, `write-preview-tabs`, `details-trigger`, `writing-surface`.
- **Exports needed:** none.
- **Fixes needed:** the shell theme override (fix 2), inherited from `host: 'shell'`.

### `editor/toolbar`

- **Component:** `EditorToolbar` (`src/lib/components/EditorToolbar.svelte`). Not exported from the
  `/components` barrel; see "The export question" below.
- **Host:** `bare`. The toolbar is a strip that takes every input as a prop and reads no context.
- **Mechanism:** props. `Props` at `EditorToolbar.svelte:36`: `format`, `mode`, `onMode`, `device`,
  `onDevice`, `insertControls`, `moreExtra`, `onHelp`. The contract's own instruction is "one
  toolbar reproduction at the section top locates the groups," not "its four groups visible," a
  phrase that appears nowhere but a prior draft of this row: the component names three labelled
  clusters (Format, Structure, Insert) plus a persistent help control it deliberately does not call
  a cluster, never four groups. `insertControls` must be supplied so the Insert group renders
  rather than sitting empty; the rest are no-op callbacks. The clusters' own micro-eyebrow labels
  are themselves `sm:`-and-up, a fact the manifest's `column`-alone declaration does not yet act
  on; this row stays a watch item, not a fix, since no contracted control it names is hidden below
  a breakpoint the way `write-preview-tabs` was.
- **Exports needed:** none.
- **Fixes needed:** none.

### `editor/sidebar-list`

- **Component:** `ConceptList` (`src/lib/components/ConceptList.svelte`), exported at
  `src/lib/components/index.ts:16`.
- **Host:** `shell`. The contract names "the concept sidebar" alongside the Posts list, and the
  sidebar is the shell's drawer, not part of `ConceptList`.
- **Mechanism:** props. `Props` at `ConceptList.svelte:30`: `data: ListData` and an optional `form`
  defaulting to null (`ConceptList.svelte:39`). Status badges and the **New post** button all read
  from `data.entries` (`ConceptList.svelte:72`).
- **Exports needed:** none.
- **Fixes needed:** the shell theme override (fix 2).

### `editor/preview-tab`

- **Component:** `EditPage`.
- **Host:** `shell`.
- **Mechanism:** **pose**. `mode` is internal state with no prop (`EditPage.svelte:362`), and the
  device trigger only joins the capsule while Preview shows (`EditorToolbar.svelte:36`, the
  `onDevice` doc). The pose clicks the Preview tab. The story also needs the `render` prop so the
  preview pane has output to show (`EditPage.svelte:83`).
- **Exports needed:** none.
- **Fixes needed:** the shell theme override (fix 2).

### `editor/details-panel`

- **Component:** `EditPage`.
- **Host:** `shell`.
- **Mechanism:** **pose**. `detailsOpen` is internal state with no prop (`EditPage.svelte:1056`)
  and `openDetails()` moves focus into the panel. The pose clicks the Details trigger.
- **Exports needed:** none.
- **Fixes needed:** the shell theme override (fix 2).

### `editor/figure-dialog`

- **Component:** `MediaFigureControl` (`src/lib/components/MediaFigureControl.svelte`). Not
  exported from the barrel.
- **Host:** `bare`.
- **Mechanism:** props. **Corrects the spec's "pose or bare" to bare-and-props.**
  `MediaFigureControl` is a plain `<form>` root (`MediaFigureControl.svelte:92`), not a dialog of
  its own, and every contracted control is a prop: `caption`, `role`, `mode`, `decorative`,
  `onapply`, `onunwrap` (`MediaFigureControl.svelte:32`, `:49`). Reaching the same surface through
  `EditPage` would need a caret-on-an-image pose against `mediaAtCaret`
  (`EditPage.svelte:824`) and `figureDialog` (`EditPage.svelte:827`), which is a longer route to a
  strictly larger render. `mode: 'edit'` renders the same fold this row exists to picture, `Unwrap`
  and `Update figure` (`MediaFigureControl.svelte:242-244`), not the strings a prior draft of this
  sentence claimed: **Edit the figure at the cursor** is `EditPage`'s own toolbar label
  (`EditPage.svelte:847`) and **Edit figure** its dialog heading (`EditPage.svelte:2685`), neither
  of which `MediaFigureControl` renders itself.
- **Exports needed:** none.
- **Fixes needed:** none.

### `editor/tidy-review`

- **Component:** `TidyReview` (`src/lib/components/TidyReview.svelte`). Not exported from the
  barrel.
- **Host:** `bare`.
- **Mechanism:** props. The review opens itself: an `$effect` calls `dialog.showModal()` once on
  mount (`TidyReview.svelte:161`). Every hunk's category and objective flag are derived from
  `categorize(c, original, conventions)` (`TidyReview.svelte:85`), not from `changes` alone: `original`
  and `conventions` are the ONLY data source for the category inference
  (`TidyReview.svelte`'s own `conventions` doc comment). `isObjective` is true only for spelling,
  typo, doubled, and whitespace (`tidy-categorize.ts:34-41`); **Review this** is the `undecided`
  state a non-objective hunk gets (`TidyReview.svelte:129`). So "one change marked
  **Review this**" is a joint `original`/`changes`/`conventions` fixture-data choice, not an
  interaction and not `changes` alone. The prop bag is `changes`, `original`,
  `conventions`, `model`, `title`, `api`, `onclose`, `onshow`.
- **Note for A2:** the fixture must compose `original`, `changes`, and `conventions` jointly, so at
  least one change lands outside the four objective kinds. `fixtureTidyReview` (frozen names below)
  does this: `resolveTidyConventions(undefined)` enables no normalization, so a doubled word and a
  misspelling categorize as objective and an appended multi-token clause categorizes as `grammar`.
- **Exports needed:** none.
- **Fixes needed:** none.

### `editor/collapsed-layout-block`

- **Component:** `MarkdownEditor` (`src/lib/components/MarkdownEditor.svelte`), exported at
  `src/lib/components/index.ts:23`.
- **Host:** `bare`.
- **Mechanism:** props. **Corrects the spec's `pose` flag.** `foldOnMount` is a real prop
  (`MarkdownEditor.svelte:144`, defaulting to false at `:185`); when true the editor calls
  `foldContainersOnLoad(view)` right after the view mounts (`MarkdownEditor.svelte:858`,
  `src/lib/components/editor-folding.ts:509`), so a `value` carrying a layout block opens already
  collapsed to its pill with the gutter control beside it. The `registry` prop resolves the pill's
  human label (`MarkdownEditor.svelte:746`).
- **Exports needed:** none.
- **Fixes needed:** none.

### `publish/header-band`

- **Component:** `EditPage`.
- **Host:** `shell`, and load-bearing here: the band is the `desk` snippet `EditPage` registers into
  the shell's topbar holder (`topbar-context.ts:33`). A bare mount renders no band at all, so this
  row cannot be `bare`.
- **Mechanism:** **pose**. The contract names the *opened* overflow menu; `actionsOpen` is internal
  state with no prop (`EditPage.svelte:1028`). The pose opens it.
- **Two widths:** the only row that declares `desktop` and `narrow` rather than `column`. The
  narrow face is real and automatic: `narrow` tracks
  `matchMedia('(max-width: 639.98px)')` (`EditPage.svelte:1040`), and an iframe's content treats
  the iframe box as its viewport, so a 390px iframe renders the phone bottom bar with no override.
- **Exports needed:** none.
- **Fixes needed:** the shell theme override (fix 2).

### `publish/history-list`

- **Component:** `CairnHistory` (`src/lib/components/CairnHistory.svelte`), exported at
  `src/lib/components/index.ts:21`.
- **Host:** `shell`.
- **Mechanism:** props. `Props` at `CairnHistory.svelte:24`: `data: HistoryData` plus an optional
  `form` defaulting to null (`:36`). The unpublished-draft row, the who-and-when, and the
  **Revert** buttons all render from `data`.
- **Exports needed:** none.
- **Fixes needed:** the shell theme override (fix 2).

### `publish/pending-list`

- **Component:** the surface belongs to `CairnAdminShell` itself: the topbar's
  "Publish site (N)" trigger (`CairnAdminShell.svelte:644`) and the grouped confirm dialog
  (`CairnAdminShell.svelte:731`, grouping at `:309`). The story's mounted child is `WelcomeView`
  (`src/lib/components/index.ts:28`), a calm one-`EmptyState` body that keeps the frame on the
  shell chrome the contract is about.
- **Host:** `shell`.
- **Mechanism:** **pose**. The dialog opens through `publishAllDialog.showModal()` from the trigger
  (`CairnAdminShell.svelte:647`); there is no prop for it. The pose clicks "Publish site (N)".
  The count and the groups themselves are prop-reachable: `data.pendingEntries` is an already
  resolved `Promise` on the fixture (`src/lib/sveltekit/content-routes-core.ts:103`).
- **Exports needed:** none.
- **Fixes needed:** the shell theme override (fix 2).

### `publish/refusal-banner`

- **Component:** `ConceptList`.
- **Host:** `bare`, as the spec flags.
- **Mechanism:** props. The refused-delete banner renders from `form`
  (`ConceptList.svelte:41`, markup at `:312`), and that markup's own comment records that it
  matches the editor's refusal banner, which is the shape `when-something-goes-wrong.md` is about.
- **Why not `EditPage`:** `EditPage`'s broken-link banner (`EditPage.svelte:1873`, driven by
  `form.brokenLinks` at `:1214`) is equally prop-reachable, but it drags the whole editor,
  CodeMirror included, into a render whose whole subject is one banner. The smallest-component
  rule picks `ConceptList`. If the editors rewrite decides the save-refusal wording specifically
  must be the pictured one, this row moves to `EditPage` and stays `bare` and props-only; nothing
  else about it changes.
- **Exports needed:** none.
- **Fixes needed:** none.

### `media/insert-panel`

- **Component:** `MediaInsertPopover` (`src/lib/components/MediaInsertPopover.svelte`). Not
  exported from the barrel.
- **Host:** `bare`.
- **Mechanism:** **pose**. The popover mounts headless by default; `trigger: true` renders the
  built-in button (`MediaInsertPopover.svelte:55`) and `open('chooser')` is an instance export
  (`:134`) a DOM-only pose cannot call. The pose clicks the rendered trigger.
- **Note for A2:** the fattest required prop bag of any row. `editor` is a four-method seam object
  (`MediaInsertPopover.svelte:64`); `open()` calls `editor.caretCoords()` synchronously
  (`:135`), the very thing the pose triggers, so the fixture stub must exist and *deliberately*
  return `null` (the documented centered fallback), not be omitted. `onuploaded` is a callback
  (`:72`), `library` a hash-keyed record (`:60`). The row also reads `CSRF_CONTEXT_KEY`
  (`MediaInsertPopover.svelte:82`), which `ReproContext` supplies in A4, matching the two other
  media rows this table already flags for it.
- **Exports needed:** none.
- **Fixes needed:** the media public base (fix 1). The popover composes `MediaPicker` for its reuse
  search, and `MediaPicker`'s thumbnails resolve through `publicPath` at `MediaPicker.svelte:244`.
  `editor-media.ts` is the CodeMirror chip decoration `MarkdownEditor` builds, a different call
  site, not this row's; it stays correctly listed under `editor/entry-screen`'s fix.

### `media/upload-form`

- **Component:** `MediaCaptureCard` (`src/lib/components/MediaCaptureCard.svelte`). Not exported
  from the barrel.
- **Host:** `bare`.
- **Mechanism:** props. The card is explicitly presentational, not a dialog
  (`MediaCaptureCard.svelte:5`). Its `Props` are `file`, `oncapture`, `submitLabel`
  (`MediaCaptureCard.svelte:38`). The contract's two features fall straight out of the file: a
  real stem yields the **Suggested** tag (`:52`) and `altMode` starts unset so both the describe
  and decorative choices show (`:60`).
- **Note for A2:** the `file` prop is a real `File`. The fixture set must expose one constructible
  synchronously (bytes inline, not fetched), and the stem must be a real name rather than a camera
  stem or the Suggested tag will not render. The card previews through
  `URL.createObjectURL(file)` (`:69`), so it needs no media base.
- **Exports needed:** none.
- **Fixes needed:** none.

### `media/lead-picture-dialog`

- **Component:** `MediaHeroField` (`src/lib/components/MediaHeroField.svelte`). Not exported from
  the barrel.
- **Host:** `bare`.
- **Mechanism:** **pose**. The resting field is a slim dropzone; editing opens a native
  `<dialog class="modal">` (`MediaHeroField.svelte:27`, element at `:477`) through `openDialog()`'s
  own `dialog.showModal()` (`:194`, `:202`), invoked from the edit control's
  `onclick={() => openDialog('placement')}` (`:427`), with no prop for it. The pose reaches this
  path, not `:374`, which lands in the drop handler (`onDropzoneDrop`) and its own separate
  `showModal()` call. The 16:9 social-crop preview lives inside that dialog (`:503`). The pose
  clicks the edit control. The story sets `lead: true` so the social-card line renders (`:63`) and a
  committed `value` so the preview has an image.
- **Exports needed:** none.
- **Fixes needed:** the media public base (fix 1): the committed thumbnail resolves through
  `publicPath` at `MediaHeroField.svelte:133`, `:237`, `:347`. Also the CSRF context
  (`MediaHeroField.svelte:101`), which `ReproContext` supplies in A4.

### `media/library`

- **Component:** `CairnMediaLibrary` (`src/lib/components/CairnMediaLibrary.svelte`), exported at
  `src/lib/components/index.ts:17`.
- **Host:** `shell`.
- **Mechanism:** props. The contract's resting screen is the default: `query` empty, `triage`
  `'all'`, `density` `'grid'` (`CairnMediaLibrary.svelte:160`). Counts, search, the grid/list
  toggle, and the three filters all render at rest.
- **Markers:** yes. Keys frozen in the manifest: `count-header`, `search`, `view-toggle`,
  `filters`.
- **Exports needed:** none.
- **Fixes needed:** the media public base (fix 1), `CairnMediaLibrary.svelte:1391`; the shell theme
  override (fix 2); CSRF context (`:322`).

### `media/details-panel`

- **Component:** `CairnMediaLibrary`.
- **Host:** `shell`.
- **Mechanism:** **pose**. `selected` is internal state with no prop
  (`CairnMediaLibrary.svelte:241`) and the panel is the slide-over it drives (`:249`). The pose
  clicks one tile.
- **Exports needed:** none.
- **Fixes needed:** as `media/library`.

### `media/bulk-selection`

- **Component:** `CairnMediaLibrary`.
- **Host:** `shell`.
- **Mechanism:** **pose**. `selectedHashes` is an internal `Set` with no prop
  (`CairnMediaLibrary.svelte:960`). The pose checks three thumbnails so the selection bar shows its
  count, **Select all**, and **Delete**.
- **Exports needed:** none.
- **Fixes needed:** as `media/library`.

### `media/delete-in-use`

- **Component:** `CairnMediaLibrary`.
- **Host:** `shell`.
- **Mechanism:** **pose**. The confirmation is a native dialog behind internal state
  (`CairnMediaLibrary.svelte:251`, the typed confirm at `:868`). The pose selects the fixture's
  in-use asset and opens delete.
- **Note for A2:** the fixture library needs one asset the usage overlay marks in use by a fixture
  entry, or the what-would-break list renders empty and the row shows the wrong face.
- **Exports needed:** none.
- **Fixes needed:** as `media/library`.

### `tags/screen`

- **Component:** `VocabularyAdmin` (`src/lib/components/VocabularyAdmin.svelte`), exported at
  `src/lib/components/index.ts:27`.
- **Host:** `shell`.
- **Mechanism:** props. `Props` at `VocabularyAdmin.svelte:42`: `data: VocabularyLoadData` and an
  optional `form` (`:50`). Every element the contract names is data-driven: the trash icon versus
  the use count (`:298`), the not-on-this-list section (`:339`), the Add field, and the
  **Save changes** button. The stored-form line under the Add field appears as the author types
  (`:193`), so it is the one contracted detail that is not in the resting render; the caption
  carries it, per the page contract, and no pose is added for it.
- **Markers:** yes. Keys frozen in the manifest: `add-field`, `tag-list`, `unused-tag`,
  `not-on-list`, `save-changes`.
- **Exports needed:** none.
- **Fixes needed:** the shell theme override (fix 2).

### `roster/own-row`

- **Component:** `ManageEditors` (`src/lib/components/ManageEditors.svelte`), exported at
  `src/lib/components/index.ts:22`.
- **Host:** `shell`.
- **Mechanism:** props. `data.self` is the reader's own email; `Props` is declared at
  `ManageEditors.svelte:20` and destructured at `:32`. The disabling logic itself is
  `isSelf = editor.email === data.self` (`:106`), read by the `disabled` bindings on both
  branches' role control (`:122`, `:133`, `:140`) and the row's Remove action (`:146`). The story
  sets `data.self` to the fixture editor's address.
- **Exports needed:** none.
- **Fixes needed:** the shell theme override (fix 2).

### `nav/worked-navlayout`

- **Component:** the surface belongs to `CairnAdminShell`: the resolved sidebar renders from
  `data.nav` (`src/lib/sveltekit/content-routes-core.ts:85`) in the drawer side
  (`CairnAdminShell.svelte:850`), and the unreferenced trailing group after the divider is the
  shell's own behavior (`CairnAdminShell.svelte:871`). The story's mounted child is `WelcomeView`,
  as for `publish/pending-list`.
- **Host:** `shell`.
- **Mechanism:** props. The whole contract is `data.nav`, a `ResolvedNavLayout` the fixture
  supplies.
- **Not `NavTree`:** `NavTree` (`src/lib/components/NavTree.svelte`) edits the *site's public
  menu*, not the admin sidebar; `CairnAdmin` mounts it for the nav page
  (`src/lib/components/CairnAdmin.svelte:102`). The `organize-your-admin-nav.md` contract is about
  `navLayout`, the admin sidebar, so `NavTree` is the wrong component for this row.
- **Exports needed:** none.
- **Fixes needed:** the shell theme override (fix 2).

### `toolkit/custom-screen`

- **Component:** none exists. **This row deviates from the spec's rule that a story mounts one of
  the package's own components.** The contract is the worked snippet in
  `docs/extend/add-a-custom-admin-screen.md` under "Compose the screen": a site-authored screen
  composed from `PageHeader`, `OfficeList`, `AdminTable`, and `StatusChip`. There is no such
  component in the package, and there should not be: the toolkit's charter is general-purpose
  primitives, and the page's own prose says a component rendering one of cairn's content concepts
  has no place in it. A5b through A6b build the story's component inside the reproductions module,
  composing only the exported `@glw907/cairn-cms/admin-toolkit` primitives, and it must stay a
  transcription of the doc snippet rather than a nicer screen.
- **Host:** `shell`. The contract's whole point is the composed screen sitting inside
  `CairnAdminShell`.
- **Mechanism:** props (the snippet's own `data.events`).
- **Exports needed:** none. The primitives are already on `/admin-toolkit`
  (`src/lib/admin-toolkit/index.ts`).
- **Fixes needed:** the shell theme override (fix 2).

## The export question: no new export-map entry

**No story needs a new public export.** Six of the mounted components are absent from the
`/components` barrel (`src/lib/components/index.ts`): `EditorToolbar`, `TidyReview`,
`MediaFigureControl`, `MediaCaptureCard`, `MediaInsertPopover`, `MediaHeroField`. The
reproductions module ships inside this package, so `src/lib/reproductions/stories/*.ts` reaches
each one by a relative source import; nothing crosses the package boundary, and the exported
surface a consumer sees is `getStory(id).component`, never the component's own subpath.

This **corrects the spec's assumption** that "Screen parts the contract needs that the package does
not yet export get exported as part of the seam build." Exporting them would be net harmful, not
merely unnecessary:

- The barrel's membership rule is exact and written down (`src/lib/components/index.ts:1`): the
  view tier, plus their composed parts, never a reusable building block. Adding six part-level
  names for docs' sake widens a surface the library then owes an upgrade guarantee on.
- The surface-pruning pass of 2026-07-01 *demoted* four names from this barrel on that reasoning,
  and `src/tests/unit/components-barrel-prune.test.ts` holds the resulting keep list. Re-adding
  parts would push against a deliberate prior decision with no consumer asking for it.
- Every new export costs an export-map entry, a `check:surface` snapshot line, and a documented
  reference signature. Six of them buy nothing the relative import does not already give.

So tasks A5a, A5b, A6a, and A6b modify neither `src/lib/components/index.ts` nor `package.json`.
The only export-map growth in Pass 1 is the two reproductions subpaths themselves (A1 adds
`./reproductions/manifest` so the dist-spawn probe can resolve; A4 adds `./reproductions`).

**One caveat scoped narrower than "the list is empty" would read: a prop still widens an
already-exported component.** Task A3 adds `themeOverride` to `CairnAdminShell`, which is already
on the barrel, and A4b-1 similarly adds `spellcheckOverride` to `EditPage` (fix 3). Neither is a
barrel or export-map change, so this section's own claim holds; but each still grows what a
publicly exported component takes, and no gate catches it (`check:reference` and
`check:reference:signatures` read `.d.ts` exports, not Svelte prop interfaces). "For A8" below
carries the follow-up decision for `themeOverride`.

## The injectability fix list (Task A3 executes this)

### Fix 1: the media public base

`publicPath` takes a `publicBase` parameter defaulting to `/media`
(`src/lib/media/naming.ts:129`, the default at `:134`). Every admin caller passes four arguments
and takes the default, so every `img src` an admin media surface renders is hardcoded under
`/media`:

| Caller | Line |
| --- | --- |
| `src/lib/components/CairnMediaLibrary.svelte` | 1391 |
| `src/lib/components/MediaPicker.svelte` | 237 |
| `src/lib/components/MediaHeroField.svelte` | 133, 237, 347 |
| `src/lib/components/editor-media.ts` | 89 |

Four files, six call sites. The resolution `media/config.js` already implies is `publicBase`
(`src/lib/media/config.ts:20`, resolved at `:108`); the fix honors that one mechanism rather than
inventing a parallel one. `editor-media.ts` is the editor surface's own path, the CodeMirror chip
decoration `MarkdownEditor` builds, so it is `editor/entry-screen`'s call site. `media/insert-panel`
renders through a different one in this same table: the popover composes `MediaPicker`, whose
reuse-search thumbnails resolve through `MediaPicker.svelte`'s own listed line, not
`editor-media.ts`. Fix 1 covers both.

### Fix 2: the shell's own theme resolution

`CairnAdminShell` owns its theme and will not take direction:

- The seed reads `data.theme` **untracked**, deliberately, so a later prop change does not reach it
  (`CairnAdminShell.svelte:267`, `:269`). A mounting context cannot prop-update the theme today.
- An `$effect` reads `document.cookie` for `cairn-admin-theme` and falls back to
  `matchMedia('(prefers-color-scheme: dark)')` (`CairnAdminShell.svelte:275`, `:276`, `:277`). On
  the repro route, where no admin cookie exists, a dark-OS reader gets a dark shell no matter what
  the docs page's theme is.
- `toggleTheme` writes the cookie back through `writeAdminCookie`
  (`CairnAdminShell.svelte:283`, the writer at `:63`).

A3 makes the theme a settable, reactive prop override that also skips both the cookie read and the
`prefers-color-scheme` read. Fifteen of the 25 stories are `host: 'shell'`, so this fix is what
makes `ownThemeRoot` true for all of them, and it is what lets Pass 2's `DocsRepro` prop-update
instead of re-mounting.

### Fix 3: the editing surface's spellcheck Worker (Task A4b-1 executes this)

Added by the 2026-08-17 verification sweep, whose finding 7 the fix list was one item short of. The
editing surface checks spelling by default (`MarkdownEditor.svelte:179`), the lint plugin schedules
its first run from its own constructor, and that run calls `ensureWorker()`
(`src/lib/components/spellcheck.ts:730`), which starts a module Worker and fetches a wasm binary and
a 1.5MB dictionary through `import.meta.url`. `EditPage` took no lever: its `spellcheck` was
`$state(true)` seeded from `localStorage` (`:406`, `:421`) and its prop bag was `data`, `registry`,
`render`, `icons`, `form`, `previewMint`. Five editor stories therefore paid a Worker and two asset
fetches per embed.

The chain was confirmed by running it, not by reading it:
`src/tests/component/edit-page-spellcheck-override.test.ts` counts Worker constructions with the
global constructor swapped, and the no-override case constructs one within a second of mount.

A4b-1 adds `spellcheckOverride` on `EditPage` (the frozen-names table below). Opt-in and absent by
default: with no override the stored preference and the footer toggle decide exactly as before.

### Fix 4: CodeMirror's theme polarity (Task A4b-1 executes this)

Added by the same sweep, finding 8. `const isDark = host.closest('[data-theme]')…` was read once
inside `onMount` (`MarkdownEditor.svelte:263`) and baked into three `EditorView.theme(…, { dark })`
calls, with no reactive re-read. A theme flip under a mounted editor therefore left CodeMirror's own
base chrome (the autocomplete tooltip, the panels, the selection layer, the parts the admin sheet
does not reach) on its first-mount polarity: a light editor inside a dark shell. That defeats fix
2's headline benefit, since prop-updating `themeOverride` is exactly such a flip, and it is a
standing defect in the real admin too, where the topbar toggle flips the same attribute.

A4b-1 puts the base theme in its own compartment beside the media and include ones, rebuilds all
three themes at the new polarity on a change, and swaps both compartments in one transaction, so the
doc, the history, and the caret survive. A `MutationObserver` on the theme root is what notices,
since the polarity comes from an ancestor's attribute rather than a prop. A mount is unchanged: the
polarity read and the extensions built from it are the same, and an editor under no theme root
observes nothing.

### Not fixes: two matchMedia reads that are already correct

Recorded so a later pass does not "fix" them by mistake. An iframe's content treats the iframe box
as its viewport, so both of these read the reproduction's own width and are exactly right:

- `CairnAdminShell.svelte:222` tracks the `lg` and `xl` persistent-sidebar breakpoints.
- `EditPage.svelte:1040` tracks `(max-width: 639.98px)` for the narrow band. This is what makes
  `publish/header-band`'s 390px render show the phone bottom bar with no story-side override.

### A watch item, not a fix: editor preferences in localStorage

`EditPage` keeps zen, focus mode, typewriter, spellcheck, the surface posture, and the preview
device in `localStorage` (`EditPage.svelte:404`, `:411`, `:414`, `:383`). The component project
clears it per test for exactly this reason (`src/tests/component/_setup.ts`). No story's pose
writes one of these today, and every reproduction goes `inert` after its pose, so nothing persists
across `/repro` pages on the cairn.pub origin. **If a later pose ever toggles one of these, it will
leak into every other story on the same origin, and a leaked `zen: true` removes the toolbar
entirely.** Whoever adds such a pose owes a reset alongside it.

### Out of fix 1's reach: the editor preview's own media resolver

**A5a's `editor/preview-tab` fixture body must carry no media image.** Fix 1 makes every media
surface's base injectable, but the editor's preview pane is not one of them. `EditPage` builds its
own resolver internally (`EditPage.svelte:1436`, `manifestMediaResolver` from
`src/lib/render/resolve-media.ts:140`) out of `data.mediaTargets` and hands it to the render at
`:1545`. That resolver takes `publicPath`'s hardcoded `/media` default and no story can reach past
it. The narrowing is deliberate and predates this pass: `src/lib/sveltekit/preview.ts:236` names it
in a code comment, and the C2 breaking-window agenda records it. So an image in the preview pane
would request `cairn.pub/media/...` from a `/repro` page, which is the production R2 bucket rather
than the fixture bytes.

Keeping the image out of that one fixture body is the whole fix, and it costs the story nothing:
`write-in-the-editor.md`'s contract for this row is the Preview tab and its width control, not an
illustrated preview. Widening the resolver is a separate decision against a deliberate prior
narrowing, and it is not this pass's to make.

### For A8: the shell's reference page understates its props

`docs/reference/components.md` prints `CairnAdminShell`'s signature as
`let { data, children }: { data: AdminShellData; children: Snippet }`, which A3's `themeOverride`
now makes incomplete. No gate catches it: `check:reference` and `check:reference:signatures` read
`.d.ts` exports, not Svelte prop interfaces. A8 decides whether the prop is advertised as an
Extension-API prop, with the upgrade guarantee that tier implies, or documented as the mounting
seam the reproductions module uses. Either way the page stops understating the component. If it is
advertised, one behavior belongs in the same sentence: under an override the topbar's theme toggle
still flips the shell's own theme and writes the `cairn-admin-theme` cookie, while the render keeps
showing the override, so the control reads as inert. Reproductions never click it, since a story
goes `inert` after its pose.

## Frozen names

The exact names fix 1 and fix 2 expose, plus the two Task A2 froze beyond the plan's list. Tasks A4
through A6b and cairn-pub's B3 cite this table rather than re-deriving the names.

| Name | Kind | Where | What it is |
| --- | --- | --- | --- |
| `MEDIA_BASE_CONTEXT_KEY` | Svelte context key, value `'cairn:media-base'` | `src/lib/components/media-base-context.ts` | The key a mounting context sets to a plain string base. Read by `CairnMediaLibrary`, `MediaPicker`, `MediaHeroField`, and `MarkdownEditor`, each falling back to `DEFAULT_MEDIA_BASE` when absent. |
| `DEFAULT_MEDIA_BASE` | exported const, `'/media'` | `src/lib/components/media-base-context.ts` | The fallback every media surface resolves to with no provider, the same default `publicPath` carries. |
| `publicBase` | second parameter of `cairnMediaDecorations`, defaulting to `DEFAULT_MEDIA_BASE` | `src/lib/components/editor-media.ts` | The editor chip's base. `editor-media.ts` is a CodeMirror extension, not a component, so `MarkdownEditor` reads the context and hands the base in here. Nothing else constructs this extension. |
| `themeOverride` | prop on `CairnAdminShell`, `'cairn-admin' \| 'cairn-admin-dark'` optional | `src/lib/components/CairnAdminShell.svelte` | The theme a mounting context owns. Reactive: a prop change re-renders the shell, so `DocsRepro` updates the prop instead of re-mounting. Present, it suppresses both the `cairn-admin-theme` cookie read and the `prefers-color-scheme` read. Absent, the shell resolves its own theme exactly as before. |
| `fixtureCaptureFile` | exported const, a `File` | `src/lib/reproductions/fixtures.ts` | A synchronously constructible `File` (bytes inline, never fetched), the `MediaCaptureCard` prop `media/upload-form` mounts. Its stem is a real name, so the Suggested tag renders. |
| `FixtureEntry` | exported interface | `src/lib/reproductions/fixtures.ts` | `EntrySummary` plus `concept` (always `fixtureConcept.id`) and an optional `history` (`HistoryData`, present only on the entry `publish/history-list` mounts). The element type of `fixtureEntries`. |
| `spellcheckOverride` | prop on `EditPage`, optional boolean | `src/lib/components/EditPage.svelte` | The spellcheck posture a mounting context owns (fix 3). Present, it wins over the stored preference and the footer toggle, so `false` opens an editor that starts no Worker and fetches no wasm or dictionary. Absent, the author's own preference decides exactly as before. |
| `settle` | optional member of `ReproStory`, `(root: HTMLElement) => Promise<void>` | `src/lib/reproductions/index.ts` | The post-mount wait for a contracted surface that exists only after hydration, run before `pose`. The four rows that need one are `editor/collapsed-layout-block`, `editor/entry-screen`, `editor/preview-tab`, and `editor/details-panel` through `MarkdownEditor`, plus `publish/pending-list` through its `{#await}`. A5a and A5b write them. |
| `fixtureTidyReview` | exported const, `{ original: string; changes: Change[]; conventions: TidyConventions }` | `src/lib/reproductions/fixtures.ts` | `editor/tidy-review`'s `original`, `changes`, and `conventions` props, composed jointly (not derived from `changes` alone, the audit's own earlier, wrong claim) so one hunk categorizes outside the four objective kinds and renders **Review this**. |
| `fixtureDeskPathname` | exported const, a string | `src/lib/reproductions/fixtures.ts` | The `/admin/<fixtureConcept.id>/<id>` pathname `CairnAdminShell`'s `isDeskRoute` recognizes (three segments, `segs[1]` a real concept id), composed from `fixtureConcept` and a real `fixtureEntries` id so it cannot drift from either. A shell story mounting `EditPage` needs this pathname or the shell silently renders office chrome. |

Every new capability is opt-in and absent by default: the admin tree sets no media-base context,
passes no `themeOverride` and no `spellcheckOverride`, so a real admin mount renders exactly what it
rendered before A3 and A4b. Fix 4 is the one exception worth naming, and it is a repair rather than
a new capability: an editor whose theme root changes after mount now follows it, which no host could
opt into, and which the real admin's own topbar toggle has always wanted.

## Declared heights

The manifest's per-width heights are the prerendered iframe heights hydration later refines, not a
promise about the render. Twenty rows declare `column` alone, the responsive default embed. Five do
not, and a row declaring only the widths its page can render at is what makes the fence schema
refuse to picture a screen at a size that cannot show it. A responsive fence against one of those
five fails gate 1 for want of a declared height, which is the correct answer.

- **`publish/header-band`, `desktop` and `narrow`.** The page pins both faces, and a responsive band
  render is not a thing that page asks for.
- **`editor/sidebar-list` and `nav/worked-navlayout`, `wide` alone.** Half of the first row's
  contract and all of the second's is the shell's sidebar, a drawer that sits persistently open only
  from `lg` (1024) off a desk path and `xl` (1280) on one
  (`CairnAdminShell.svelte:561-563`). Below that the subject is off-canvas. At 1280 the fixed nav
  stack governs the height (the content column is the part that widens), so both are sized by that
  one measurement: 620.
- **`editor/entry-screen` and `editor/preview-tab`, `desktop` alone.** Both name controls inside the
  toolbar's `sm:`-gated wrapper (`EditorToolbar.svelte:423`): the frozen `write-preview-tabs` marker
  on the first, the Preview tab the second's pose clicks. 860 clears that 640 gate and stays under
  the sidebar breakpoint, so the width goes to the document body. Both keep 760, the same box, so a
  page showing them together reads as one screen switching tabs.

The `wide` width itself is an amendment: the spec's fence schema carried `narrow` (390) and
`desktop` (860) only, which is why the sweep found three rows pinned to widths that cannot show
their subject. Geoff ratified `wide` (1280) in response (cairn-pub spec `4d9e492`).

The bands used, and why:

- **Bare parts, 220 to 560.** A toolbar strip, a form card, a popover, a banner. Sized to what the
  component's own markup occupies at the docs column width with nothing under it.
- **Modal reviews, 620.** `editor/tidy-review` and `media/lead-picture-dialog` render a centered
  modal; the height is the dialog's comfortable box, not a full screen.
- **Shell screens, 620 to 760.** A shell render carries the topbar, the sidebar, and the body. 620
  suits the two rows pinned wide, where the nav stack is the tallest column; 640
  suits a list or roster; 760 suits the entry screen and its posed variants, which carry the
  editor surface as well.
- **`publish/header-band`, 180 desktop and 300 narrow.** Desktop is the band plus its opened
  overflow menu. Narrow is taller because the phone face puts the bar at the bottom of the shell
  viewport, so the render has to contain the whole short screen for the bar to sit where it really
  sits.

## Containment, and the one fidelity change it costs

Seam Pass 2 moved containment into `ReproContext` itself (the ratified design is
`docs/internal/record/2026-08-18-repro-containment-design.md`). A mounted story is inert from first
paint, a modal dialog a story opens is marked inert as it opens, and five window-level event types
are stopped before any handler sees them.

One thing about the picture changes, in seven of the 25 rows, and it is recorded here rather than
denied. `cairn-admin.css:519` paints `outline: 2px solid var(--color-primary)` at `2px` offset on
any `:focus-visible` element under either admin theme root, and both `showModal()` and a plain
programmatic `.focus()` flip `:focus-visible` to true with no prior real user interaction. A
reproduction frame receives no real user interaction, so every one of these seven sat in the
keyboard-focus branch and painted the ring. Containment removes it, because nothing ends up focused.

| Story | Focused by | What loses the ring |
|---|---|---|
| `editor/tidy-review` | `TidyReview.svelte:163` `showModal()` | the "Cancel review" icon button |
| `publish/pending-list` | `CairnAdminShell.svelte:678` `showModal()` | the dialog header's Close button |
| `media/lead-picture-dialog` | `MediaHeroField.svelte:202` `showModal()` | the dialog header's Close button |
| `media/delete-in-use` | `CairnMediaLibrary.svelte:305` `showModal()` | the first in-use entry's link, in the alertdialog's "These would break" list |
| `editor/details-panel` | `EditPage.svelte:1080` `detailsClose?.focus()` | the panel's Close X |
| `media/details-panel` | `CairnMediaLibrary.svelte:261` `closeButton?.focus()` | the slide-over close |
| `media/insert-panel` | `MediaInsertPopover.svelte:145` `panel?.focus()` | the whole panel container, which carries `tabindex="-1"`; the largest single delta in the set |

The direction the change runs is not obvious and matters. A real mouse user opening Tidy or the
Details panel sees no ring, because a trusted pointer interaction flips `:focus-visible` off. So
these seven reproductions used to show the KEYBOARD face of each screen, and containment flips all
seven to the MOUSE face. That is arguably the more faithful picture, since a reader arriving at a
docs page has not tabbed into anything. It is still a change, so: **alt text and captions authored
later against any of these seven must not describe a focus ring.**

`src/tests/component/reproductions-containment.test.ts` holds the claim to a falsifiable form, one
case per row: the element named above is still in the mounted container, and the container matches
no `:focus-visible` element. The first assertion is what makes the case discriminate, since a
container that rendered nothing at all matches no `:focus-visible` element either. If a future
change re-introduces a focused control in one of these stories, that case fails and this table is
what gets corrected.

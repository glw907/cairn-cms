# The reproduction story audit: verification sweep

The ranked findings from the eleven-agent read-only sweep run 2026-08-17, after Task A4 of the
live-reproduction seam plan and before the story tasks. Eight verifiers took three to four of the
audit's 25 rows each and checked every claim against the real components; two adversarial lenses
ran across the whole set, one hunting mount-time failure and one asking whether the audit is
trustworthy as a document; one ranker spot-checked the top findings itself and ordered them.

Task A4b folds these. The sweep found no defect in the audit's core method: it settled which
component each story mounts and how to reach its state, and those verdicts held. What it never
asked was whether the render would be wide enough to show the subject, which is the class the
three Tier 1 findings belong to. Geoff ratified the `wide` width in response (cairn-pub spec
`4d9e492`).

The `notFullyChecked` section at the end is the honest coverage boundary and is worth reading
before trusting any row this sweep did not reach. Nothing here was mounted; every claim rests on
static reading.

## Ranked findings

Verified against source myself: the shell drawer breakpoints and its path-change `$effect` (`CairnAdminShell.svelte:561-563`, `:268-273`, `:431-434`), the sm-gated tablist wrapper (`EditorToolbar.svelte:423`), `MarkdownEditor`'s server render and hydration boundary (`:1123-1127`, `:240`, `:865`, `:886`), `isDark` as a `const` with exactly four references, `EditPage`'s prop bag (`:106`) and its internal `spellcheck` state (`:406`, `:421`), the lint plugin's constructor-scheduled first run (`@codemirror/lint/dist/index.js:297-305`) reaching `ensureWorker()` (`spellcheck.ts:729`), `TidyReview`'s `categorize()` derivation (`:84-86`) and `isObjective`'s four kinds (`tidy-categorize.ts:34-41`), `MediaFigureControl`'s actual button strings (`:242-244`) versus `EditPage.svelte:835`, and the plan's pinned widths (plan:440 — **860 or 390, nothing above 1024**).

---

## Tier 1 — an implementer builds a story that cannot show its subject

**1. `editor/sidebar-list` — the sidebar never renders at any width the seam offers.** `blocks-implementation`
The shell's sidebar is a DaisyUI drawer that becomes persistent only at `lg` (1024) for office routes: `CairnAdminShell.svelte:561-563` `class:lg:drawer-open={!isDeskRoute && !topbar.zen}`. The plan's only pinned widths are 860 and 390 (plan:440); a `column` embed is narrower still. The half of the contract that made this a `shell` row is structurally unreachable. Fix: pin a width ≥1024, or change mechanism to props-plus-pose that checks `#cairn-shell-drawer` — noting `$effect` at `:268-273` (`shell?.pathname; drawerOpen = false;`) re-closes it on any `shell` identity change, so the pose must run last.

**2. `nav/worked-navlayout` — same cliff, and the sidebar *is* the whole row.** `blocks-implementation`
The nav group loop lives inside `.drawer-side` (`:865-885`). The contract's specific detail, "fallback group visible below the divider," is off-canvas. Prop-reachable in data terms, unreachable in render terms. Record the constraint once as a shell-wide note ("a shell story whose contract names the sidebar needs ≥1024, or ≥1280 on a desk path") rather than per row.

**3. `editor/preview-tab` — the pose target is `display: none` below 640.** `blocks-implementation`
`EditorToolbar.svelte:423`: `<div class="hidden items-center sm:ml-auto sm:flex">` wraps both the Write/Preview tablist and the device trigger. The row's `mode`-is-internal-state reasoning is exactly right (`EditPage.svelte:362`); the pose is not. At a `column` width the pose either fails or silently poses nothing. Fix: pin `desktop` (860 clears 640), or branch the pose to open the More popover and click the folded toggle — a materially different pose than the row records.

---

## Tier 2 — cross-cutting mechanism gaps the row set never registers

**4. `MarkdownEditor`'s contracted surface is hydration-only; four rows carry no settle condition.** `degrades-the-render`
The entire server render is `<input type="hidden">`, an empty `<div>`, and a fallback `<textarea>` (`:1123-1127`). CodeMirror arrives through dynamic imports in `onMount` (`:240`), and `foldContainersOnLoad` runs at `:865`, `mounted = true` at `:886`. A props-only story with no pose has nothing telling the capture to wait, so an early frame shows a textarea instead of a collapsed pill. Hits `editor/collapsed-layout-block` directly and `editor/entry-screen`, `editor/preview-tab`, `editor/details-panel` through `EditPage`. Also softens the "Declared heights" sentence: for these rows hydration supplies the *content*, not just a height refinement. (The `foldOnMount`-corrects-the-spec call itself is right.)

**5. `editor/entry-screen` freezes a marker name for an element hidden at the declared width.** `degrades-the-render`
`write-preview-tabs` is one of five **frozen** marker keys and names the element inside the `sm:`-gated wrapper. Frozen names are expensive to change later, so this is the one to settle before A2. Either pin ≥640 or drop the marker and note the tabs are an sm-and-up affordance.

**6. `editor/tidy-review` — the fixture cost is understated and the derivation named is wrong.** `degrades-the-render`
The audit says hunks derive from `changes`. Source: `const category = categorize(c, original, conventions)` (`TidyReview.svelte:85`), and `conventions` is documented as "the ONLY data source for … the category inference." `isObjective` is true only for spelling, typo, doubled, whitespace (`tidy-categorize.ts:34-41`), and **Review this** is the `undecided` state a non-objective hunk gets (`:129`). The fixture must compose `original` + `changes` + `conventions` jointly so one change lands outside those four kinds. The audit wrote "Note for A2" boxes for two easier fixtures and none here.

**7. Five editor stories spawn a real Worker and two asset fetches at mount, with no lever.** `degrades-the-render`
`spellcheck = true` by default (`MarkdownEditor.svelte:179`); the lint plugin schedules its first run from its constructor (`setTimeout(this.run, delay)`); that run calls `ensureWorker()` before `ready` (`spellcheck.ts:729-731`); the worker fetches wasm + dictionary via `import.meta.url`. `EditPage`'s props are `data, registry, render, icons, form, previewMint` (`:106`) — no `spellcheck`; its `spellcheck` is `$state(true)` seeded from `localStorage` (`:406`, `:421`). The only other seam is documented "Never set this outside a test." **The fix list is one item short.** Add `spellcheck` (or an editor-preferences override) to `EditPage`, or record on each row that `/repro` fires a Worker and two asset requests.

**8. Fix 2's headline benefit — prop-update instead of re-mount — is unsafe for every editor story.** `degrades-the-render`
`const isDark = host.closest('[data-theme]')…` sits inside `onMount` (`:263`) and is baked into three `EditorView.theme(…, { dark: isDark })` calls (`:679`, `:692`, `:694`). `grep -n isDark` returns exactly those four lines; there is no reactive re-read. A `themeOverride` flip leaves CodeMirror's chrome on the first-mount polarity — light editor inside a dark shell. `editor/collapsed-layout-block` has the mirror exposure: `bare`, so `isDark` falls back to `false` unless an ancestor carries `[data-theme]`. Qualify fix 2, or extend A3 to reconfigure the theme compartment.

**9. `publish/pending-list` — a shell `$effect` closes the posed dialog on any `data` identity change.** `degrades-the-render`
`$effect(() => { shell?.pathname; … publishAllDialog?.close(); })` (`:268-273`), with `shell = $derived(data.public ? null : data)`. That is exactly the path fix 2 makes routine. Record the invariant on the row and in fix 2: hold fixture `data` in a module-level constant; `DocsRepro` updates `themeOverride` alone and never re-constructs `data`. The pose itself is correct.

**10. `publish/header-band` (and the three sibling `EditPage` shell rows) need a pathname precondition.** `degrades-the-render`
`isDeskRoute` requires exactly three segments with `segs[1]` present in `data.concepts` (`:431-434`). A wrong fixture path silently yields the *office* layout: sidebar breakpoint moves lg↔xl, the `max-sm` desk band compaction stops applying, the theme toggle stops folding away. The narrow face this row exists to picture is partly the shell's. A2 should freeze `/admin/<conceptId>/<id>` alongside `fixtureConcept.id`.

**11. `editor/figure-dialog` — the sentence justifying the row names a string the component never renders.** `degrades-the-render`
`MediaFigureControl` in edit mode renders `Unwrap` and `Update figure` (`:242-244`). "Edit the figure at the cursor" is `EditPage`'s toolbar label (`:835`) and "Edit figure" is `EditPage`'s dialog heading (`:2673`). The verdict (`bare`, `props`) is right and I verified it; only the justification is false. An implementer told to expect that face will not find it. The contract permits the fold to survive as caption or prose, so the row stands with the sentence rewritten.

---

## Tier 3 — fixture and prop-bag omissions

**12. `media/insert-panel` has the fattest required prop bag of any row and no "Note for A2."** `imprecise-but-harmless`
`editor` is a four-method seam object; `open()` calls `editor.caretCoords()` synchronously — the very thing the pose triggers — so the stub must exist and *deliberately* return `null` (the documented centered fallback), not be omitted. `onuploaded` is a callback, `library` a hash-keyed record. The row also reads `CSRF_CONTEXT_KEY` (`:80`), which the audit flags for the other two media rows but not this one, making the three read inconsistently. Both pose citations check out.

**13. `editor/toolbar` — "its four groups visible" is a phrase the contract never uses and a count the component contradicts.** `imprecise-but-harmless`
`grep -rn "four groups" docs/` returns only the audit itself. The outline says "one toolbar reproduction at the section top locates the groups." The component names three labelled clusters (Format, Structure, Insert) plus a persistent `?` control it deliberately does not call a cluster. An implementer will hunt a fourth group or miscount the help control. The actionable half — supply `insertControls` or Insert renders empty — is correct. Secondary, unresolved: the outline calls for *one* toolbar reproduction, already delivered by `editor/entry-screen`; the id-defining spec lives in cairn-pub and could not be checked from here. Worth one sentence of justification for the row's existence. Also note the micro-eyebrows labelling the clusters are themselves sm-and-up — a second reason this row wants a width floor.

**14. `media/insert-panel` fix-1 attribution names the wrong module.** `imprecise-but-harmless`
The popover composes `MediaPicker`, and reuse thumbnails resolve through `publicPath(…, mediaBase)` at `MediaPicker.svelte:244`. `editor-media.ts` is the CodeMirror chip decoration `MarkdownEditor` builds — correctly listed elsewhere in the same fix-1 table. Remedy unchanged; fix 1 covers both call sites.

**15. `publish/pending-list` — the trigger and dialog exist only post-hydration.** `imprecise-but-harmless`
Both sit inside `{#await data.pendingEntries then pending}` (`:661`, `:748`) with no pending branch, so the prerendered HTML contains neither. Size this row's declared height to the hydrated render, and sequence the pose after hydration. Overlaps finding 4's family.

**16. "The export question" headline is scoped narrower than it reads.** `imprecise-but-harmless`
The instruction (do not touch the barrel) is right and its two supporting facts check out. But the same pass adds `themeOverride` to the publicly exported `CairnAdminShell`, which the audit concedes eleven paragraphs later under "For A8," where it also establishes no gate catches it. Retitle to "no new export-map entry" and move the admission into the section.

**17. `media/lead-picture-dialog` — the `showModal()` cited is the drop handler, not the Edit path.** `imprecise-but-harmless`
Applying the file's consistent +7 drift, `:374` lands in `onDropzoneDrop`. The pose ("clicks the edit control") reaches `openDialog()`, invoked from `onclick={() => openDialog('placement')}`. Verdict (bare, pose, no prop) unaffected.

**18. `roster/own-row` `:32` points at the props destructuring, not the disabling logic.** `imprecise-but-harmless`
Confirmed: `:32` is `let { data, form }: Props = $props();`; `isSelf` is at `:106` and the `disabled={isSelf}` bindings at `:122`/`:133`/`:140`/`:146`. The companion `:20` → `interface Props {` is fine under the audit's own convention.

**19. `media/insert-panel` `:55` for the `trigger` prop — weak, near-discard.** `imprecise-but-harmless`
`:55` is `interface Props {`; `trigger?: boolean` is `:75`, the button `:319`. Cataloguing prop claims at `interface Props {` is the audit's consistent house convention across every row, so this reads as convention, not error. Worth a precision pass at most.

**20. `auth/confirm` `:17` — near-discard, see below.**

---

## Discarded / downgraded

- **`auth/confirm` "Own theme root: yes, `ConfirmPage.svelte:17`."** The verifier's own quote of line 17 contains `theme?: 'cairn-admin' | 'cairn-admin-dark'` — which is precisely the evidence that the page carries its own theme. The citation supports the claim it is attached to. The wrapper at `:33` is a *better* citation, not a correction of a wrong one. Ranked last, and I would not spend an edit on it.
- **The duplicate `editor/toolbar` finding** (two submissions against the same "four groups" claim) merged into #13; nothing discarded on evidence.
- **`media/library`'s unjustified `Host: shell`** was self-reported as unverified, not submitted as a finding, and I did not promote it. See below.

## notFullyChecked

- **`ReproContext` and the ten `bare` rows.** `src/lib/reproductions/` was off-limits (live agent's write set). The entire admin token set is scoped under `[data-theme='cairn-admin']` (`cairn-admin.css:82`), so a bare mount with no such ancestor renders untokenized — but one incidental line (`ReproContext.svelte:19: import '../components/cairn-admin.css';`) suggests it is handled. **This is the single highest-value thing to confirm once the write set is free**, because it silently governs all ten `bare` rows and would compound with finding 8's `isDark` fallback.
- **`toolkit/custom-screen`.** The four named primitives exist in `src/lib/admin-toolkit/` and are exported from its `index.ts`, and the row matches the doc snippet at `docs/extend/add-a-custom-admin-screen.md:100`. Their individual required props (`AdminTable`, `PageHeader`, `OfficeList`, `StatusChip`) were not audited against a plausible fixture.
- **`media/library`'s `Host: shell` has no stated rationale**, unlike the rows where the audit argues topbar-context or theme-root dependency. No `getContext`/`setContext` dependency was found in `CairnMediaLibrary` or the toolkit components it composes that would make `shell` structurally load-bearing the way it is for `publish/header-band`. It may be house convention (full-page screens in shell, widgets bare); `MediaHeroField` and `MediaCaptureCard` are `bare` on the same styling conventions. Not asserted as a finding.
- **No component was mounted.** Every "would render / would throw" claim above rests on static reading of Props interfaces, `getContext` usage, `$effect` bodies, and CSS class gating. Declared manifest heights were checked against no real render, and whether `src/lib/reproductions/` is reachable in dist was not verified.

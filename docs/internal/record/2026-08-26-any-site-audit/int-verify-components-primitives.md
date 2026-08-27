# Fresh-context verification: components-primitives (src/lib/components/)

Verified against `main` working tree, 2026-08-26. I did not produce the findings. Every claim below
was re-measured from the code; where a repo ruling could sanction the pattern I went looking for it
(`docs/internal/code-idioms.md`, `docs/internal/engine-rulings.md`,
`docs/internal/admin-design-system.md`, `docs/superpowers/plans/2026-07-01-code-polish-survey.md`).

---

## CP-01 — No dialog primitive · STANDS · tier unchanged (refactor)

**Re-measured.** `grep -c 'class="modal-backdrop"' src/lib/**/*.svelte` = **14 across 12 files**
(MediaHeroField, CairnAdminShell, DeleteDialog, EntryPicker, WebLinkDialog, ComponentInsertDialog,
ShortcutsDialog, RenameDialog, MarkdownHelpDialog, ConceptList, TidyReview, EditPage). `showModal()`
= **34** in `.svelte`. The IDREF fork is real and exactly as described: eight standalone dialogs
hard-code `aria-labelledby="cairn-*-title"` (CairnAdminShell:776, ConceptList:471,
MarkdownHelpDialog:23, WebLinkDialog:65, ShortcutsDialog:25, DeleteDialog:71,
ComponentInsertDialog:322, RenameDialog:72), six more inside CairnMediaLibrary, five more inside
EditPage; against `EntryPicker.svelte:18` and `MediaHeroField.svelte:111` which use `$props.id()`,
with EntryPicker's comment writing down why the constant form is a latent IDREF-resolution bug.
`admin-toolkit/index.ts` exports 13 primitives and no dialog. Confirmed.

**Case against the finding, tested and rejected.** `code-idioms.md` **S2** does sanction the shape:
"Modals are the native `<dialog class="modal">` recipe (exemplar: `MarkdownHelpDialog.svelte`)".
That is a sanction of the *markup recipe*, not a ruling that it must stay hand-copied — and S2
itself says nothing about which IDREF idiom to use, which is precisely where the drift lives. The
neighbouring **S3** ruling is the stronger counter: it enumerated exactly which repeated in-file
idioms extract (segmented-control helper, typed-confirm gate, client-action round-trip,
origin-refocus dialog lifecycle) and the modal shell is not on that list; the adjacent structural
decision records "**`CairnMediaLibrary.svelte` is NOT split this pass**. Component splits couple
template, state, and focus behavior (the phase-3a lesson)". But that lesson is about *carving a
large component apart*, not about *composing a shared wrapper*, and the pass explicitly deferred the
question rather than ruling against it. No ruling anywhere sanctions the IDREF fork.

**One correction to the remediation, not to the finding.** S3's own wording is "extract to one home
each, `src/lib/components/` internals (**not the public barrel**)". `admin-toolkit` is a *public*
export subpath (`package.json:98`). Putting `AdminDialog` there widens public surface and the 1.0
seam-stability promise; the S3-consistent home is an internal component under
`src/lib/components/`, promoted to the toolkit only if a site case is argued separately.

---

## CP-02 — Nine field-arm env props drilled through five components · STANDS · tier unchanged (refactor)

**Re-measured.** `FieldInput.svelte:38-56`, `ObjectGroupField.svelte:30-47`,
`RepeatableField.svelte:44-62` each declare the same nine (`targets`, `markFieldsDirty`,
`mediaLibrary`, `conceptId`, `id`, `heroFieldRefs`, `onuploaded`, `onheroneedsalt`, plus `icons`).
`ObjectGroupField.svelte:85-96` and `RepeatableField.svelte:266-292` are the two spread blocks, and
RepeatableField writes it twice (object arm + leaf arm). The "one added prop = seven edits" arithmetic
holds. The one-level recursion cap is real (`FieldInput` header), so a context is structurally safe.

**Overstatement, small.** "byte-identical TSDoc" is true for five of the nine (`mediaLibrary`,
`conceptId`, `id`, `onuploaded`, `onheroneedsalt`); the other four are adapted per host ("threaded
through to each leaf", "so two groups do not collide", "forwarded to each row's icon arm"). That
adaptation is arguably *good* comment discipline, and it slightly weakens the "one doc, one home"
framing without touching the duplication finding itself.

**No ruling found either way** on context-vs-props for the field arms. The repo already runs three
context modules (`csrf-context`, `media-base-context`, `topbar-context`), so context is house-legal.
The finding's own fallback (one `env` object prop) survives even if context is rejected.

---

## CP-03 — `admin-icons.ts` claims one import surface, 40 imports bypass · STANDS · tier unchanged (refactor)

**Re-measured.** Direct `@lucide/svelte/icons/` imports in `src/lib/**/*.svelte` = **40**, across
ConceptList, CairnAdminShell, VocabularyAdmin, RepeatableField, TidyReview, CairnTidySettings,
EditPage, LoginPage. Importers of the barrel = **4**, not 3 (the finding missed
`admin-toolkit/ListToolbar.svelte:117`). Set-intersection of directly-imported glyphs against the
barrel's 30 exports: **12** — `arrow-down arrow-right arrow-up check chevron-down chevron-left
chevron-right list plus trash-2 triangle-alert x`. `RepeatableField.svelte:24-29` imports six
directly, all six in the barrel. `CairnAdminShell.svelte:27` imports `ExternalLinkIcon` directly four
lines after importing the barrel on line 23. Confirmed.

**Case against, tested and partly sustained.** The header's own scope word is "the admin **chrome**",
and several bypassers (EditPage, LoginPage, the field arms) are plausibly not chrome, so
"40 imports bypass it" counts files the claim may never have covered. That defence dies on
`CairnAdminShell.svelte:27`: the shell *is* the chrome, and it bypasses in the same import block.
Either way the boundary of "chrome" is nowhere defined, which is the one-obvious-way failure the
finding names. `admin-nav-icons.ts` is correctly exempted — it is a `.ts` allowlist map (data),
excluded from the 40 by the `.svelte` scope.

---

## CP-04 — live-region announce nonce hand-copied into six components · STANDS · tier unchanged (refactor)

**Re-measured.** `announceNonce` appears in exactly six components: ConceptList:267, ManageEditors:68,
NavTree:111, VocabularyAdmin:139, CairnTidySettings:77, TidyReview:146. Each carries a literal U+200B
in its `nonce()` body. Five are the identical form-identity shape (`$state(0)` + `lastSubmit` identity
compare on `form ?? data` + `liveError` concat). Confirmed, including the invisibility argument.

**Two calibrations that do not sink it.**
1. **TidyReview is a deliberate variant, not a sixth copy.** `TidyReview.svelte:144-153` uses a plain
   `let announceNonce = 0` (no `$state`) incremented *inside* `nonce()`, shared across two live
   regions, and its comment says so ("Each region keeps its own parity through the shared counter").
   It announces imperative messages, not a form error, so the submit-identity effect does not apply.
   Call it five copies plus a documented cousin; an extraction should take the five and decide
   consciously whether the cousin folds in.
2. **"No failing test" is true only for four of the six.** `src/tests/component/ConceptList.test.ts:110`
   asserts "re-announces a repeated identical lifecycle error", and `tidy-review`, `EditPage`, and
   `repeatable-field` carry sibling assertions. NavTree, ManageEditors, VocabularyAdmin, and
   CairnTidySettings have none. The gate gap is real, just narrower than stated — and it argues *for*
   the finding's remediation (one module, one test, six sites covered).

---

## CP-05 — two diverged Tab traps + a false parity comment · STANDS · REVISED TIER: note

**The load-bearing half is confirmed.** `CairnAdminShell.svelte:501-504` says its
outside-the-container fallback is "the same fallback MediaInsertPopover's trap uses". It is not.
Shell:512-521 checks `!drawerNavEl.contains(active)` on **both** branches;
`MediaInsertPopover.svelte:170-175` checks `activeEl === panel` on the shift branch only and has **no
container check at all** on the forward branch. The comment is false as written. Deleting or
correcting it is unambiguous and should happen.

**Why the tier drops.** Two things the finding treats as drift turn out to be justified or inert:

1. **The selector "drift" is order-only.** Shell:507 and popover:164 contain the *same six* selectors;
   only `select`/`textarea` swap position. `querySelectorAll` returns **document order**, never
   selector order, so the two strings are behaviorally identical. (The analysis's fuller text also
   claims shell:507 "omits `:not([disabled])` on `input`" — it does not; that applies to the
   *focus-in* query at line 496, a different query with a different job.) One shared exported
   constant is still tidier, but nothing is broken.
2. **The asymmetry follows from different event scopes, not from copying badly.** The shell listens
   on `<svelte:window onkeydowncapture>` (CairnAdminShell.svelte:552), so a Tab keydown reaches it
   while focus sits *anywhere* in the document — the fallback is load-bearing. The popover's handler
   is `onkeydown` **on the panel** (MediaInsertPopover.svelte:349), so a keydown that reaches it
   always originates inside the panel and the fallback is unreachable. Its `activeEl === panel` check
   covers the one real case: the panel carries `tabindex="-1"` (line 348) and is where focus starts.
   `code-idioms.md`'s "Deliberately not standardized" list already sanctions exactly this shape of
   split ("The two lazy CodeMirror loading shapes — each correct for its call pattern").

**A trap in the proposed remediation.** A naive shared `cycleTab` keyed on
`!container.contains(active)` would *regress* the popover: `node.contains(node)` is `true`, so the
panel-focused case would stop wrapping on Shift+Tab. Any extraction must read
`active === container || active === first || !container.contains(active)`.

Net: the false comment is a genuine comprehension trap and worth fixing; the two-site extraction is
optional polish over two implementations each correct for its host. That is note-tier work, not a
refactor.

# Fresh-context verification — components-editor internals findings

Verifier: fresh context, did not author the ranked analysis. Repo `/home/glw907/Projects/cairn-cms`,
`main` (clean). Every number below was re-measured against the working tree, not taken from the
analysis. Rulings checked for a sanction: `docs/internal/code-idioms.md` (all sections including
"Structural decisions" and "Deliberately not standardized"), `ROADMAP.md`, `docs/reference/components.md`,
CLAUDE.md.

---

## CE-01 — EditPage.svelte is a 2,920-line god component — **STANDS, tier rewrite**

Re-measured:

- `wc -l src/lib/components/EditPage.svelte` = **2920**. ✓
- `grep -c '\$state'` = **77** (analysis said 76; off by one, immaterial and in the finding's disfavor
  direction, i.e. the real count is worse).
- `grep -c '\$effect'` = **15**. ✓
- `CairnMediaLibrary.svelte` = **3159** lines (analysis said 3,141; ROADMAP.md:1612 also says 3,141, so
  the file has grown 18 lines since that entry was written). EditPage is **92.4%** of it. ✓

Claimed domain clusters spot-checked and confirmed at the cited lines:

- `:282-359` page-wide keydown router — confirmed (`onWindowKeydown`, Escape precedence ladder, chord
  suppression inside dialogs).
- `:560-735` tidy state machine — confirmed (`tidyApi`, `undoEditor`, `tidyReview`, `tidyMessage`,
  `tidyNoop`, `cancelTidy`, `closeTidyReview`, `tidyAppliedBody`, `undoTidy`).
- `:967-1027` figure control — confirmed (`figurePrefill` snapshot with mode/caption/role/decorative).
- `:1107-1235` share preview — confirmed (`shareBusy` and the mint/revoke bearer-credential comment).

**Counter-case tested and rejected.** `code-idioms.md` "Structural decisions" carries a repo ruling
that *looks* like it might sanction the size: "`CairnMediaLibrary.svelte` is NOT split this pass.
Component splits couple template, state, and focus behavior (the phase-3a lesson)". That is a caution
against splitting as a *rider*, not a standing exemption — the same passage files the split to ROADMAP,
and ROADMAP.md:1609-1623 concludes the split "needs its own designed pass, not a rider." CE-01's
remediation asks for exactly that. The ruling shapes the finding; it does not defeat it.

**The tracking gap is real.** `grep -n "split" ROADMAP.md` returns 15 hits; the only component-split
entry is line 1609 for `CairnMediaLibrary`. EditPage appears in ROADMAP at :452, :891-896, :1104,
:1788-1801, :2210 — all as the *site* of some other item (an `ownership_invalid_mutation` bug, an
a11y focus item, a reseed note), never as a split candidate. Nothing tracks its size.

The ROADMAP entry's three convergent signals for CairnMediaLibrary (largest component, largest jscpd
clone cluster, six near-identical inline dialog controllers) apply to EditPage on signal 1 (second
largest, 92% of the first) and signal 3 (the tidy-working / tidy-noop / tidy-message triple is three
near-identical `<dialog>` + `$effect`-to-`showModal` blocks). I did not re-run jscpd, so signal 2 is
unverified either way — the finding does not claim it.

Tier `rewrite` is right: this is a designed split pass, not an edit.

---

## CE-02 — the same-route reseed is a hand-maintained list that already misses live state — **STANDS, tier refactor**

The mechanism is exactly as described. `EditPage` defends same-route reuse twice:

- `$effect.pre` reseed at `:1345-1368`, **17 assignments**, guarded by `seededKey` + `untrack`. ✓
- `{#key entryKey}` wrapping the template at `:1899`. ✓ Its own comment concedes the split:
  "script-level state and the beforeNavigate registration sit outside the block, so only the template
  rebuilds."

**The `uploadedRecords` leak is real and reachable.** Verified end to end:

- `let uploadedRecords = $state<MediaEntry[]>([])` at `:782` — script state, outside the `{#key}`, and
  absent from the 17-assignment reseed list. ✓
- Rendered into the save form at `:2305`: `<input type="hidden" name="media" value={JSON.stringify(uploadedRecords)} />`. ✓
- Appended on every upload at `:2517` and `:2730` (`onuploaded={(record) => (uploadedRecords = [...uploadedRecords, record])}`).
- Consumed server-side at `src/lib/sveltekit/content-routes-core.ts:1345`:
  `const records = parseMediaEntries(form.get('media'))`, which reads media.json off the default branch
  and `upsertMediaEntry`s every posted record into the manifest that rides the save commit.
- The same-route hop is reachable from the UI as claimed: `:1934` (delete-refused linkers) and `:2617`
  ("Included in") are both `<a href={`/admin/${link.concept}/${link.id}`}>`.

So: upload an image while editing A, follow one of those links to B, save B → B's commit upserts A's
media rows into `media.json`. Severity is moderate rather than catastrophic (the assets genuinely exist
in R2, so the manifest is not corrupt), but the write is attributed to the wrong save and lands on a
branch the author never associated with it. The structural complaint — a hand-maintained list against
77 `$state` declarations, with nothing enforcing it — is the durable half and is unarguable.

**One sub-claim in the analysis is overstated and should not be carried forward.** The analysis says
`tidyApplied` surviving the hop "leaves the 'Tidy applied / Undo tidy' chip on an entry that was never
tidied." It does not, in the ordinary case: `EditPage.svelte:722-728` is an `$effect` that clears
`tidyApplied` and `tidyAppliedBody` the moment `body` diverges from `tidyAppliedBody`, and the reseed
does reassign `body`. The chip self-heals unless the two entries' bodies are byte-identical. The other
tidy fields (`tidyMode`, `tidyReview`, `tidyBusy`) genuinely are unreset, but reaching a hop with a tidy
review open requires escaping a modal, so they are far less reachable than `uploadedRecords`. The
finding's *headline* evidence (uploadedRecords) is the sound one; drop the tidyApplied line if this is
quoted onward.

Every other "not reset" state was verified to exist and to be absent from the list: `heroNeedsAlt` `:778`,
`caretComponent` `:837`, `mediaAtCaret` `:842`, `editable` `:888`, `editReason` `:892`, `diagnosticsCounts`
`:1482`. ✓

**Supporting evidence the analysis did not cite, and it is the strongest piece.** The repo already has
the proposed remediation in production, on the sibling component, in the same file:
`CairnAdmin.svelte:78-83` wraps `ConceptList` in `{#key data.page.conceptId}` at the mount site, with a
comment stating the reason ("crossing concepts remounts it and drops the old query, sort, page, and
dialog state"). `EditPage` is mounted at `CairnAdmin.svelte:86` **unkeyed**. The mount-site key is
already this repo's obvious way; EditPage is the divergence.

**One refinement the remediation needs.** "Move the `{#key}` to the mount site" is not sufficient as
written, because `EditPage` is a documented direct-mount component. `docs/reference/components.md:236-332`
gives its full prop contract and a copy-paste per-route snippet for
`src/routes/admin/(app)/[concept]/[id]/+page.svelte` with **no `{#key}`** — and that route is
`[concept]/[id]`, so it reuses the component across entries exactly like the single mount does. Pushing
the key to the mount site therefore moves a correctness obligation onto every consumer who copies the
documented snippet. The engine-internal form is better: make `EditPage.svelte` a thin keyed wrapper
(`{#key data.conceptId + '/' + data.id}<EditPageBody {...} />{/key}`) so no mount site can get it wrong,
and delete the `seededKey`/`untrack`/`$effect.pre` machinery. That also happens to give CE-01 its first
natural cut. The `beforeNavigate` guard survives either shape, since `beforeNavigate` fires while the old
instance is still alive.

Tier `refactor` is right.

---

## CE-03 — the MarkdownEditor seam is 33 props, 13 register* callbacks, 3 undocumented — **STANDS, revise tier to `refactor`**

Every number re-counted by hand from `MarkdownEditor.svelte:29-152`:

- **33 props.** ✓ (value, name, registerInsert, registerInsertLink, registerInsertImage, onImageIngest,
  mediaLibrary, fragmentTitles, registerCaretCoords, registerFocusEditor, registerImagePlaceholders,
  registerGetSelection, registerGetSelectionRange, registerTidy, registerUndo, registerFormat,
  onComponentAtCaret, onMediaImageAtCaret, registerReplaceRange, registerSelectRange, completionSources,
  focusMode, typewriter, surface, spellcheck, spellcheckDictionary, siteDictionary, pendingAdditions,
  spellcheckTest, tidyMode, onDiagnosticsCounts, foldOnMount, registry.)
- **13 `register*`.** ✓
- The host ledger is where the analysis says: `$state.raw` no-op holders at `:542-564` and `:743-757`,
  and the matching `register…={(fn) => (x = fn)}` wiring block at `:2269-2290`. ✓
- `registerTidy` (`TidyApi`) and `registerImagePlaceholders` (`ImagePlaceholderApi`) do already prove the
  object shape in the same interface. ✓

**The three undocumented props are confirmed.** `grep -n "fragmentTitles\|onDiagnosticsCounts\|registry"
docs/reference/components.md` returns hits only at :45, :49, :63, :80, :242, :244, :254, :330 — every one
of them `CairnAdmin`'s or `EditPage`'s `registry` prop, none in the `MarkdownEditor` sections. The stable
block (`:595-608`) names 11 props; the unstable table (`:660-680`) names 19. 11 + 19 = 30 of 33.
`fragmentTitles`, `onDiagnosticsCounts`, and `registry` are documented nowhere on this component. ✓
`check:reference` gates exported symbols, not component props, so nothing catches it — consistent with the
finding. Note that all three *are* TSDoc'd in the code; the gap is the reference page only.

**Counter-case tested, and it partly fails.** `code-idioms.md` N3 says "the `register*`/`on*` seam
vocabulary on `MarkdownEditor` is frozen by its documented contract" — a genuine repo ruling that a
generic lint instinct would trample. It does not save the finding's target, for two independent reasons.
(1) N3 freezes the *naming vocabulary* (what a seam callback is called), sitting in the Naming section
beside `cairn<Feature>`; it is not a ruling on prop count or seam shape. (2) The freeze's own authority is
"its documented contract", and that contract explicitly disclaims 19 of these props:
`docs/reference/components.md:652-656`, "with no stability promise across minors: a site that reaches past
`EditPage` for one of these should expect it to move or change shape." Eleven of the thirteen `register*`
props sit in that unstable table; only `registerInsert` and `registerFormat` are in the frozen eleven. The
freeze is protecting a surface its own docs decline to protect. Combined with the standing ruling that
churn is free until beta, N3 does not sanction the pattern.

**Tier: I would revise `rewrite` → `refactor`.** The remediation is a mechanical collapse onto a shape the
same file already exemplifies twice (`TidyApi`, `ImagePlaceholderApi`): 11 prop declarations, 11 holders,
11 no-op defaults, and 11 wiring lines become one prop, one holder, one guard. Nothing in `MarkdownEditor`
is re-conceived and no behavior moves. Compare CE-01, where a 2,920-line component must be re-partitioned
into six new files with focus and template behavior to re-verify — that is what `rewrite` should mean in
this taxonomy. Calling both the same tier flattens a real difference in intervention size. Two riders:
the change is breaking for any direct mounter and needs a `Consumers must:` changelog line; and the
doc/gate half (a `check:component-props` diffing each exported component's `Props` keys against its
reference page) is separable and is the cheapest, highest-value piece — it is worth doing on its own even
if the prop collapse is deferred.

---

## CE-04 — two competing latest-wins arbiters, canonical one buried in spellcheck.ts — **STANDS, tier refactor**

Both helpers read verbatim as described:

- `spellcheck.ts:282-303` — `SeqArbiter` / `arbitrateChecked`, TSDoc'd, exported. ✓
- `client-action.ts:46-66` — `RequestGuard` / `createRequestGuard`, TSDoc'd, exported. ✓

Call sites re-grepped across all of `src/lib`, and they split exactly as claimed with no overlap:

```
arbitrateChecked   spellcheck.ts:567, ComponentInsertDialog.svelte:147,
                   EditPage.svelte:902, EditPage.svelte:1597
createRequestGuard CairnMediaLibrary.svelte:458, CairnMediaLibrary.svelte:754
```

The comprehension complaint is confirmed at the imports: `EditPage.svelte:81` and
`ComponentInsertDialog.svelte:64` both pull a generic concurrency primitive out of a 776-line spellcheck
module, while `client-action.ts`'s own header (`:5-6`) advertises the *other* one ("pairs it with
`createRequestGuard` below"). An agent grepping an admin component for "stale" or "guard" lands on the
non-canonical helper.

**Counter-case tested and rejected — and it inverts into support.** "Deliberately not standardized" in
`code-idioms.md` lists five sanctioned forks; this is not among them. The opposite: **A3 already ruled**
— "Latest-wins arbitration uses the extracted testable shape (exemplar: `arbitrateChecked`/`SeqArbiter`,
`src/lib/components/spellcheck.ts:282`); the two inlined counter/flag variants converge." The charter
picked the winner and the polish pass converged the *inlined* variants. `createRequestGuard` is an
*exported, TSDoc'd* variant, so it fell outside "inlined" and survived the sweep. This is a charter rule
with an escapee, not a pattern-match against a rule that does not exist.

**One technical caveat the remediation must carry.** The two are not behaviorally identical, so this is
not a pure find-and-replace. `accept(seq)` is *advancing*: it returns `seq >= current` and then sets
`current = seq`, so an out-of-order-but-newer answer is accepted and becomes the new high-water mark.
`isStale(token)` is *pure*: `token !== seq`, accepting only the exact latest token. In practice both are
latest-wins and the two `CairnMediaLibrary` call sites (each pinning a token at entry and checking after
one await) behave identically under either. The distinction matters for the Worker path, where messages
can land out of order — which is precisely why `accept` advances. Consolidate onto `SeqArbiter`'s
advancing semantics, not the other direction.

Tier `refactor` is right. Doing it also discharges the last of A3.

---

## Summary

Four for four stand on the facts; every cited line number, count, and file path re-measured true, with
two immaterial number drifts (77 not 76 `$state`; 3,159 not 3,141 lines in `CairnMediaLibrary`, meaning
the ROADMAP entry is itself 18 lines stale). No finding is defeated by a repo ruling. In two cases
(CE-03's N3, CE-04's A3) I went looking for the ruling that would sanction the pattern and found one that
*condemns* it instead.

Three carry-forwards for whoever acts on these:

1. CE-02's remediation should be an engine-internal keyed wrapper, not a mount-site key — the documented
   per-route snippet at `docs/reference/components.md:320-332` has no key and reuses across entries.
2. CE-02's `tidyApplied` sub-claim is wrong (`EditPage.svelte:722-728` self-heals it); the
   `uploadedRecords` evidence is the sound one.
3. CE-03 reads better as `refactor` than `rewrite`, and its doc/gate half (`check:component-props`) is
   worth splitting out and shipping first.

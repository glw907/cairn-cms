# Internals-B planning inputs (compiled 2026-09-02, ahead of the pass)

Planning inputs for the follow-on slice "internals-B: monoliths and coherence", compiled
read-only against `main` at `a5352f0b` while the internals pass executes on its worktree.
Schema imitates `2026-09-01-internals-planning-inputs/docket.md`. **Every line anchor and
measurement here is compile-time evidence, not a plan input to trust cold:** the internals
pass moves several of these files (flagged per item), and the internals-B plan author
re-verifies against post-internals `main` before scoping, the same rule the internals
docket applied.

**What the internals pass changes before internals-B plans (flags referenced below):**

- **[T7]** Task 7 collapses `MarkdownEditor`'s 13 `register*` props into
  `registerEditor?: (api: EditorApi) => void` and rewires `EditPage.svelte`'s
  editor-wiring block (~`:2510-2523`). The `EditPage` split inherits the collapsed
  wiring; it does not re-derive it. Anchors near the wiring block shift.
- **[T6]** Task 6 rewrites the six `content-routes-*.ts` module headers plus two comment
  sites. Cosmetic to structure; a hand-authored per-file header survives a later split.
- **[T11]** Task 11 rewrites ROADMAP's "internals half" block as the internals-B entry
  (four monoliths, `MarkdownEditor` struck) and adds the `// WATCH:` routing item 5 here.

---

## 1. The `EditPage` split

**Source:** `ROADMAP.md:306-317` (the internals-half block); the any-site audit record's
internals section.

**Prescribed shape:** split the monolith; absorb the `FieldInput`
`ownership_invalid_mutation` fix (item 2) so those lines are touched once.

**CURRENT-STATE VERIFICATION:** open, measured—2,922 lines (ROADMAP's 2,920 is stale
by 2). `<script>` 21-1652, markup 1653-2896, `<style>` 2897-2922. Six props (interface
`:84-113`), 52 imports, 42 top-level functions clustering into: form
submit/publish/dirty (`:164-247`), preview/focus/spellcheck/surface/zen (`:397-535`),
tidy review (`:607-877`), block editing/figure insertion (`:877-1093`), share/preview
link (`:1093-1241`), broken-link removal (`:1241-1376`), markup helpers (`:1376-1638`).
**Ledger:** none. **[T7]**—anchors near the wiring block shift; split shape planned
against post-internals state.

---

## 2. `FieldInput` `ownership_invalid_mutation` (inside the `EditPage` split)

**Source:** `ROADMAP.md:867-873`.

**Prescribed shape (ROADMAP):** `$bindable()` on `FieldInput`'s `heroFieldRefs` prop
plus `bind:heroFieldRefs` at the call site, or a `registerHeroField` callback prop.

**CURRENT-STATE VERIFICATION:** open, confirmed—`FieldInput.svelte:50` declares the
plain prop; `:271-274` binds `bind:this={heroFieldRefs[name]}` into it;
`EditPage.svelte:777` owns the `$state` proxy, passed at `:2518` (ROADMAP's `:2516`
drifted). **Discrepancy, needs a call:** `FieldInput.svelte:271-272` carries a comment
declaring the warning benign ("the parent owns the $state proxy and mutates it by
reference"), which contradicts ROADMAP's defect framing. Whether this is a fix item or
an already-accepted posture the comment records is a brainstorm decision, not execution.
**Ledger:** none. No internals task touches `FieldInput.svelte`; stable to plan against.

---

## 3. Confirm's destroy-then-create pair as one `db.batch()`

**Source:** the internals plan's hands-forward list (routed from the 4b review fold);
"low stakes; attach to any task opening `factory.ts` if cheaper."

**CURRENT-STATE VERIFICATION:** open, confirmed—`auth-channel/factory.ts:956-962`
runs `destroyChannelSession` (`store.ts:291-300`, `DELETE ... RETURNING subject`,
`.first()`) then `createChannelSession` (`store.ts:253-264`, `.run()`) as two
independent round trips on the same `D1DatabaseSession`; a real `db.batch()` candidate.
**Ledger:** none. No internals task touches `factory.ts`'s confirm path structurally
(Task 9 opens the file for the tripwire and salt diagnostic; re-verify adjacency at
plan time).

---

## 4. OfficeList/AdminTable double scroll-container ownership

**Source:** the internals plan's hands-forward list (routed from the 4b review fold).

**CURRENT-STATE VERIFICATION:** open, confirmed—`OfficeList.svelte:47` owns
`overflow-x-auto`; `AdminTable.svelte:59,77-79` owns `.toolkit-admin-table-wrap
{ overflow-x: auto; }`; `reproductions/stories/CustomScreen.svelte:17-32` composes the
nesting, so both own the same axis. `audit/rules/rendered/viewport-overflow.ts:19-20`
already special-cases the pair as a known engine idiom—the fix should revisit that
special case in the same task. **Related:** polish carries the OfficeList
outright-retire question ruling-first (`audit-admin-officelist` reopens on no current
evidence); if polish retires OfficeList, this item collapses into that retire. Ordering
between the two is a brainstorm decision. **Ledger:** `audit-admin-officelist`
(closed; reopen rule noted above). Stable to plan against.

---

## 5. `media-seed/bin.ts` `readFileUnderCwd` containment assert

**Source:** the internals plan, Task 11 (the round-2 verifier's observation): a
`// WATCH:` comment routes this file's own containment assert here by name.

**CURRENT-STATE VERIFICATION:** open, confirmed—`src/lib/media-seed/bin.ts:67` is the
byte-identical uncontained twin of `doctor/bin.ts:58`'s `readFileUnderCwd`; `resolve`
does not contain, so the fix is the same three-line resolved-path-stays-under-base
assert Task 11 lands on the doctor's copy. Plan-committed, mechanical. **Ledger:** the
Task 11 rows cover the doctor half; this half rides the WATCH.

---

## 6. The `CairnMediaLibrary` split

**Source:** `ROADMAP.md:306-317`.

**CURRENT-STATE VERIFICATION:** open, measured—3,167 lines (ROADMAP's 3,159 stale).
`<script>` 41-1421, markup 1421-3158. Two props, 25 imports, ~55 top-level functions
clustering into: triage/sort/filter (`:145-242`), tile panel (`:262-304`, `:958-1003`),
delete dialog (`:304-315`), replace-asset (`:361-538`), upload/drag-drop (`:588-737`),
alt-fill (`:737-835`), usage/reference-copy (`:835-958`), bulk delete (`:1078-1207`),
orphan scan/purge (`:1207-1310+`). **Ledger:** none. **[T6]** touches one comment line
only; structure stable.

---

## 7. The `content-routes-core` split

**Source:** `ROADMAP.md:306-317`.

**CURRENT-STATE VERIFICATION:** open, measured—2,275 lines (ROADMAP's 1,690 is badly
stale; 4a/4b growth landed in the surrounding module). The real monolith is
`createCoreActions(ctx)` at `:579-2275`, a single 1,696-line closure: 11 private
helpers plus 17 exported load/action functions returned at `:2256-2274` (inventory with
anchors in the recon behind this docket). **Ledger:** none. **[T6]** rewrites the
header (survives a split); internals Task 12 re-routes `previewRevokeAction` through
the new export—re-measure at plan time.

---

## 8. The `audit/rendered.ts` split

**Source:** `ROADMAP.md:306-317`.

**CURRENT-STATE VERIFICATION:** open, measured—`src/lib/audit/rendered.ts` (path
confirmed unique), 1,124 lines (ROADMAP's 1,015 stale). 28 top-level functions:
finding-builders (`:211-453`), SSR/hydration identity capture (`:381-423`),
`resolveRenderedFindings` (`:491`), Playwright bootstrap (`:549-606`), state
application (`:626-638`), color/selector probing (`:701-766`), page-helper install
(`:815-914`), and the orchestrator `runRendered` (`:948-end`). **Ledger:** none. No
internals task touches it.

---

## 9. The exhaustiveness idiom

**Source:** `ROADMAP.md:306-317`; `int-coherence.md` (the mutation experiment: a
`RatingField` half-add passed the full gate suite with a wrong error message and a
`'4000 potatoes'` value committed).

**Prescribed shape:** close `FieldDescriptor`'s ten permissive-default dispatch sites.
The MECHANISM is unruled: `assertNever` / `: never =` / `satisfies never` per site, and
whether the guard is compile-time-only or also runtime-asserted. Brainstorm decision.

**CURRENT-STATE VERIFICATION:** open (problem statement verified against ROADMAP and
the coherence record; the ten sites re-enumerated at plan time). **Ledger:** none.

---

## 10. The coherence thirteen

**Source:** `int-coherence.md` (the itemization home; ROADMAP does not enumerate all
thirteen). Known members with evidence: enforce the idiom charter with a gate; purge
the pass-scoped comment register (179 process references, 18 consumer-site names—does
not reach `scripts/`, per the internals plan's global constraints); the `ec-*` prefix
out of engine-emitted markup (`int-coherence.md:339-342`: five class names, 18 sites,
published in `docs/reference/render.md`, re-declared locally in three admin components;
freezes into public API at 1.0—rename-vs-grandfather is a brainstorm decision and a
`Consumers must:` event if renamed); the 827 `as never` test casts; a formatter
decision (tabs vs 2-space, currently advisory `.editorconfig`—needs a human pick
before a gate can enforce either).

**CURRENT-STATE VERIFICATION:** open; the full thirteen re-enumerated from
`int-coherence.md` at plan time. **Ledger:** none.

---

## 11. The newcomer `src/lib` internals map

**Source:** `int-walk-newcomer.md` via `ROADMAP.md:306-317`.

**CURRENT-STATE VERIFICATION:** open, unscoped beyond the source doc; re-read at plan
time (the internals and internals-B passes themselves change what the map describes).
**Ledger:** none.

---

## 12. The custom-screen content read-seam boundary decision

**Source:** NONE FOUND. The ROADMAP sentence is the only text; grep of `int-*.md` and
`docs/internal/*.md` for "custom-screen" and "read-seam" returns nothing that defines
it (reproducing the internals docket's own null result on the same search).

**CURRENT-STATE VERIFICATION:** undefined. The plan author must either get the
question defined (likely: whether custom admin routes get a sanctioned engine seam for
READING content, versus sites reaching into GitHub/draft state themselves) or record it
as unfoundable and drop it. Squarely a Geoff question; listed first in the brainstorm
set. **Ledger:** none.

---

## Ratified (Geoff, 2026-09-02, mid-internals; supersedes "Decisions for the brainstorm")

The seven questions below were presented with derived answers; Geoff ratified the pass
split (item 7) explicitly and let the six derived defaults stand unobjected, the same
pattern the internals rulings used. The ruled outcomes:

1. **Read-seam boundary: DROPPED as unfoundable.** No source document, no consumer ask;
   the charter's out-of-scope answer applies. Reopen trigger (detectable): a consumer
   building a custom admin screen asks for an engine seam to read content.
2. **`FieldInput`: FIX.** Warnings are defects under the initiative's posture; the
   benign-comment is a rationalized local workaround. The shape (`$bindable` vs a
   register callback) is a technical call made at plan time against the post-Task-7
   wiring.
3. **`ec-*`: RENAME to an engine-owned prefix.** One `Consumers must:` line in the
   already-batching window; grandfathering only wins when migration is expensive, and a
   class rename is not.
4. **Formatter: least-churn default.** Measure the dominant existing practice, enforce
   that; override only on a stated preference.
5. **Exhaustiveness idiom: plan rules it.** Technical; the never-idiom and
   compile-vs-runtime choice follow from where `FieldDescriptor` values originate,
   verified at authoring; ledger records the rationale.
6. **OfficeList: ruling-first ordering.** No internals-B effort on a component polish
   may retire; either the retire ruling is raised before touching it or the scroll item
   defers to polish and rides the outcome.
7. **THE PASS SPLITS (ratified).** internals-B carries the four monolith splits (items
   1, 6, 7, 8, with items 2-5 riding their stated homes); a new **internals-C:
   coherence** carries the coherence thirteen, the exhaustiveness idiom, and the
   newcomer map. B precedes C so gates and sweeps do not churn under files being split.
   Sequence: internals -> internals-B -> internals-C -> chassis -> polish; still ONE
   release cut after polish. The running internals pass's Task 11 dispatch is amended
   to re-file ROADMAP in this two-slice shape (the plan's ruled text predates the
   split).

The original questions, kept as the record of what was asked:


1. **Read-seam boundary (item 12):** define it or drop it—no source document exists.
2. **`FieldInput` posture (item 2):** ROADMAP says fix (`$bindable()` or callback); the
   code comment says accepted-benign. Which is right? (If fix: which of the two shapes.)
3. **`ec-*` prefix (item 10):** rename to an engine-owned prefix (a `Consumers must:`
   event) or grandfather as a documented exception. How hard is the coherence gate
   before 1.0?
4. **Formatter (item 10):** tabs vs 2-space; the gate enforces whichever is picked.
5. **Exhaustiveness mechanism (item 9):** which never-idiom, and compile-time-only or
   runtime-asserted.
6. **OfficeList ordering (item 4):** the scroll-container fix precedes or collapses
   into polish's ruling-first retire question.
7. **Pass sizing:** the internals docket's own Decision 8 warned this scope reads like
   several slices (four splits + idiom + thirteen + map + boundary). Decide up front
   whether internals-B splits (e.g. monoliths vs coherence as two passes) instead of
   discovering it mid-pass—the workstation pass-sizing rule names exactly this
   failure.

## Sizing signals

**Design questions:** items 2, 9 (mechanism), 10 (`ec-*`, formatter), 12, plus the
sizing call itself. **Gate/tooling:** the idiom-charter gate, the comment-register
purge tooling, the exhaustiveness gate form. **Mechanical fixes:** items 3, 5, the
`as never` cast sweep (large but mechanical). **Structural work:** items 1, 6, 7, 8
(the four splits—each plausibly multi-task). **Already settled elsewhere:** the
`MarkdownEditor` collapse (RULED and landing in internals Task 7; internals-B inherits
it and does not re-litigate).

---

## Routed at the internals close (2026-09-03)

Five items the internals pass's own execution and review fold surfaced, none scoped or
fixed there, all verified against the internals branch's own final tree:

- **`EditorApi`'s revocation contract and the single-holder refactor.** The collapsed
  `registerEditor(api)` grant still backs `EditPage.svelte` with 13 separate holder
  variables (`EditPage.svelte:1370`, "The 13 EditorApi holders below"), each reset by
  hand on the entry-key remount; the svelte reviewer's round-B findings (W1/S2) asked
  for one held-object refactor instead of 13 parallel resets, deferred because it rides
  the same wiring block the `EditPage` split (docket item 1) already touches. Fold into
  that split rather than a standalone task.
- **The `session.expires_at` index asymmetry against the channel schema.** The
  self-owned auth store's `session` table (`migrations/0000_auth.sql`) carries no index
  on `expires_at`, only `idx_session_email`; the auth-channel factory's own schema
  (`migrations-channel/0000_channel.sql`) indexes the equivalent column explicitly
  (`idx_cairn_channel_session_expires`). The cloudflare-workers reviewer's finding (S8)
  is unresolved: either the self-owned store's liveness sweep never needed the index
  (worth stating why) or it is a real gap the two schemas should share.
- **Static `list-role`'s `lastCompound` tokenizer gaps.** `list-role.ts`'s
  `lastCompound()` (`:60`) splits a selector's ancestor chain on combinators the
  internals Task 8 re-grounding did not extend to cover: a newline or tab combinator
  (only space is handled), and an escaped bracket character appearing outside a quoted
  attribute value. Neither is reachable by the nine engine lists the task's fixture
  corpus covers, so it shipped as a known gap rather than a blocking defect.
  Re-scope when a real selector exercises either shape.
- **Structural leak-modeling of `/components` for the F-1 rider.** `check-surface-leaks.mjs`
  (`:233-244`) skips the `/components` subpath entirely on the stated premise that its
  Svelte-component exports are covered by a different model (Task 7's props gate) and
  that modeling `/components` itself for leaked type names would require walking
  component `<script>` blocks the rider's two existing derivations do not reach. The
  skip's premise, that every `/components` leak class is otherwise caught, is asserted,
  not proven; if a leak surfaces through `/components` that neither the props gate nor
  the two-model derivation would catch, the skip's premise needs re-examination before
  extending the rider to cover it.
- **`csrfSecure`'s single-source `PUBLIC_ORIGIN` read versus `isDeployedHost`'s dual
  read.** `src/lib/sveltekit/csrf.ts:66` reads `event.platform?.env?.PUBLIC_ORIGIN`
  only; `src/lib/dev-flag.ts`'s `isDeployedHost` (landed by the internals pass's
  review-fold round A) reads both `platform.env` and `process.env` so the tripwire
  works under adapter-node too. The asymmetry is deliberate for now (`csrfSecure` never
  ran on adapter-node in a production site), but the two functions now answer a
  structurally identical question, "is `PUBLIC_ORIGIN` set to a non-local origin,"
  differently. Reconcile onto one shared read the next time either file is opened.
  **(2026-09-04, internals-C Task 9): reconciled onto one shared `readPublicOrigin`, but
  the consultation-depth divergence persists by design; `isDeployedHost` keeps the dual
  read and `csrfSecure` consumes the shared reader at platform depth only. Retirement
  trigger: `csrfSecure` starts running on adapter-node in a production site.**

## Polish-slice inputs (noted at the internals close, 2026-09-03)

Two small items surfaced during the internals close's review fold that belong to the
polish slice's full-surface sweep, not internals-B:

- **`formatTimestamp`'s accept-set could widen for unambiguous zone-carrying shapes.**
  Task 13 narrowed the function to the SQLite shape or a zone-carrying ISO pattern
  (`Z` or a `±hh:mm` offset), passing everything else through raw. A no-seconds
  variant (`2026-09-03T14:30Z`), a basic-format offset (`+0800` rather than `+08:00`),
  and a lowercase `z` are all unambiguously zone-carrying but do not match today's
  pattern, so they pass through raw rather than rendering. Advisory only: no known
  input produces these shapes today. Widen the accept-set if one does.
- **The command palette (`CairnAdminShell.svelte`) is missing a live region and roving
  focus.** The daisyui-a11y reviewer noted the palette's result list has no
  `aria-live` announcement as results filter and no roving `tabindex`/arrow-key
  navigation between results, both standard combobox-listbox expectations. Not fixed
  in this pass (out of scope for the internals task list); carries to polish's
  full-surface accessibility read.
